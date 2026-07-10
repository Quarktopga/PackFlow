import { navigate } from "../router.js";
import { signIn, signUpWithMoveName, redeemInviteToken } from "../data.js";
import { toast } from "../toast.js";
import { el } from "../utils.js";
import { MOVE_TYPES } from "../config.js";
import { setState } from "../state.js";
import { canInstallDirectly, promptInstall, isStandalone, isIos, onInstallAvailability } from "../pwa.js";

export function renderLanding(app) {
  app.innerHTML = "";
  const view = el(`
    <div class="landing">
      <div class="brand-mark">
        <img src="./icons/icon-96.png" alt="">
        <span>PackFlow</span>
      </div>

      <div class="hero-tag-art" aria-hidden="true">
        <div class="drift-tag t3"></div>
        <div class="drift-tag t2"></div>
        <div class="drift-tag t1"><div class="hole"></div></div>
      </div>

      <h1 class="h-display hero-title">Le déménagement,<br><span class="accent">carton par carton.</span></h1>
      <p class="hero-sub">Étiquette, retrouve et pilote chaque carton en un scan. Rétro-planning automatique, calcul de volume, accès partagé pour toute la famille.</p>

      <div class="feature-strip">
        <div class="row"><span class="icon-badge">📦</span><div><h4>Cartons traçables</h4><p>ID à 4 caractères + QR code, contenu détaillé.</p></div></div>
        <div class="row"><span class="icon-badge">🗓️</span><div><h4>Planning sur-mesure</h4><p>Une todo-liste calée sur ta date J, selon ton type de déménagement.</p></div></div>
        <div class="row"><span class="icon-badge">📐</span><div><h4>Volume estimé</h4><p>Anticipe la taille du camion en un coup d'œil.</p></div></div>
      </div>

      <div class="landing-actions">
        <button class="btn btn-primary" id="cta-create">Créer mon déménagement</button>
        <div class="landing-divider">ou</div>
        <div class="invite-inline">
          <input type="text" id="invite-input" placeholder="Coller un lien ou code d'invitation" aria-label="Lien ou code d'invitation">
          <button class="btn btn-secondary" id="cta-invite" style="width:auto;">OK</button>
        </div>
        <button class="btn btn-ghost" id="cta-login">J'ai déjà un compte</button>
      </div>
    </div>
  `);
  app.appendChild(view);

  view.querySelector("#cta-create").addEventListener("click", () => navigate("/signup"));
  view.querySelector("#cta-login").addEventListener("click", () => navigate("/login"));
  view.querySelector("#cta-invite").addEventListener("click", async () => {
    const raw = view.querySelector("#invite-input").value.trim();
    if (!raw) return toast("Colle un lien ou un code d'invitation", "error");
    await handleInviteValue(raw);
  });
}

export async function handleInviteValue(raw) {
  let token = raw.trim();
  try {
    const url = new URL(raw);
    const hashQuery = url.hash.split("?")[1] || "";
    token = url.searchParams.get("invite")
      || new URLSearchParams(hashQuery).get("invite")
      || token;
  } catch { /* ce n'est pas une URL, on garde la valeur brute comme token */ }

  toast("Connexion en cours…");
  try {
    await redeemInviteToken(token);
    toast("Bienvenue dans le déménagement !", "success");
    navigate("/");
  } catch (err) {
    toast(err?.message ? `Lien d'invitation refusé : ${err.message}` : "Lien d'invitation invalide ou expiré", "error");
  }
}

