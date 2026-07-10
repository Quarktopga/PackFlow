import { state } from "../state.js";
import { navigate } from "../router.js";
import { renderTabbar, svg } from "../nav.js";
import { el, relativeDay, boxVolumeM3, furnitureVolumeM3, truckComparison, fmtDate } from "../utils.js";
import { isStandalone, isIos, canInstallDirectly, promptInstall, onInstallAvailability } from "../pwa.js";
import { toast } from "../toast.js";

export function renderDashboard(app) {
  app.innerHTML = "";
  const { move, tasks, boxes, furniture } = state;

  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const nextTask = tasks.find((t) => !t.done && !t.snoozed);
  const totalM3 = boxes.reduce((s, b) => s + boxVolumeM3(b), 0) + furniture.reduce((s, f) => s + furnitureVolumeM3(f), 0);
  const truck = truckComparison(totalM3);

  const view = el(`
    <div class="screen screen--with-tabbar">
      <div class="row-between" style="margin-bottom:20px;">
        <div>
          <div class="eyebrow">Déménagement</div>
          <h1 class="h-display" style="font-size:24px;">${move?.name || "—"}</h1>
        </div>
        <button class="btn-icon" id="go-settings" aria-label="Réglages">⚙️</button>
      </div>

      ${!isStandalone() ? `<div id="install-slot"></div>` : ""}

      <div class="card stack" style="margin-bottom:16px;">
        <div class="row-between">
          <span class="eyebrow">Jour J</span>
          <span class="mono text-muted">${move?.move_date ? fmtDate(move.move_date) : "Non défini"}</span>
        </div>
        <div class="row-between">
          <span class="h-display" style="font-size:32px;">${move?.move_date ? relativeDay(move.move_date) : "Configure ta date"}</span>
        </div>
        <div class="route-track"><div class="route-fill" style="width:${pct}%"></div></div>
        <div class="row-between text-low" style="font-size:12px;">
          <span>${doneCount}/${tasks.length} tâches faites</span>
          <span>${pct}%</span>
        </div>
      </div>

      <div class="row" style="gap:12px; margin-bottom:16px;">
        <div class="card card-tap" id="go-volume" style="flex:1; cursor:pointer;">
          <div class="eyebrow">Volume estimé</div>
          <div class="volume-gauge"><span class="value">${totalM3.toFixed(1)}</span><span class="unit">m³</span></div>
          <p class="text-low" style="font-size:12px;">≈ ${truck.pct}% d'un ${truck.label}</p>
        </div>
        <div class="card card-tap" id="go-cartons" style="flex:1; cursor:pointer;">
          <div class="eyebrow">Cartons</div>
          <div class="volume-gauge"><span class="value">${boxes.length}</span></div>
          <p class="text-low" style="font-size:12px;">emballés à ce jour</p>
        </div>
      </div>

      ${nextTask ? `
        <div class="card card-tap" id="go-next-task" style="cursor:pointer;">
          <div class="eyebrow">Prochaine tâche</div>
          <h3 class="h-display" style="font-size:19px;margin:4px 0 2px;">${nextTask.label}</h3>
          <p class="text-low" style="font-size:13px;">${relativeDay(nextTask.due_date)}</p>
        </div>
      ` : `<div class="card"><p class="text-muted">Toutes les tâches sont à jour ✅</p></div>`}

      <div class="row" style="gap:12px; margin-top:16px;">
        <button class="btn btn-secondary" id="go-scan">${svg.scan} Scanner</button>
        <button class="btn btn-secondary" id="go-add-box">${svg.plus} Carton</button>
      </div>
    </div>
  `);
  app.appendChild(view);
  app.appendChild(renderTabbar());

  view.querySelector("#go-settings").addEventListener("click", () => navigate("/reglages"));
  view.querySelector("#go-volume").addEventListener("click", () => navigate("/volume"));
  view.querySelector("#go-cartons").addEventListener("click", () => navigate("/cartons"));
  view.querySelector("#go-scan").addEventListener("click", () => navigate("/scanner"));
  view.querySelector("#go-add-box").addEventListener("click", () => navigate("/cartons/nouveau"));
  view.querySelector("#go-next-task")?.addEventListener("click", () => navigate("/todo"));

  const slot = view.querySelector("#install-slot");
  if (slot) mountInstallCard(slot);
}

function mountInstallCard(slot) {
  const render = (available) => {
    if (isIos()) {
      slot.innerHTML = `
        <div class="pwa-install-card" style="margin-bottom:16px;">
          <span class="icon-badge">➕</span>
          <div>
            <strong>Installe PackFlow</strong>
            <p>Safari → icône de partage → « Sur l'écran d'accueil ».</p>
          </div>
        </div>`;
      return;
    }
    if (!available) { slot.innerHTML = ""; return; }
    slot.innerHTML = `
      <div class="pwa-install-card" style="margin-bottom:16px;">
        <span class="icon-badge">📲</span>
        <div style="flex:1;">
          <strong>Installe PackFlow sur ton téléphone</strong>
          <p>Accès rapide et notifications, comme une app native.</p>
        </div>
        <button class="btn btn-primary" id="install-btn" style="width:auto;padding:10px 14px;">Installer</button>
      </div>`;
    slot.querySelector("#install-btn").addEventListener("click", async () => {
      const outcome = await promptInstall();
      if (outcome === "accepted") toast("PackFlow installé 🎉", "success");
    });
  };
  render(canInstallDirectly());
  onInstallAvailability(render);
}
