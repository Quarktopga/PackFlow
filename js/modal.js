import { el } from "./utils.js";
import { svg } from "./nav.js";

// Modale centrée, superposée à l'écran (pas de bottom-sheet), toujours dans
// le style du site puisqu'elle réutilise les mêmes variables de thème.
export function openModal(bodyHtml, { onClose } = {}) {
  const backdrop = el(`<div class="modal-backdrop"></div>`);
  const modal = el(`
    <div class="modal" role="dialog" aria-modal="true">
      <button class="modal-close" aria-label="Fermer" type="button">${svg.close}</button>
      <div class="modal-body">${bodyHtml}</div>
    </div>
  `);
  document.body.append(backdrop, modal);
  document.body.style.overflow = "hidden";

  const close = () => {
    backdrop.remove();
    modal.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    onClose?.();
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  backdrop.addEventListener("click", close);
  modal.querySelector(".modal-close").addEventListener("click", close);

  return { modal, close };
}

// Confirmation destructrice standardisée (ex. suppression d'un carton).
export function confirmModal({ title, message, confirmLabel = "Confirmer", danger = true }) {
  return new Promise((resolve) => {
    let settled = false;
    const { close } = openModal(`
      <h2 class="h-display" style="font-size:20px;margin-bottom:8px;">${title}</h2>
      <p class="text-muted" style="margin-bottom:20px;">${message}</p>
      <div class="stack">
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="confirm-yes">${confirmLabel}</button>
        <button class="btn btn-ghost" id="confirm-no">Annuler</button>
      </div>
    `, { onClose: () => { if (!settled) { settled = true; resolve(false); } } });

    document.querySelector("#confirm-yes").addEventListener("click", () => { settled = true; resolve(true); close(); });
    document.querySelector("#confirm-no").addEventListener("click", () => { settled = true; resolve(false); close(); });
  });
}
