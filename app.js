/* =========================================================
   PaperCycle prototype
   Flow:
   A. User scans the vending machine QR  -> "logs in" to the machine
   B. Machine detects the paper drop     -> updates user data
      and sends the progress back to the app
   No backend: everything lives in localStorage.
   ========================================================= */

const STORAGE_KEY = "papercycle_data_v1";
const SHEETS_PER_LEVEL = 100;
const POINTS_PER_SHEET = 2;
const SHEETS_PER_TREE = 8000;
const QR_PREFIX = "PAPERVEND:";

/* ---------- Storage ---------- */
function defaultData() {
  return {
    userId: "USR-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    name: "Guest",
    totalSheets: 0,
    history: [] // { id, machine, sheets, ts }
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultData();
  } catch {
    return defaultData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();
let session = null;        // { machine } while connected to a machine
let stream = null;         // camera stream
let scanTimer = null;

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}

function formatDate(ts) {
  return new Date(ts).toLocaleString([], {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

/* ---------- Rendering ---------- */
function render() {
  const total = data.totalSheets;
  const level = Math.floor(total / SHEETS_PER_LEVEL) + 1;
  const inLevel = total % SHEETS_PER_LEVEL;

  $("userName").textContent = data.name;
  $("totalSheets").textContent = total;
  $("levelText").textContent = "Level " + level;
  $("toNext").textContent = SHEETS_PER_LEVEL - inLevel;
  $("progressFill").style.width = (inLevel / SHEETS_PER_LEVEL) * 100 + "%";
  $("points").textContent = total * POINTS_PER_SHEET;
  $("dropCount").textContent = data.history.length;
  $("trees").textContent = (total / SHEETS_PER_TREE).toFixed(3);
  $("userId").textContent = data.userId;
  $("nameInput").value = data.name === "Guest" ? "" : data.name;

  const list = $("historyList");
  list.innerHTML = "";
  [...data.history].reverse().forEach((h) => {
    const li = document.createElement("li");
    li.innerHTML =
      `<div><strong>${h.machine}</strong><br><span class="muted">${formatDate(h.ts)}</span></div>` +
      `<span class="sheets">+${h.sheets} sheets</span>`;
    list.appendChild(li);
  });
  $("historyEmpty").hidden = data.history.length > 0;
}

/* ---------- Navigation ---------- */
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  $("view-" + name).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === name)
  );
  if (name !== "scan") stopCamera();
}

document.querySelectorAll(".nav-btn").forEach((b) =>
  b.addEventListener("click", () => showView(b.dataset.view))
);

document.querySelectorAll(".tab").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === b));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    $("tab-" + b.dataset.tab).classList.add("active");
  })
);

/* ---------- Step A: scan QR / login to machine ---------- */
function handleCode(raw) {
  const code = (raw || "").trim();
  if (!code.startsWith(QR_PREFIX) || code.length <= QR_PREFIX.length) {
    toast("Not a valid vending machine QR");
    return false;
  }
  connectToMachine(code.slice(QR_PREFIX.length));
  return true;
}

function connectToMachine(machine) {
  stopCamera();
  session = { machine };
  $("machineId").textContent = machine;
  setStatus("Logged in as " + data.name + " – insert your unused paper");
  $("resultCard").hidden = true;
  $("scanStep").hidden = true;
  $("sessionStep").hidden = false;
  toast("Connected to " + machine);
}

function endSession() {
  session = null;
  $("sessionStep").hidden = true;
  $("scanStep").hidden = false;
}

function setStatus(text, busy = false) {
  const s = $("machineStatus");
  s.textContent = text;
  s.classList.toggle("busy", busy);
}

/* Camera + QR detection (uses BarcodeDetector where supported) */
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    $("cameraMsg").textContent = "Camera not supported – use Simulate scan";
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = $("video");
    video.srcObject = stream;
    await video.play();
    $("btnCamera").textContent = "Stop camera";

    if (!("BarcodeDetector" in window)) {
      $("cameraMsg").textContent = "QR detection not supported here – use Simulate scan";
      return;
    }
    $("cameraMsg").textContent = "Point at the machine's QR code";
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    scanTimer = setInterval(async () => {
      try {
        const codes = await detector.detect(video);
        if (codes.length && handleCode(codes[0].rawValue)) clearInterval(scanTimer);
      } catch { /* ignore frame errors */ }
    }, 400);
  } catch {
    $("cameraMsg").textContent = "Camera permission denied – use Simulate scan";
  }
}

function stopCamera() {
  clearInterval(scanTimer);
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  $("video").srcObject = null;
  $("btnCamera").textContent = "Start camera";
  $("cameraMsg").textContent = "Camera is off";
}

$("btnCamera").addEventListener("click", () => (stream ? stopCamera() : startCamera()));
$("btnSimulate").addEventListener("click", () => handleCode(QR_PREFIX + "VM-001"));
$("manualForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (handleCode($("manualCode").value)) $("manualCode").value = "";
});
$("btnEnd").addEventListener("click", endSession);

/* ---------- Step B: machine detects paper, updates data, sends progress ---------- */
function simulateMachineDrop() {
  if (!session) return;
  $("btnDrop").disabled = true;
  $("resultCard").hidden = true;
  setStatus("Machine is detecting paper…", true);

  setTimeout(() => {
    setStatus("Counting sheets…", true);
  }, 1200);

  setTimeout(() => {
    // The "machine" reports a sheet count
    const sheets = Math.floor(Math.random() * 26) + 5; // 5–30

    // Machine retrieves & updates the user's data
    const prevLevel = Math.floor(data.totalSheets / SHEETS_PER_LEVEL) + 1;
    data.totalSheets += sheets;
    data.history.push({
      id: Date.now(),
      machine: session.machine,
      sheets,
      ts: Date.now()
    });
    saveData();

    // Progress is sent back to the app / user
    const newLevel = Math.floor(data.totalSheets / SHEETS_PER_LEVEL) + 1;
    showResult(sheets, newLevel > prevLevel ? newLevel : null);
    render();

    setStatus("Done – you can drop more paper");
    $("btnDrop").disabled = false;
  }, 2600);
}

function showResult(sheets, newLevel) {
  const card = $("resultCard");
  card.innerHTML =
    `<p class="muted">Progress received from machine</p>` +
    `<h2>+${sheets} sheets</h2>` +
    `<p>+${sheets * POINTS_PER_SHEET} points · total ${data.totalSheets} sheets</p>` +
    (newLevel ? `<p><strong>🎉 Level up! You reached Level ${newLevel}</strong></p>` : "");
  card.hidden = false;
  toast("Progress updated: +" + sheets + " sheets");
}

$("btnDrop").addEventListener("click", simulateMachineDrop);

/* ---------- Menu ---------- */
$("btnSaveName").addEventListener("click", () => {
  const name = $("nameInput").value.trim();
  if (!name) return toast("Please enter a name");
  data.name = name;
  saveData();
  render();
  toast("Name saved");
});

$("btnReset").addEventListener("click", () => {
  if (!confirm("Delete all saved progress on this device?")) return;
  localStorage.removeItem(STORAGE_KEY);
  data = defaultData();
  saveData();
  endSession();
  render();
  toast("Data reset");
});

/* ---------- Init ---------- */
saveData();
render();
