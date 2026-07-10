import { state } from "../state.js";
import { navigate } from "../router.js";
import { renderTabbar, renderTopbar, svg } from "../nav.js";
import { el, boxVolumeM3, escapeHtml, debounce } from "../utils.js";
import { toast } from "../toast.js";
import { STANDARD_BOX_SIZES, ITEM_TYPES } from "../config.js";
import * as data from "../data.js";
import { boxQrDataUrl, downloadDataUrl, printBoxLabel } from "../qrgen.js";
import { openModal, confirmModal } from "../modal.js";

// ---------------------------------------------------------------------------
// Liste des cartons
// ---------------------------------------------------------------------------
export function renderBoxList(app) {
  app.innerHTML = "";
  const view = el(`<div class="screen screen--with-tabbar"></div>`);
  view.appendChild(renderTopbar("Cartons"));

  const search = el(`<div class="field" style="margin-bottom:16px;"><input placeholder="Rechercher un carton, une destination…" id="search"></div>`);
  view.appendChild(search);

  const list = el(`<div class="stack" id="box-list"></div>`);
  view.appendChild(list);

  app.appendChild(view);
  app.appendChild(renderTabbar());

  const fab = el(`<button class="btn-fab" aria-label="Ajouter un carton">${svg.plus}</button>`);
  fab.addEventListener("click", () => navigate("/cartons/nouveau"));
  app.appendChild(fab);

  const draw = (filter = "") => {
    const f = filter.toLowerCase();
    const boxes = state.boxes.filter((b) =>
      !f || b.id.toLowerCase().includes(f) || (b.destination || "").toLowerCase().includes(f));
    list.innerHTML = "";
    if (!boxes.length) {
      list.appendChild(el(`
        <div class="empty-state">
          <div class="h-display">Aucun carton</div>
          <p>Appuie sur + pour créer ton premier carton.</p>
        </div>`));
      return;
    }
    boxes.forEach((b) => list.appendChild(boxCard(b)));
  };
  draw();
  search.querySelector("input").addEventListener("input", debounce((e) => draw(e.target.value), 200));
}

function boxCard(b) {
  const itemCount = b.items?.[0]?.count ?? b.items?.length ?? 0;
  const card = el(`
    <div class="card card-tap" style="cursor:pointer;">
      <div class="row-between">
        <span class="tag-chip tag-chip--lg">${b.id}</span>
        <span class="category-pill">${itemCount} objet${itemCount > 1 ? "s" : ""}</span>
      </div>
      <div class="row-between" style="margin-top:10px;">
        <div>
          <div style="font-weight:700;">${escapeHtml(b.destination || "Destination non définie")}</div>
          <div class="text-low" style="font-size:12px;">${b.width && b.height && b.depth ? `${b.width}×${b.height}×${b.depth} cm · ${boxVolumeM3(b).toFixed(2)} m³` : "Dimensions non définies"}</div>
        </div>
      </div>
    </div>
  `);
  card.addEventListener("click", () => navigate(`/cartons/${b.id}`));
  return card;
}

