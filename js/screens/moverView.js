import { state } from "../state.js";
import { el, parseBoxCode } from "../utils.js";
import { toast } from "../toast.js";
import * as data from "../data.js";
import { QrScanner } from "../qr.js";
import { svg } from "../nav.js";

// Vue isolée pour le lien "déménageur" : pas de session, pas de tabbar,
// uniquement scanner/saisie manuelle → destination du carton. Le token
// scope l'accès côté Edge Function ; aucune autre donnée n'est exposée.
export function renderMoverView(app) {
  app.innerHTML = "";
  const view = el(`
    <div class="screen">
      <div class="brand-mark" style="margin-bottom:8px;">
        <img src="./icons/icon-96.png" alt="">
        <span>PackFlow</span>
      </div>
      <div class="eyebrow" style="margin-bottom:20px;">Accès déménageur · lecture seule</div>
      <div class="scan-frame" id="scan-frame">
        <div class="scan-placeholder">
          <button class="btn btn-primary" id="start-scan" style="width:auto;padding:14px 22px;">${svg.scan} Activer le scanner</button>
        </div>
      </div>
      <p class="text-low" id="status" style="text-align:center;margin:14px 0;"></p>
      <div class="landing-divider">ou</div>
      <div class="field">
        <label for="manual-code">Identifiant à 4 caractères</label>
        <div class="row"><input id="manual-code" maxlength="4" class="mono" style="text-transform:uppercase;"><button class="btn btn-primary" id="go" style="width:auto;">OK</button></div>
      </div>
      <div id="result" style="margin-top:20px;"></div>
    </div>
  `);
  app.appendChild(view);

  const resultEl = view.querySelector("#result");
  const showResult = (result) => {
    resultEl.innerHTML = result ? `
      <div class="card" style="text-align:center;">
        <span class="tag-chip tag-chip--lg">${result.box_id}</span>
        <p class="text-muted" style="margin-top:12px;">Destination</p>
        <div class="h-display" style="font-size:24px;">${result.destination || "Non renseignée"}</div>
      </div>
    ` : `<div class="empty-state"><p>Carton introuvable.</p></div>`;
  };

  let scanner = null;
  let busy = false;
  const lookup = async (raw) => {
    const code = parseBoxCode(raw);
    if (busy || !code) { scanner?.resume(); return; }
    busy = true;
    try {
      const result = await data.moverLookup(state.moverToken, code);
      showResult(result);
    } catch {
      toast("Carton introuvable ou lien expiré", "error");
    }
    busy = false;
    scanner?.resume(); // permet de scanner le carton suivant sans réactiver la caméra
  };

  const frame = view.querySelector("#scan-frame");
  const startScanning = () => {
    frame.innerHTML = `<video autoplay muted playsinline></video><div class="scan-reticle"></div>`;
    const video = frame.querySelector("video");
    scanner = new QrScanner(video, {
      onResult: (value) => lookup(value),
      onError: () => {
        view.querySelector("#status").textContent = "Caméra indisponible — utilise la saisie manuelle.";
        frame.innerHTML = `<div class="scan-placeholder"><button class="btn btn-secondary" id="start-scan" style="width:auto;padding:14px 22px;">Réessayer</button></div>`;
        frame.querySelector("#start-scan").addEventListener("click", startScanning);
      },
    });
    scanner.start();
  };
  view.querySelector("#start-scan").addEventListener("click", startScanning);

  view.querySelector("#go").addEventListener("click", () => {
    const val = view.querySelector("#manual-code").value.trim();
    if (val.length !== 4) return toast("L'identifiant fait 4 caractères", "error");
    lookup(val);
  });

  window.addEventListener("hashchange", () => scanner?.stop(), { once: true });
}
