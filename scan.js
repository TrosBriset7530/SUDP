/* =========================================================
   scan.js – halaman Scan
   A. Scan QR mesin  -> "login" ke mesin
   B. Mesin mendeteksi kertas -> update data -> kirim progress ke app
   ========================================================= */

let session = getSession(); // { machine } atau null
let stream = null;
let scanTimer = null;

/* ---------- Tampilan ---------- */
function setStatus(text, busy = false) {
  const s = $("machineStatus");
  s.textContent = text;
  s.classList.toggle("busy", busy);
}

function renderStep() {
  $("scanStep").hidden = !!session;
  $("sessionStep").hidden = !session;
  if (session) {
    $("machineId").textContent = session.machine;
    setStatus("Logged in as " + data.name + " – insert your unused paper");
  }
}

/* ---------- Step A: scan QR / login ---------- */
function handleCode(raw) {
  const code = (raw || "").trim();
  if (!code.startsWith(QR_PREFIX) || code.length <= QR_PREFIX.length) {
    toast("Not a valid vending machine QR");
    return false;
  }
  stopCamera();
  session = { machine: code.slice(QR_PREFIX.length) };
  setSession(session);
  $("resultCard").hidden = true;
  renderStep();
  toast("Connected to " + session.machine);
  return true;
}

function endSession() {
  session = null;
  setSession(null);
  renderStep();
}

/* Kamera + deteksi QR (butuh BarcodeDetector) */
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
      } catch { /* abaikan error frame */ }
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

/* ---------- Step B: mesin mendeteksi kertas ---------- */
function simulateMachineDrop() {
  if (!session) return;
  $("btnDrop").disabled = true;
  $("resultCard").hidden = true;
  setStatus("Machine is detecting paper…", true);

  setTimeout(() => setStatus("Counting sheets…", true), 1200);

  setTimeout(() => {
    const sheets = Math.floor(Math.random() * 26) + 5; // 5–30

    const prevLevel = getLevel(data.totalSheets);
    data.totalSheets += sheets;
    data.history.push({ id: Date.now(), machine: session.machine, sheets, ts: Date.now() });
    saveData();

    const newLevel = getLevel(data.totalSheets);
    showResult(sheets, newLevel > prevLevel ? newLevel : null);

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

/* ---------- Event ---------- */
$("btnCamera").addEventListener("click", () => (stream ? stopCamera() : startCamera()));
$("btnSimulate").addEventListener("click", () => handleCode(QR_PREFIX + "VM-001"));
$("manualForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (handleCode($("manualCode").value)) $("manualCode").value = "";
});
$("btnDrop").addEventListener("click", simulateMachineDrop);
$("btnEnd").addEventListener("click", endSession);

renderStep();