// ---------------------------------------------------------------------------
// Détail d'un carton (contenu)
// ---------------------------------------------------------------------------
export async function renderBoxDetail(app, { id }) {
  app.innerHTML = "";
  let box = state.boxes.find((b) => b.id === id);
  if (!box || !box.items || box.items[0]?.count !== undefined) {
    try { box = await data.getBoxById(state.move.id, id); } catch { /* noop */ }
  }
  if (!box) {
    app.appendChild(el(`<div class="screen"><div class="empty-state"><div class="h-display">Carton introuvable</div></div></div>`));
    app.appendChild(renderTabbar());
    return;
  }

  const view = el(`<div class="screen screen--with-tabbar"></div>`);
  view.appendChild(renderTopbar(`Carton ${box.id}`, { back: () => navigate("/cartons") }));

  const header = el(`
    <div class="card stack-sm" style="margin-bottom:20px;">
      <div class="row-between">
        <button class="tag-chip tag-chip--lg" id="copy-id" title="Copier l'identifiant" style="border:none;cursor:pointer;">${box.id} ${svg.copy}</button>
        <button class="btn btn-secondary" id="show-qr" style="width:auto;padding:8px 14px;">${svg.qr} QR code</button>
      </div>
      <p class="text-low" style="font-size:12px;">Écris cet identifiant au marqueur sur le carton, ou colle son QR code (à imprimer).</p>
      <div class="field"><label>Destination</label>
        <input id="destination" value="${escapeHtml(box.destination || "")}" placeholder="ex. Chambre 1, Cuisine…"></div>
      <div class="row" style="gap:8px;">
        <div class="field" style="flex:1;"><label>Long. (cm)</label><input id="w" type="number" min="1" value="${box.width || ""}"></div>
        <div class="field" style="flex:1;"><label>Larg. (cm)</label><input id="h" type="number" min="1" value="${box.height || ""}"></div>
        <div class="field" style="flex:1;"><label>Haut. (cm)</label><input id="d" type="number" min="1" value="${box.depth || ""}"></div>
      </div>
      <div class="row" style="flex-wrap:wrap; gap:6px;">
        ${STANDARD_BOX_SIZES.map((s) => `<button type="button" class="btn btn-ghost" data-preset='${JSON.stringify(s)}' style="width:auto;padding:6px 10px;border:1px solid var(--ink-line);font-size:12px;">${s.label}</button>`).join("")}
      </div>
      <button class="btn btn-primary" id="save-box">Enregistrer</button>
      <button class="btn btn-danger" id="delete-box">${svg.trash} Supprimer ce carton</button>
    </div>
  `);
  view.appendChild(header);

  const itemsSection = el(`
    <div class="stack">
      <div class="row-between"><h2 class="h-display" style="font-size:18px;">Contenu</h2><button class="btn btn-secondary" id="add-item" style="width:auto;padding:8px 14px;">+ Objet</button></div>
      <ul class="stack-sm" id="item-list"></ul>
    </div>
  `);
  view.appendChild(itemsSection);
  app.appendChild(view);
  app.appendChild(renderTabbar());

  drawItems(itemsSection.querySelector("#item-list"), box);

  header.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = JSON.parse(btn.dataset.preset);
      header.querySelector("#w").value = preset.w;
      header.querySelector("#h").value = preset.h;
      header.querySelector("#d").value = preset.d;
    });
  });

  header.querySelector("#save-box").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      const patch = {
        destination: header.querySelector("#destination").value.trim(),
        width: Number(header.querySelector("#w").value) || null,
        height: Number(header.querySelector("#h").value) || null,
        depth: Number(header.querySelector("#d").value) || null,
      };
      const updated = await data.updateBox(box.id, patch);
      Object.assign(box, updated);
      state.boxes = state.boxes.map((b) => (b.id === box.id ? { ...b, ...updated } : b));
      toast("Carton mis à jour", "success");
    } catch { toast("Impossible d'enregistrer", "error"); }
    e.target.disabled = false;
  });

  header.querySelector("#copy-id").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(box.id);
      toast("Identifiant copié", "success");
    } catch { toast("Impossible de copier", "error"); }
  });

  header.querySelector("#show-qr").addEventListener("click", () => openQrSheet(box.id));

  header.querySelector("#delete-box").addEventListener("click", async () => {
    const confirmed = await confirmModal({
      title: "Supprimer ce carton ?",
      message: `Le carton ${box.id} et tout son contenu (${(box.items || []).filter((i) => i.name).length} objet(s)) seront définitivement supprimés. Cette action est irréversible.`,
      confirmLabel: "Supprimer définitivement",
    });
    if (!confirmed) return;
    try {
      await data.deleteBox(box.id);
      state.boxes = state.boxes.filter((b) => b.id !== box.id);
      toast("Carton supprimé", "success");
      navigate("/cartons");
    } catch { toast("Impossible de supprimer le carton", "error"); }
  });

  itemsSection.querySelector("#add-item").addEventListener("click", () => openAddItemSheet(box, (item) => {
    box.items = [...(box.items || []), item];
    drawItems(itemsSection.querySelector("#item-list"), box);
  }));
}

