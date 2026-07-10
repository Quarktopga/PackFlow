// PackFlow — Edge Function: check-tasks (planifiée, ex. tous les jours à 8h)
// Cherche les tâches dont l'échéance est arrivée (et pas encore notifiées
// dans les dernières 20h), envoie une notification push à chaque abonnement
// du déménagement concerné, puis marque les tâches comme notifiées.
//
// Déploiement : supabase functions deploy check-tasks
// Planification (Supabase Dashboard > Edge Functions > check-tasks > Cron) :
//   0 8 * * *   (tous les jours à 8h, fuseau du projet)
// Secrets requis : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// (ex. mailto:contact@example.com), en plus de SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY déjà disponibles par défaut.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    );

    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@example.com",
      Deno.env.get("VAPID_PUBLIC_KEY"),
      Deno.env.get("VAPID_PRIVATE_KEY"),
    );

    const { data: rows, error } = await supabase.rpc("due_tasks_for_notification");
    if (error) throw error;

    const notifiedTaskIds = new Set();
    const results = await Promise.allSettled((rows ?? []).map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      const payload = JSON.stringify({
        title: "PackFlow — tâche à faire",
        body: row.label,
        url: "./index.html#/todo",
      });
      await webpush.sendNotification(subscription, payload);
      notifiedTaskIds.add(row.task_id);
    }));

    if (notifiedTaskIds.size) {
      await supabase.rpc("mark_tasks_notified", { p_task_ids: [...notifiedTaskIds] });
    }

    const failures = results.filter((r) => r.status === "rejected").length;
    return new Response(JSON.stringify({ sent: notifiedTaskIds.size, failures }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
