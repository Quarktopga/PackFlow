// Petit store observable, sans dépendance — cohérent avec le reste du stack.
const listeners = new Set();

export const state = {
  session: null,      // session Supabase (contient l'utilisateur)
  move: null,          // déménagement actif { id, name, move_date, type, ... }
  member: null,        // ligne move_members courante (role)
  boxes: [],
  tasks: [],
  furniture: [],
  moverToken: null,    // présent uniquement en mode "lien déménageur"
  ready: false,
};

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Flag local léger pour éviter le flash "non connecté" au démarrage
// (la vraie source de vérité reste le token géré par supabase-js).
export function markLocalSession(present) {
  if (present) localStorage.setItem("packflow-has-session", "1");
  else localStorage.removeItem("packflow-has-session");
}
export function hasLocalSessionHint() {
  return localStorage.getItem("packflow-has-session") === "1";
}