function drawItems(listEl, box) {
  const items = Array.isArray(box.items) ? box.items.filter((i) => i.name) : [];
  listEl.innerHTML = "";
  if (!items.length) {
    listEl.appendChild(el(`<div class="empty-state"><p>Aucun objet listé pour l'instant.</p></div>`));
    return;
  }
  items.forEach((item) => {
    const row = el(`
      <li class="card row-between">
        <div class="row">
          <span style="font-size:22px;">${item.emoji || "📦"}</span>
          <div>
            <div style="font-weight:600;">${escapeHtml(item.name)}</div>
            ${item.description ? `<div class="text-low" style="font-size:12px;">${escapeHtml(item.description)}</div>` : ""}
          </div>
        </div>
        <button class="btn-icon" aria-label="Supprimer">${svg.trash}</button>
      </li>
    `);
    row.querySelector("button").addEventListener("click", async () => {
      try {
        await data.removeItem(item.id);
        box.items = box.items.filter((i) => i.id !== item.id);
        drawItems(listEl, box);
        toast("Objet supprimé");
      } catch { toast("Erreur lors de la suppression", "error"); }
    });
    listEl.appendChild(row);
  });
}

function openAddItemSheet(box, onAdded) {
  const { modal, close } = openModal(`
    <h2 class="h-display" style="font-size:20px;margin-bottom:14px;">Ajouter un objet</h2>
    <div class="stack">
      <div class="field"><label>Type</label>
        <div class="row" style="flex-wrap:wrap;gap:6px;" id="emoji-picker">
          ${ITEM_TYPES.map((t, i) => `<button type="button" class="btn btn-ghost" data-emoji="${t.emoji}" aria-pressed="${i === 0}" style="width:auto;padding:8px;font-size:20px;border:1px solid var(--ink-line);">${t.emoji}</button>`).join("")}
        </div>
      </div>
      <div class="field"><label for="item-name">Nom</label><input id="item-name" placeholder="ex. Assiettes blanches" required></div>
      <div class="field"><label for="item-desc">Description (optionnel)</label><textarea id="item-desc" rows="2" placeholder="Détails utiles…"></textarea></div>
      <button class="btn btn-primary" id="confirm-add">Ajouter</button>
    </div>
  `);
  let selectedEmoji = ITEM_TYPES[0].emoji;
  modal.querySelectorAll("[data-emoji]").forEach((btn) => btn.addEventListener("click", () => {
    selectedEmoji = btn.dataset.emoji;
    modal.querySelectorAll("[data-emoji]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
  }));
  modal.querySelector("#confirm-add").addEventListener("click", async (e) => {
    const name = modal.querySelector("#item-name").value.trim();
    if (!name) return toast("Indique un nom d'objet", "error");
    e.target.disabled = true;
    try {
      const item = await data.addItem(box.id, {
        emoji: selectedEmoji, name, description: modal.querySelector("#item-desc").value.trim() || null,
      });
      onAdded(item);
      close();
    } catch { toast("Impossible d'ajouter l'objet", "error"); e.target.disabled = false; }
  });
}

async function openQrSheet(boxId) {
  const { modal } = openModal(`
    <h2 class="h-display" style="font-size:20px;margin-bottom:6px;">QR code du carton</h2>
    <p class="text-muted" style="margin-bottom:14px;">Imprime-le et colle-le sur le carton — un scan avec n'importe quel appareil photo rouvre directement cette fiche.</p>
    <div class="card" style="text-align:center;" id="qr-host">
      <div class="spinner" style="margin:0 auto;"></div>
    </div>
    <div class="row" style="gap:12px;margin-top:16px;">
      <button class="btn btn-secondary" id="dl-qr">Télécharger</button>
      <button class="btn btn-primary" id="print-qr">Imprimer</button>
    </div>
  `);
  let dataUrl;
  try {
    dataUrl = await boxQrDataUrl(boxId);
    modal.querySelector("#qr-host").innerHTML = `
      <img src="${dataUrl}" alt="QR code du carton ${boxId}" style="width:200px;height:200px;border-radius:var(--r-md);background:#f6f4ef;">
      <div class="tag-chip" style="margin-top:14px;">${boxId}</div>
    `;
  } catch {
    modal.querySelector("#qr-host").innerHTML = `<p class="text-muted">Impossible de générer le QR code.</p>`;
    return;
  }
  modal.querySelector("#dl-qr").addEventListener("click", () => downloadDataUrl(dataUrl, `packflow-carton-${boxId}.png`));
  modal.querySelector("#print-qr").addEventListener("click", () => printBoxLabel(boxId, dataUrl));
}

// ---------------------------------------------------------------------------
// Flow d'ajout d'un carton (ID généré côté serveur → QR généré par la
// plateforme, prêt à imprimer → puis dimensions/destination/contenu)
// ---------------------------------------------------------------------------
export async function renderAddBox(app) {
  app.innerHTML = "";
  const view = el(`<div class="screen"></div>`);
  view.appendChild(renderTopbar("Nouveau carton", { back: () => navigate("/cartons") }));
  const body = el(`<div class="stack"><div class="card" style="text-align:center;"><div class="spinner" style="margin:0 auto;"></div><p class="text-muted" style="margin-top:12px;">Génération de l'identifiant…</p></div></div>`);
  view.appendChild(body);
  app.appendChild(view);

  let boxId;
  try {
    boxId = await data.generateBoxId(state.move.id);
  } catch {
    body.innerHTML = `<div class="empty-state"><p>Impossible de générer un identifiant. Réessaie.</p></div>`;
    return;
  }

  let box;
  try {
    box = await data.createBox({ id: boxId, move_id: state.move.id, created_by: state.session.user.id });
    state.boxes = [{ ...box, items: [] }, ...state.boxes];
  } catch {
    body.innerHTML = `<div class="empty-state"><p>Impossible de créer le carton. Réessaie.</p></div>`;
    return;
  }

  body.innerHTML = `
    <div class="card" style="text-align:center;">
      <div class="eyebrow">Carton créé</div>
      <button class="tag-chip tag-chip--lg" id="copy-id" style="font-size:32px;margin:14px 0;border:none;cursor:pointer;">${boxId} ${svg.copy}</button>
      <p class="text-muted">Écris cet identifiant au marqueur sur le carton, ou colle son QR code ci-dessous — généré et prêt à imprimer.</p>
      <div id="qr-host" style="margin-top:16px;"><div class="spinner" style="margin:0 auto;"></div></div>
      <div class="row" style="gap:12px;margin-top:16px;">
        <button class="btn btn-secondary" id="dl-qr">Télécharger</button>
        <button class="btn btn-secondary" id="print-qr">Imprimer</button>
      </div>
    </div>
    <button class="btn btn-primary" id="continue" style="margin-top:16px;">Continuer</button>
  `;

  body.querySelector("#copy-id").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(boxId); toast("Identifiant copié", "success"); }
    catch { toast("Impossible de copier", "error"); }
  });

  let dataUrl;
  try {
    dataUrl = await boxQrDataUrl(boxId);
    body.querySelector("#qr-host").innerHTML = `<img src="${dataUrl}" alt="QR code du carton ${boxId}" style="width:180px;height:180px;border-radius:var(--r-md);background:#f6f4ef;">`;
  } catch {
    body.querySelector("#qr-host").innerHTML = `<p class="text-low">QR indisponible — l'identifiant reste utilisable.</p>`;
  }
  body.querySelector("#dl-qr").addEventListener("click", () => {
    if (dataUrl) downloadDataUrl(dataUrl, `packflow-carton-${boxId}.png`);
  });
  body.querySelector("#print-qr").addEventListener("click", () => {
    if (dataUrl) printBoxLabel(boxId, dataUrl);
  });

  body.querySelector("#continue").addEventListener("click", () => navigate(`/cartons/${boxId}`));
}
