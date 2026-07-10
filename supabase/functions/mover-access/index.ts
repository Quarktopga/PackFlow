// PackFlow — Edge Function: mover-access
// Reçoit { token, code } et renvoie UNIQUEMENT { box_id, destination } si le
// token "déménageur" est valide et non expiré. Aucune autre donnée du
// déménagement n'est jamais exposée par cette fonction — c'est le seul point
// d'accès pour le lien partagé aux déménageurs, et il tourne avec la clé de
// service (contourne RLS volontairement, mais sous contrôle strict ici).
//
// Déploiement : supabase functions deploy mover-access

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token, code } = await req.json();
    if (!token || !code) {
      return json({ error: "token et code requis" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    );

    const { data: moverToken, error: tokenError } = await supabase
      .from("mover_tokens")
      .select("move_id, expires_at, revoked_at")
      .eq("token", token)
      .maybeSingle();

    if (tokenError || !moverToken) return json({ error: "lien invalide" }, 404);
    if (moverToken.revoked_at) return json({ error: "lien révoqué" }, 403);
    if (new Date(moverToken.expires_at) < new Date()) return json({ error: "lien expiré" }, 403);

    const normalized = String(code).trim().toUpperCase();
    const { data: box, error: boxError } = await supabase
      .from("boxes")
      .select("id, destination")
      .eq("move_id", moverToken.move_id)
      .eq("id", normalized)
      .maybeSingle();

    if (boxError || !box) return json({ error: "carton introuvable" }, 404);

    return json({ box_id: box.id, destination: box.destination });
  } catch (err) {
    return json({ error: "requête invalide" }, 400);
  }
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
