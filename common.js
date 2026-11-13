/* =========================================================
   common.js – dipakai oleh semua halaman
   (storage, konstanta, helper)
   ========================================================= */

const STORAGE_KEY = "papercycle_data_v1";
const SESSION_KEY = "papercycle_session";
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

function resetData() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  data = defaultData();
  saveData();
}

let data = loadData();
saveData();

/* ---------- Session mesin (hilang saat tab ditutup) ---------- */
function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}
function setSession(s) {
  if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(SESSION_KEY);
}

/* ---------- Helper ---------- */
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

function getLevel(total) {
  return Math.floor(total / SHEETS_PER_LEVEL) + 1;
}
