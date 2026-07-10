-- ============================================================================
-- PackFlow — Row Level Security
-- Chaque table est verrouillée : seuls les membres d'un déménagement (via
-- move_members) peuvent lire/écrire ses données. Aucun accès n'est possible
-- sans authentification (anonyme y compris, via signInAnonymously + invite).
-- ============================================================================

alter table moves               enable row level security;
alter table move_members        enable row level security;
alter table invite_tokens       enable row level security;
alter table mover_tokens        enable row level security;
alter table boxes               enable row level security;
alter table items               enable row level security;
alter table tasks               enable row level security;
alter table task_templates      enable row level security;
alter table furniture           enable row level security;
alter table push_subscriptions  enable row level security;

-- Helper : l'utilisateur courant est-il membre de ce move ?
create or replace function is_move_member(p_move_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from move_members
    where move_id = p_move_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- moves
-- ---------------------------------------------------------------------------
create policy "moves_select_members" on moves
  for select using (is_move_member(id));

create policy "moves_update_members" on moves
  for update using (is_move_member(id));

-- L'insertion se fait uniquement via le trigger handle_new_user (SECURITY
-- DEFINER) déclenché à l'inscription : aucune policy INSERT côté client.

-- ---------------------------------------------------------------------------
-- move_members
-- ---------------------------------------------------------------------------
create policy "members_select_same_move" on move_members
  for select using (is_move_member(move_id));

-- Pas d'INSERT/UPDATE/DELETE client direct : géré par les RPC SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- invite_tokens / mover_tokens — jamais lisibles/écrivables directement.
-- Toute création/consommation passe par des RPC/Edge Functions SECURITY DEFINER.
-- (Pas de policy = accès refusé par défaut avec RLS activé.)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- boxes
-- ---------------------------------------------------------------------------
create policy "boxes_select_members" on boxes
  for select using (is_move_member(move_id));

create policy "boxes_insert_members" on boxes
  for insert with check (is_move_member(move_id) and created_by = auth.uid());

create policy "boxes_update_members" on boxes
  for update using (is_move_member(move_id));

create policy "boxes_delete_members" on boxes
  for delete using (is_move_member(move_id));

-- ---------------------------------------------------------------------------
-- items (via le move_id du carton parent)
-- ---------------------------------------------------------------------------
create policy "items_select_members" on items
  for select using (is_move_member((select move_id from boxes where boxes.id = items.box_id)));

create policy "items_insert_members" on items
  for insert with check (is_move_member((select move_id from boxes where boxes.id = items.box_id)));

create policy "items_delete_members" on items
  for delete using (is_move_member((select move_id from boxes where boxes.id = items.box_id)));

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create policy "tasks_select_members" on tasks
  for select using (is_move_member(move_id));

create policy "tasks_insert_members" on tasks
  for insert with check (is_move_member(move_id));

create policy "tasks_update_members" on tasks
  for update using (is_move_member(move_id));

create policy "tasks_delete_members" on tasks
  for delete using (is_move_member(move_id));

-- task_templates : lecture publique (référentiel non sensible), pas d'écriture client
create policy "task_templates_select_all" on task_templates
  for select using (true);

-- ---------------------------------------------------------------------------
-- furniture
-- ---------------------------------------------------------------------------
create policy "furniture_select_members" on furniture
  for select using (is_move_member(move_id));

create policy "furniture_insert_members" on furniture
  for insert with check (is_move_member(move_id));

create policy "furniture_delete_members" on furniture
  for delete using (is_move_member(move_id));

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------
create policy "push_subscriptions_select_members" on push_subscriptions
  for select using (is_move_member(move_id));

create policy "push_subscriptions_upsert_members" on push_subscriptions
  for insert with check (is_move_member(move_id));

create policy "push_subscriptions_update_members" on push_subscriptions
  for update using (is_move_member(move_id));