export function renderLogin(app) {
  app.innerHTML = "";
  const view = el(`
    <div class="screen">
      <button class="btn-icon" id="back">←</button>
      <h1 class="h-display" style="font-size:28px;margin:16px 0 24px;">Connexion</h1>
      <form id="login-form" class="stack">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" required autocomplete="email">
        </div>
        <div class="field">
          <label for="password">Mot de passe</label>
          <input id="password" type="password" required autocomplete="current-password">
        </div>
        <button class="btn btn-primary" type="submit">Se connecter</button>
      </form>
    </div>
  `);
  app.appendChild(view);
  view.querySelector("#back").addEventListener("click", () => navigate("/"));
  view.querySelector("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = view.querySelector("#email").value.trim();
    const password = view.querySelector("#password").value;
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      await signIn(email, password);
      navigate("/");
    } catch (err) {
      toast("Email ou mot de passe incorrect", "error");
      btn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------------
// Wizard d'inscription en 3 étapes (un seul écran, pas de rechargement)
// ---------------------------------------------------------------------------
const wizard = { step: 1, email: "", password: "", moveName: "", type: null, date: "", skipConfig: false };

export function renderSignup(app) {
  wizard.step = 1;
  app.innerHTML = "";
  const view = el(`<div class="screen"><div class="step-dots">${dots()}</div><div id="wizard-body"></div></div>`);
  app.appendChild(view);
  renderStep(view);
}

function dots() {
  return [1, 2, 3].map((n) => {
    const cls = n < wizard.step ? "complete" : n === wizard.step ? "active" : "";
    return `<div class="step-dot ${cls}"></div>`;
  }).join("");
}

function renderStep(view) {
  view.querySelector(".step-dots").innerHTML = dots();
  const body = view.querySelector("#wizard-body");
  if (wizard.step === 1) return renderStep1(body, view);
  if (wizard.step === 2) return renderStep2(body, view);
  return renderStep3(body, view);
}

function renderStep1(body, view) {
  body.innerHTML = `
    <h2 class="h-display" style="font-size:26px;margin-bottom:6px;">Créer ton compte</h2>
    <p class="text-muted" style="margin-bottom:20px;">On commence par l'essentiel.</p>
    <form id="f1" class="stack">
      <div class="field"><label for="moveName">Nom du déménagement</label>
        <input id="moveName" placeholder="ex. Appart Lyon → Maison Bordeaux" required value="${wizard.moveName}"></div>
      <div class="field"><label for="email">Email</label>
        <input id="email" type="email" required autocomplete="email" value="${wizard.email}"></div>
      <div class="field"><label for="password">Mot de passe</label>
        <input id="password" type="password" required minlength="8" autocomplete="new-password">
        <span class="field-hint">8 caractères minimum.</span></div>
      <button class="btn btn-primary" type="submit">Continuer</button>
      <button class="btn btn-ghost" type="button" id="to-login">J'ai déjà un compte</button>
    </form>
  `;
  body.querySelector("#to-login").addEventListener("click", () => navigate("/login"));
  body.querySelector("#f1").addEventListener("submit", (e) => {
    e.preventDefault();
    wizard.moveName = body.querySelector("#moveName").value.trim();
    wizard.email = body.querySelector("#email").value.trim();
    wizard.password = body.querySelector("#password").value;
    wizard.step = 2;
    renderStep(view);
  });
}

function renderStep2(body, view) {
  body.innerHTML = `
    <h2 class="h-display" style="font-size:26px;margin-bottom:6px;">Configure ton déménagement</h2>
    <p class="text-muted" style="margin-bottom:20px;">Pour générer ta todo-liste rétro-planning. Modifiable à tout moment.</p>
    <div class="stack">
      <div class="field"><label for="date">Date du déménagement (jour J)</label>
        <input id="date" type="date" value="${wizard.date}"></div>
      <div class="field"><label>Type de déménagement</label>
        <div class="choice-grid" id="type-grid">
          ${MOVE_TYPES.map((t) => `
            <button type="button" class="choice-card" data-id="${t.id}" aria-pressed="${wizard.type === t.id}">
              <div class="choice-title">${t.title}</div><div class="choice-sub">${t.sub}</div>
            </button>`).join("")}
        </div>
      </div>
      <button class="btn btn-primary" id="continue2">Continuer</button>
      <button class="btn btn-ghost" id="skip2">Configurer plus tard</button>
    </div>
  `;
  body.querySelectorAll(".choice-card").forEach((card) => {
    card.addEventListener("click", () => {
      wizard.type = card.dataset.id;
      body.querySelectorAll(".choice-card").forEach((c) => c.setAttribute("aria-pressed", String(c === card)));
    });
  });
  body.querySelector("#continue2").addEventListener("click", () => {
    wizard.date = body.querySelector("#date").value;
    wizard.skipConfig = false;
    wizard.step = 3;
    renderStep(view);
  });
  body.querySelector("#skip2").addEventListener("click", () => {
    wizard.skipConfig = true;
    wizard.date = body.querySelector("#date").value;
    wizard.step = 3;
    renderStep(view);
  });
}

function renderStep3(body, view) {
  const typeLabel = MOVE_TYPES.find((t) => t.id === wizard.type)?.title || "Non défini";
  body.innerHTML = `
    <h2 class="h-display" style="font-size:26px;margin-bottom:6px;">Prêt à démarrer</h2>
    <p class="text-muted" style="margin-bottom:20px;">Vérifie les infos avant de créer ton compte.</p>
    <div class="card stack-sm" style="margin-bottom:24px;">
      <div class="row-between"><span class="text-muted">Déménagement</span><strong>${wizard.moveName}</strong></div>
      <div class="row-between"><span class="text-muted">Date J</span><strong>${wizard.date || "À définir"}</strong></div>
      <div class="row-between"><span class="text-muted">Type</span><strong>${wizard.skipConfig ? "À définir" : typeLabel}</strong></div>
    </div>
    <button class="btn btn-primary" id="finish">Créer mon compte</button>
    <div id="finish-error" class="field-error" style="margin-top:8px;"></div>
  `;
  body.querySelector("#finish").addEventListener("click", async (e) => {
    const btn = e.target;
    btn.disabled = true;
    try {
      await signUpWithMoveName(wizard.email, wizard.password, wizard.moveName);
      // La config (date/type) est enregistrée juste après la création
      // automatique du move par le trigger SQL, dès que la session est active.
      setState({ pendingMoveConfig: wizard.skipConfig ? null : { move_date: wizard.date, type: wizard.type } });
      toast("Compte créé, bienvenue sur PackFlow !", "success");
      navigate("/");
    } catch (err) {
      body.querySelector("#finish-error").textContent = err.message === "User already registered"
        ? "Un compte existe déjà avec cet email." : "Une erreur est survenue, réessaie.";
      btn.disabled = false;
    }
  });
}
