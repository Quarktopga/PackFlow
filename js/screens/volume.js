import { state } from "../state.js";
import { renderTabbar, renderTopbar, svg } from "../nav.js";
import { el, boxVolumeM3, furnitureVolumeM3, truckComparison, escapeHtml } from "../utils.js";
import { toast } from "../toast.js";
import * as data from "../data.js";
import { openModal, confirmModal } from "../modal.js";

export function renderVolume(app) {
  app.innerHTML = "";
  const view = el(`<div class="screen screen--with-tabbar"></div>`);
  view.appendChild(renderTopbar("Volume"));

  const summary = el(`<div id="volume-summary"></div>`);
  view.appendChild(summary);

  const furnitureSection = el(`
    <div class="stack" style="margin-top:20px;">
      <div class="row-between"><h2 class="h-display" style="font-size:18px;">Mobilier</h2><button class="btn btn-secondary" id="add-furniture" style="width:auto;padding:8px 14px;">+ Meuble</button></div>
      <ul class="stack-sm" id="furniture-list"></ul>
    </div>
  `);
  view.appendChild(furnitureSection);
  app.appendChild(view);
  app.appendChild(renderTabbar());

  const draw = () => {
    const boxesM3 = state.boxes.reduce((s, b) => s + boxVolumeM3(b), 0);
    const furnitureM3 = state.furniture.reduce((s, f) => s + furnitureVolumeM3(f), 0);
    const total = boxesM3 + furnitureM3;
    const truck = truckComparison(total);
    summary.innerHTML = `
      <div class="card">
        <div class="eyebrow">Volume total estimé</div>
        <div class="volume-gauge"><span class="value">${total.toFixed(1)}</span><span class="unit">m³</span></div>
        <div class="route-track" style="margin:14px 0 6px;"><div class="route-fill" style="width:${truck.pct}%"></div></div>
        <p class="text-low" style="font-size:13px;">≈ ${truck.pct}% d'un ${truck.label}</p>
        <div class="row-between" style="margin-top:14px;font-size:13px;">
          <span class="text-muted">Cartons</span><strong>${boxesM3.toFixed(2)} m³</strong>
        </div>
        <div class="row-between" style="font-size:13px;">
          <span class="text-muted">Mobilier</span><strong>${furnitureM3.toFixed(2)} m³</strong>
        </div>
      </div>
    `;
    const list = furnitureSection.querySelector("#furniture-list");
    list.innerHTML = "";
    if (!state.furniture.length) {
      list.appendChild(el(`<div class="empty-state"><p>Aucun meuble enregistré.</p></div>`));
      return;
    }
    state.furniture.forEach((f) => {
      const row = el(`
        <li class="card row-between">
          <div>
            <div style="font-weight:600;">${escapeHtml(f.name)}</div>
            <div class="text-low" style="font-size:12px;">${f.width}×${f.height}×${f.depth} cm · ${furnitureVolumeM3(f).toFixed(2)} m³${f.room ? " · " + escapeHtml(f.room) : ""}</div>
          </div>
          <button class="btn-icon" aria-label="Supprimer">${svg.trash}</button>
        </li>
      `);
      row.querySelector("button").addEventListener("click", async () => {
        const confirmed = await confirmModal({
          title: "Supprimer ce meuble ?",
          message: `"${f.name}" sera retiré du calcul de volume.`,
          confirmLabel: "Supprimer",
        });
        if (!confirmed) return;
        try {
          await data.removeFurniture(f.id);
          state.furniture = state.furniture.filter((x) => x.id !== f.id);
          draw();
        } catch { toast("Impossible de supprimer", "error"); }
      });
      list.appendChild(row);
    });
  };
  draw();

  furnitureSection.querySelector("#add-furniture").addEventListener("click", () => openFurnitureSheet(draw));
}

function openFurnitureSheet(onAdded) {
  const { modal, close } = openModal(`
    <h2 class="h-display" style="font-size:20px;margin-bottom:14px;">Ajouter un meuble</h2>
    <div class="stack">
      <div class="field"><label for="f-name">Nom</label><input id="f-name" placeholder="ex. Canapé 3 places"></div>
      <div class="field"><label for="f-room">Pièce (optionnel)</label><input id="f-room" placeholder="ex. Salon"></div>
      <div class="row" style="gap:8px;">
        <div class="field" style="flex:1;"><label>Long. (cm)</label><input id="f-w" type="number" min="1"></div>
        <div class="field" style="flex:1;"><label>Larg. (cm)</label><input id="f-h" type="number" min="1"></div>
        <div class="field" style="flex:1;"><label>Haut. (cm)</label><input id="f-d" type="number" min="1"></div>
      </div>
      <button class="btn btn-primary" id="confirm">Ajouter</button>
    </div>
  `);

  modal.querySelector("#confirm").addEventListener("click", async (e) => {
    const name = modal.querySelector("#f-name").value.trim();
    const w = Number(modal.querySelector("#f-w").value);
    const h = Number(modal.querySelector("#f-h").value);
    const d = Number(modal.querySelector("#f-d").value);
    if (!name || !w || !h || !d) return toast("Renseigne le nom et les 3 dimensions", "error");
    e.target.disabled = true;
    try {
      const item = await data.addFurniture({
        move_id: state.move.id, name, room: modal.querySelector("#f-room").value.trim() || null, width: w, height: h, depth: d,
      });
      state.furniture = [...state.furniture, item];
      close();
      onAdded();
      toast("Meuble ajouté", "success");
    } catch { toast("Impossible d'ajouter le meuble", "error"); e.target.disabled = false; }
  });
}
