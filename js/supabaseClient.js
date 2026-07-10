import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// supabase-js chargé depuis le CDN dans index.html (window.supabase)
// La session est gérée par la lib elle-même (stockage sécurisé du token +
// refresh automatique) — on ne manipule jamais mot de passe / JWT à la main.
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "packflow-auth",
  },
});
