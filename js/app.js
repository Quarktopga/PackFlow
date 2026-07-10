import { supabase } from "./supabaseClient.js";
import "./theme.js";
import { state, setState, markLocalSession, hasLocalSessionHint } from "./state.js";
import { registerRoute, setNotFound, setBeforeEach, startRouter, navigate, currentPath } from "./router.js";
import { registerServiceWorker } from "./pwa.js";
import { toast } from "./toast.js";
import { el } from "./utils.js";
import { INVITE_PARAM, MOVER_PARAM } from "./config.js";
import * as data from "./data.js";

import { renderLanding, renderLogin, renderSignup, handleInviteValue } from "./screens/auth.js";
import { renderDashboard } from "./screens/dashboard.js";
import { renderBoxList, renderBoxDetail, renderAddBox } from "./screens/boxes.js";
import { renderScanner } from "./screens/scanner.js";
import { renderTodo } from "./screens/todo.js";
import { renderVolume } from "./screens/volume.js";
import { renderSettings } from "./screens/settings.js";
import { renderMoverView } from "./screens/moverView.js";

registerServiceWorker();

// ---------------------------------------------------------------------------
// 0. Mode déménageur : détecté avant tout, court-circuite le reste de l'app
// ---------------------------------------------------------------------------
function readParam(name) {
  const fromSearch = new URLSearchParams(location.search).get(name);
  if (fromSearch) return fromSearch;
  const hashQuery = location.hash.split("?")[1] || "";
  return new URLSearchParams(hashQuery).get(name);
}

const moverToken = readParam(MOVER_PARAM);
if (moverToken) {
  setState({ moverToken, ready: true });
  renderMoverView(document.getElementById("app"));
} else {
  boot();
}

async function boot() {
  // Lien d'invitation dans l'URL → échange immédiat, avant tout rendu de route
  const inviteToken = readParam(INVITE_PARAM);
  if (inviteToken && !hasLocalSessionHint()) {
    history.replaceState(null, "", location.pathname);
    await handleInviteValue(inviteToken);
  }

  const { data: { session } } = await supabase.auth.getSession();
  markLocalSession(!!session);
  setState({ session });

  if (session) await loadMoveData();

  supabase.auth.onAuthStateChange((event, newSession) => {
    markLocalSession(!!newSession);
    setState({ session: newSession });
    if (event === "SIGNED_OUT") navigate("/", true);
  });

  registerRoutes();
  setBeforeEach(authGuard);
  setNotFound((app) => app.appendChild(el(`<div class="screen"><div class="empty-state"><div class="h-display">Page introuvable</div></div></div>`)));
  startRouter();
}

async function loadMoveData() {
  try {
    const move = await data.getMyMove();
    if (!move) { setState({ move: null }); return; }
    const [boxes, tasks, furniture] = await Promise.all([
      data.listBoxes(move.id),
      data.listTasks(move.id),
      data.listFurniture(move.id),
    ]);
    setState({ move, boxes, tasks, furniture, ready: true });

    // Si une config a été choisie pendant l'inscription mais pas encore
    // appliquée (le trigger crée le move avant que l'appelant ait un JWT
    // pour patcher), on la pousse ici et on seed les tâches.
    if (state.pendingMoveConfig && !move.type) {
      const updated = await data.updateMoveConfig(move.id, state.pendingMoveConfig);
      await data.seedTasksFromTemplate(move.id);
      const freshTasks = await data.listTasks(move.id);
      setState({ move: updated, tasks: freshTasks, pendingMoveConfig: null });
    }
  } catch (err) {
    toast("Impossible de charger le déménagement", "error");
  }
}

async function authGuard(path) {
  const publicPaths = ["/", "/login", "/signup"];
  const isPublic = publicPaths.includes(path);
  if (!state.session && !isPublic) return "/";
  if (state.session && isPublic) return "/accueil";
  return null;
}

function registerRoutes() {
  registerRoute("/", (app) => {
    if (state.session) return renderDashboard(app);
    renderLanding(app);
  });
  registerRoute("/accueil", (app) => renderDashboard(app));
  registerRoute("/login", (app) => renderLogin(app));
  registerRoute("/signup", (app) => renderSignup(app));
  registerRoute("/cartons", (app) => renderBoxList(app));
  registerRoute("/cartons/nouveau", (app) => renderAddBox(app));
  registerRoute("/cartons/:id", (app, params) => renderBoxDetail(app, params));
  registerRoute("/scanner", (app) => renderScanner(app));
  registerRoute("/todo", (app) => renderTodo(app));
  registerRoute("/volume", (app) => renderVolume(app));
  registerRoute("/reglages", (app) => renderSettings(app));
}
