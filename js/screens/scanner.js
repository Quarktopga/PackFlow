import { state } from "../state.js";
import { navigate } from "../router.js";
import { renderTabbar, renderTopbar, svg } from "../nav.js";
import { el, parseBoxCode } from "../utils.js";
import { toast } from "../toast.js";
import * as data from "../data.js";
import { QrScanner } from "../qr.js";

export function renderScanner(app) {
  app.innerHTML = "";
  const view = el(`<div class="screen screen--with-tabbar"></div>`);
  view.appendChild(renderTopbar("Scanner"));

  const body = el(`
    <div class="stack">
      <div class="scan-frame" id="scan-frame">
        <div class="scan-placeholder">
          <button class="btn btn-primary" id="start-scan" style="width:auto;padding:14px 22px;">${svg.scan} Activer le scanner</button>
          <p class="text-low" style="margin-top:10px;font-size:12px;">La caméra ne s'allume qu'après cette étape.</p>
        </div>
      </div>
      <p class="text-low" id="status" style="text-align:center;"></p>
      <div class="landing-divider">ou</div>
      <div class="field">
        <label for="manual-code">Saisir l'identifiant à 4 caractères</label>
        <div class="row"><input id="manual-code" maxlength="4" placeholder="ex. A7K2" class="mono" style="text-transform:uppercase;"><button class="btn btn-primary" id="go" style="width:auto;">OK</button></div>
      </div>
    </div>
  `);
  view.appendChild(body);
  app.appendChild(view);
  app.appendChild(renderTabbar());

  let handled = false;
  let scanner = null;

  const stopScanner = () => { scanner?.stop(); scanner = null; };

  const lookup = async (raw) => {
    const value = parseBoxCode(raw);
    if (handled || !value) return;
    handled = true;
    stopScanner();
    try {
      const box = await data.getBoxById(state.move.id, value);
      if (box) {
        toast(`Carton ${box.id} trouvé`, "success");
        navigate(`/cartons/${box.id}`);
      } else {
        toast("Aucun carton associé — création guidée", "default");
        navigate("/cartons/nouveau");
      }
    } catch {
      toast("Erreur de recherche", "error");
      handled = false;
    }
  };

  const frame = body.querySelector("#scan-frame");
  const startScanning = () => {
    frame.innerHTML = `<video autoplay muted playsinline></video><div class="scan-reticle"></div>`;
    const video = frame.querySelector("video");
    scanner = new QrScanner(video, {
      onResult: (value) => lookup(value),
      onError: () => {
        body.querySelector("#status").textContent = "Caméra indisponible — vérifie les autorisations, ou utilise la saisie manuelle.";
        frame.innerHTML = `<div class="scan-placeholder"><button class="btn btn-secondary" id="start-scan" style="width:auto;padding:14px 22px;">Réessayer</button></div>`;
        frame.querySelector("#start-scan").addEventListener("click", startScanning);
      },
    });
    scanner.start();
  };

  body.querySelector("#start-scan").addEventListener("click", startScanning);

  body.querySelector("#go").addEventListener("click", () => {
    const val = body.querySelector("#manual-code").value.trim();
    if (val.length !== 4) return toast("L'identifiant fait 4 caractères", "error");
    lookup(val);
  });

  // La caméra s'éteint dès qu'on quitte l'écran (changement de route).
  window.addEventListener("hashchange", stopScanner, { once: true });
}
