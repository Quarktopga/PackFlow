import { state, setState } from "../state.js";
import { navigate } from "../router.js";
import { renderTopbar, svg } from "../nav.js";
import { el } from "../utils.js";
import { toast } from "../toast.js";
import { MOVE_TYPES } from "../config.js";
import * as data from "../data.js";
import { requestNotificationPermission, subscribeToPush } from "../pwa.js";
import { VAPID_PUBLIC_KEY } from "../config.js";
import { getThemePreference, setThemePreference } from "../theme.js";

export function renderSettings(app) {
  app.innerHTML = "";
  const view = el(`<div class="screen"></div>`);
  view.appendChild(renderTopbar("Réglages", { back: () => navigate("/") }));

  const move = state.move;
  const currentPref = getThemePreference();
  const body = el(`
    <div class="stack">
      <div class="card stack">
        <div class="eyebrow">Apparence</div>
        <div class="theme-switch" id="theme-switch">
          <button type="button" data-pref="light" aria-pressed="${currentPref === "light"}">${svg.sun} Clair</button>
          <button type="button" data-pref="dark" aria-pressed="${currentPref === "dark"}">${svg.moon} Sombre</button>
          <button type="button" data-pref="system" aria-pressed="${currentPref === "system"}">${svg.device} Système</button>
        </div>
      </div>

      <div class="card stack">
        <div class="eyebrow">Déménagement</div>
        <div class="field"><label for="s-name">Nom</label><input id="s-name" value="${move?.name || ""}"></div>
        <div class="field"><label for="s-date">Date du jour J</label><input id="s-date" type="date" value="${move?.move_date || ""}"></div>
        <div class="field"><label>Type</label>
          <div class="choice-grid" id="type-grid">
            ${MOVE_TYPES.map((t) => `<button type="button" class="choice-card" data-id="${t.id}" aria-pressed="${move?.type === t.id}"><div class="choice-title">${t.title}</div><div class="choice-sub">${t.sub}</div></button>`).join("")}
          </div>
        </div>
        <button class="btn btn-primary" id="save-config">Enregistrer</button>
        <p class="text-low" style="font-size:12px;">Modifier le type ou la date recalera automatiquement les tâches non commencées.</p>
      </div>

      <div class="card stack">
        <div class="eyebrow">Partage</div>
        <p class="text-muted" style="font-size:13px;">Invite quelqu'un à gérer ce déménagement avec toi, ou partage un accès limité aux déménageurs (destination des cartons uniquement).</p>
        <button class="btn btn-secondary" id="gen-invite">Générer un lien d'invitation</button>
        <button class="btn btn-secondary" id="gen-mover">Générer un lien déménageur</button>
      </div>

      <div class="card stack">
        <div class="eyebrow">Notifications</div>
        <button class="btn btn-secondary" id="ask-notif">Activer les rappels de tâches</button>
      </div>

      <button class="btn btn-danger" id="logout">Se déconnecter</button>
    </div>
  `);
  view.appendChild(body);
  app.appendChild(view);

  body.querySelectorAll("#theme-switch button").forEach((btn) => {
    btn.addEventListener("click", () => {
      setThemePreference(btn.dataset.pref);
      body.querySelectorAll("#theme-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    });
  });

  let selectedType = move?.type || null;
  body.querySelectorAll("[data-id]").forEach((card) => card.addEventListener("click", () => {
    selectedType = card.dataset.id;
    body.querySelectorAll("[data-id]").forEach((c) => c.setAttribute("aria-pressed", String(c === card)));
  }));

  body.querySelector("#save-config").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      const patch = {
        name: body.querySelector("#s-name").value.trim(),
        move_date: body.querySelector("#s-date").value || null,
        type: selectedType,
      };
      const updated = await data.updateMoveConfig(move.id, patch);
      setState({ move: updated });
      if (patch.move_date && patch.type) {
        await data.seedTasksFromTemplate(move.id);
        state.tasks = await data.listTasks(move.id);
      }
      toast("Déménagement mis à jour", "success");
    } catch { toast("Impossible d'enregistrer", "error"); }
    e.target.disabled = false;
  });

  body.querySelector("#gen-invite").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      const { url } = await data.createInviteLink();
      await shareOrCopy(url, "Lien d'invitation copié");
    } catch { toast("Impossible de générer le lien", "error"); }
    e.target.disabled = false;
  });

  body.querySelector("#gen-mover").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      const { url } = await data.createMoverLink();
      await shareOrCopy(url, "Lien déménageur copié");
    } catch { toast("Impossible de générer le lien", "error"); }
    e.target.disabled = false;
  });

  body.querySelector("#ask-notif").addEventListener("click", async (e) => {
    e.target.disabled = true;
    const res = await requestNotificationPermission();
    if (res === "granted") {
      try {
        const sub = await subscribeToPush(VAPID_PUBLIC_KEY);
        if (sub) await data.savePushSubscription(move.id, sub);
        toast("Notifications activées", "success");
      } catch { toast("Abonnement aux notifications impossible", "error"); }
    } else if (res === "unsupported") toast("Non supporté sur cet appareil", "error");
    else toast("Notifications refusées", "error");
    e.target.disabled = false;
  });

  body.querySelector("#logout").addEventListener("click", async () => {
    await data.signOut();
    navigate("/", true);
    location.reload();
  });
}

async function shareOrCopy(url, successMsg) {
  if (navigator.share) {
    try { await navigator.share({ title: "PackFlow", url }); return; } catch { /* annulé, fallback copie */ }
  }
  await navigator.clipboard.writeText(url);
  toast(successMsg, "success");
}
