/* home.js – halaman Home (Progress & History) */

function render() {
  const total = data.totalSheets;
  const inLevel = total % SHEETS_PER_LEVEL;

  $("userName").textContent = data.name;
  $("totalSheets").textContent = total;
  $("levelText").textContent = "Level " + getLevel(total);
  $("toNext").textContent = SHEETS_PER_LEVEL - inLevel;
  $("progressFill").style.width = (inLevel / SHEETS_PER_LEVEL) * 100 + "%";
  $("points").textContent = total * POINTS_PER_SHEET;
  $("dropCount").textContent = data.history.length;
  $("trees").textContent = (total / SHEETS_PER_TREE).toFixed(3);

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

/* Tab Progress / History */
document.querySelectorAll(".tab").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === b));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    $("tab-" + b.dataset.tab).classList.add("active");
  })
);

render();
