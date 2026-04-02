// ----- Defaults & Storage -----
const STORAGE_KEY = "eatSpinnerFoods_v1";
const DEFAULT_FOODS = [
  "🍕 Pizza","🍔 Burger","🍣 Sushi","🥗 Salad","🌮 Tacos",
  "🍜 Ramen","🍟 Fries","🌯 Burrito","🍝 Pasta","🥪 Sandwich"
];

const $ = (s) => document.querySelector(s);

// ----- DOM Elements -----
const canvas = $("#wheel");
const ctx = canvas.getContext("2d");
const spinBtn = $("#spinBtn");
const listEl = $("#foodList");
const addForm = $("#addForm");
const inputEl = $("#foodInput");
const resetBtn = $("#resetBtn");
const optionsGrid = $("#optionsGrid");
const resultModal = document.getElementById("resultModal");
const modalResult = document.getElementById("modalResult");
const closeModalBtn = document.getElementById("closeModalBtn");

// ----- State -----
let foods = loadFoods();
let currentRotation = 0; // degrees
let spinning = false;

// ----- Storage helpers -----
function loadFoods() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? arr : [...DEFAULT_FOODS];
  } catch { return [...DEFAULT_FOODS]; }
}

function saveFoods(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// ----- Drawing -----
function drawWheel() {
  const size = canvas.width; // 420
  const r = size / 2;
  ctx.clearRect(0, 0, size, size);

  const n = foods.length || 1;
  const seg = (Math.PI * 2) / n;

  // Background circle
  ctx.save();
  ctx.translate(r, r);

  for (let i = 0; i < n; i++) {
    const start = i * seg;
    const end = start + seg;

    // Color palette via HSL
    const hue = Math.round((360 / n) * i);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r - 6, start, end);
    ctx.closePath();
    ctx.fillStyle = `hsl(${hue} 80% 60%)`;
    ctx.fill();

    // Separator line
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 6, start, start);
    ctx.stroke();

    // Label (rotated)
    ctx.save();
    ctx.rotate(start + seg / 2);
    ctx.textAlign = "center";
    ctx.fillStyle = "#111";
    ctx.font = "16px -apple-system, system-ui, sans-serif";
    ctx.translate((r - 70), 0); // move toward rim
    const label = foods[i];
    // trim long labels
    const text = label.length > 18 ? label.slice(0, 16) + "…" : label;
    ctx.rotate(Math.PI / 2); // keep text roughly upright relative to radius
    ctx.fillText(text, 0, 6);
    ctx.restore();
  }

  // Center hub
  ctx.beginPath();
  ctx.fillStyle = "#fff";
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderOptions() {
  optionsGrid.innerHTML = "";
  if (!foods.length) {
    const empty = document.createElement("div");
    empty.className = "chip";
    empty.textContent = "No options yet";
    optionsGrid.appendChild(empty);
    return;
  }
  foods.forEach(label => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = label;
    optionsGrid.appendChild(chip);
  });
}

function renderList() {
  listEl.innerHTML = "";
  if (!foods.length) {
    const li = document.createElement("li");
    li.textContent = "No foods yet. Add one above!";
    listEl.appendChild(li);
    return;
  }
  foods.forEach((label, idx) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.className = "itemText";
    span.textContent = label;

    const del = document.createElement("button");
    del.type = "button";
    del.setAttribute("aria-label", `Remove ${label}`);
    del.textContent = "Remove";
    del.addEventListener("click", () => {
      if (spinning) return;
      foods.splice(idx, 1);
      saveFoods(foods);
      drawWheel();
      renderList();
      renderOptions();
    });

    li.appendChild(span);
    li.appendChild(del);
    listEl.appendChild(li);
  });
}
function openModal(result) {
  modalResult.textContent = result;
  resultModal.classList.remove("hidden");
}

function closeModal() {
  resultModal.classList.add("hidden");
}
closeModalBtn.addEventListener("click", closeModal);
resultModal.addEventListener("click", (e) => {
  if (e.target === resultModal) {
    closeModal();
  }
});
// ----- Spin logic -----
// We choose a target index and compute a rotation so that the
// center of that slice lands at the pointer (top).
function spin() {
  if (spinning || !foods.length) return;

  spinning = true;
  spinBtn.disabled = true;

  const n = foods.length;
  const seg = 360 / n;
  const targetIndex = Math.floor(Math.random() * n);
  const targetCenter = targetIndex * seg + seg / 2;

  const MIN_SPINS = 6; // minimum full spins
  const EXTRA_SPINS = Math.floor(Math.random() * 3); // randomness
  const totalSpins = MIN_SPINS + EXTRA_SPINS;
  // Pointer is at 90° (top). We want slice center at 90°.
  // rotation we need = 90 - targetCenter
  const POINTER_DEG = -90;                 // top
let delta = POINTER_DEG - targetCenter;  // align slice center to the top

delta = ((delta % 360) + 360) % 360;
  // Final absolute rotation (add full spins)
  const finalRotation = currentRotation + totalSpins * 360 + delta;

  // Apply CSS rotation (smooth via transition set in CSS)
  canvas.style.transform = `rotate(${finalRotation}deg)`;

  // When the transition ends, set result and normalize rotation
  const onEnd = () => {
    canvas.removeEventListener("transitionend", onEnd);
    // normalize to keep numbers small
    currentRotation = ((finalRotation % 360) + 360) % 360;

    spinning = false;
    spinBtn.disabled = false;
    openModal(foods[targetIndex]);
  };
  canvas.addEventListener("transitionend", onEnd, { once: true });
}

// Keyboard shortcut
document.addEventListener("keydown", (e) => { if (e.key === "Enter") spin(); });

// Events
spinBtn.addEventListener("click", spin);

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (spinning) return;
  const raw = inputEl.value.trim();
  if (!raw) return;
  const label = raw.replace(/\s+/g, " ");
  const exists = foods.some(f => f.toLowerCase() === label.toLowerCase());
  if (!exists) {
    foods.push(label);
    saveFoods(foods);
    drawWheel();
    renderList();
    renderOptions();
  }
  inputEl.value = "";
  inputEl.focus();
});

resetBtn.addEventListener("click", () => {
  if (spinning) return;
  if (confirm("Restore default foods? This will replace your current list.")) {
    foods = [...DEFAULT_FOODS];
    saveFoods(foods);
    currentRotation = 0;
    canvas.style.transform = `rotate(${currentRotation}deg)`;
    drawWheel();
    renderList();
    renderOptions();
  }
});

// ----- Init -----
drawWheel();
renderList();
renderOptions();
