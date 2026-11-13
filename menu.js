/* menu.js – halaman Menu (profil & reset) */

function render() {
  $("userId").textContent = data.userId;
  $("nameInput").value = data.name === "Guest" ? "" : data.name;
}

$("btnSaveName").addEventListener("click", () => {
  const name = $("nameInput").value.trim();
  if (!name) return toast("Please enter a name");
  data.name = name;
  saveData();
  toast("Name saved");
});

$("btnReset").addEventListener("click", () => {
  if (!confirm("Delete all saved progress on this device?")) return;
  resetData();
  render();
  toast("Data reset");
});

render();
