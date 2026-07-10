// ============================================================================
// PackFlow — configuration
// Remplace ces deux valeurs par celles de ton projet Supabase
// (Project Settings > API). L'anon key est publique par design : c'est le
// RLS côté base de données qui protège les données, jamais cette clé.
// ============================================================================
export const SUPABASE_URL = "https://lgwhenbandkpidtvoejb.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_0kogZqBgz55npjmrLY7iDA_7z0m8xVF";

// Dimensions standards proposées lors de la création d'un carton (cm)
export const STANDARD_BOX_SIZES = [
  { label: "Petit",        w: 33, h: 33, d: 33, hint: "Livres, vaisselle" },
  { label: "Moyen",        w: 45, h: 45, d: 45, hint: "Usage courant" },
  { label: "Grand",        w: 55, h: 45, d: 45, hint: "Linge, jouets" },
  { label: "Penderie",     w: 50, h: 50, d: 100, hint: "Vêtements sur cintre" },
  { label: "Livres (XS)",  w: 30, h: 30, d: 25, hint: "Charge lourde" },
];

// Emojis proposés pour catégoriser les objets d'un carton
export const ITEM_TYPES = [
  { emoji: "📚", label: "Livres" },
  { emoji: "🍽️", label: "Vaisselle" },
  { emoji: "👕", label: "Vêtements" },
  { emoji: "🖼️", label: "Décoration" },
  { emoji: "🔌", label: "Électronique" },
  { emoji: "🧸", label: "Jouets" },
  { emoji: "🧴", label: "Salle de bain" },
  { emoji: "🍳", label: "Cuisine" },
  { emoji: "📄", label: "Papiers" },
  { emoji: "🪴", label: "Plantes" },
  { emoji: "🛠️", label: "Outils" },
  { emoji: "❓", label: "Autre" },
];

// Types de déménagement — pilotent le rétro-planning
export const MOVE_TYPES = [
  { id: "buy_buy",   title: "Achat → Achat",     sub: "Vente et achat en simultané" },
  { id: "rent_buy",  title: "Location → Achat",  sub: "Fin de bail vers acquisition" },
  { id: "rent_rent", title: "Location → Location", sub: "Changement de location" },
  { id: "buy_rent",  title: "Achat → Location",  sub: "Vente vers une location" },
];

export const TASK_CATEGORIES = {
  admin:    { label: "Administratif", color: "#e8a33d" },
  logement: { label: "Logement",      color: "#2a9d8f" },
  energie:  { label: "Énergie & box", color: "#7c9cff" },
  cartons:  { label: "Cartons",       color: "#f0ae49" },
  jour_j:   { label: "Jour J",        color: "#e5484d" },
  apres:    { label: "Après-déménagement", color: "#9aa0b4" },
};

// Clé publique VAPID pour les notifications push (cf. README pour la générer,
// ex. via `npx web-push generate-vapid-keys`). La clé privée correspondante
// ne va JAMAIS ici — uniquement dans les secrets de l'Edge Function.
export const VAPID_PUBLIC_KEY = "BEJS-fFqXHBMtN7t52PA35fhuU181pWvWzvBn9cBge8M0qfqFxK4-6EeHE_hpOkeYMc2wetBSl1dhA0-dtrGbu8";

export const APP_NAME = "PackFlow";
export const INVITE_PARAM = "invite";
export const MOVER_PARAM = "mover";
