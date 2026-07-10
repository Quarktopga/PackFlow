-- ============================================================================
-- PackFlow — restrictions d'exécution
-- Les fonctions qui exposent des données de notification push (endpoints,
-- clés d'abonnement) ne doivent être appelables que par le rôle service,
-- jamais par le client (anon/authenticated), même si elles sont SECURITY
-- DEFINER. Sans ce verrou, n'importe quel utilisateur authentifié pourrait
-- lire les abonnements push d'un autre déménagement.
-- ============================================================================

revoke execute on function due_tasks_for_notification() from public, anon, authenticated;
revoke execute on function mark_tasks_notified(uuid[]) from public, anon, authenticated;

grant execute on function due_tasks_for_notification() to service_role;
grant execute on function mark_tasks_notified(uuid[]) to service_role;
