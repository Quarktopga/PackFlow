-- ============================================================================
-- PackFlow — fonctions serveur (RPC + triggers)
-- Tout ce qui touche à la génération d'identifiants, aux invitations ou au
-- rétro-planning passe par des fonctions SECURITY DEFINER : le client ne
-- manipule jamais directement move_members, invite_tokens ou mover_tokens.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Création automatique du déménagement à l'inscription
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_move_id uuid;
  v_move_name text;
begin
  -- Les comptes anonymes (créés via un lien d'invitation) n'ont pas de
  -- déménagement propre : ils rejoignent celui de l'invitation via
  -- redeem_invite_token(), séparément.
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  v_move_name := new.raw_user_meta_data ->> 'move_name';
  if v_move_name is null or length(trim(v_move_name)) = 0 then
    return new; -- pas de nom fourni : l'utilisateur configurera plus tard
  end if;

  insert into moves (name, owner_id) values (trim(v_move_name), new.id)
    returning id into v_move_id;

  insert into move_members (move_id, user_id, role) values (v_move_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Génération d'un identifiant de carton à 4 caractères (sans ambiguïté visuelle)
-- ---------------------------------------------------------------------------
create or replace function generate_box_id(p_move_id uuid)
returns char(4)
language plpgsql
security definer
set search_path = public
as $$
declare
  -- alphabet sans caractères ambigus : pas de 0/O, 1/I/L, etc.
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_candidate text;
  v_attempts int := 0;
begin
  if not is_move_member(p_move_id) then
    raise exception 'not authorized';
  end if;

  loop
    v_candidate := '';
    for i in 1..4 loop
      v_candidate := v_candidate || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    exit when not exists (select 1 from boxes where id = v_candidate);

    v_attempts := v_attempts + 1;
    if v_attempts > 50 then
      raise exception 'unable to generate a unique box id';
    end if;
  end loop;

  return v_candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- Invitations (membre du déménagement)
-- ---------------------------------------------------------------------------
create or replace function create_invite_token()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_move_id uuid;
  v_token text;
begin
  select move_id into v_move_id from move_members where user_id = auth.uid() limit 1;
  if v_move_id is null then
    raise exception 'no move for current user';
  end if;

  insert into invite_tokens (move_id, created_by)
    values (v_move_id, auth.uid())
    returning token into v_token;

  return json_build_object('token', v_token);
end;
$$;

create or replace function redeem_invite_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invite_tokens%rowtype;
begin
  select * into v_invite from invite_tokens where token = p_token for update;

  if v_invite.token is null then
    raise exception 'invalid invite token';
  end if;
  if v_invite.used_at is not null then
    raise exception 'invite token already used';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite token expired';
  end if;

  insert into move_members (move_id, user_id, role)
    values (v_invite.move_id, auth.uid(), 'member')
    on conflict (move_id, user_id) do nothing;

  update invite_tokens set used_at = now(), used_by = auth.uid() where token = p_token;

  return json_build_object('move_id', v_invite.move_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Lien déménageur (accès en lecture seule à la destination des cartons)
-- ---------------------------------------------------------------------------
create or replace function create_mover_token()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_move_id uuid;
  v_token text;
begin
  select move_id into v_move_id from move_members where user_id = auth.uid() limit 1;
  if v_move_id is null then
    raise exception 'no move for current user';
  end if;

  insert into mover_tokens (move_id, created_by)
    values (v_move_id, auth.uid())
    returning token into v_token;

  return json_build_object('token', v_token);
end;
$$;

-- ---------------------------------------------------------------------------
-- Rétro-planning : (re)génération des tâches non personnalisées et non faites
-- ---------------------------------------------------------------------------
create or replace function seed_tasks_from_template(p_move_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_move moves%rowtype;
begin
  select * into v_move from moves where id = p_move_id;
  if v_move.id is null or not is_move_member(p_move_id) then
    raise exception 'not authorized';
  end if;
  if v_move.move_date is null or v_move.type is null then
    raise exception 'move date and type must be set first';
  end if;

  -- On ne touche jamais aux tâches personnalisées ni à celles déjà faites,
  -- pour ne pas effacer le travail de l'utilisateur lors d'un recalage.
  delete from tasks
    where move_id = p_move_id and custom = false and done = false;

  insert into tasks (move_id, label, due_date, offset_days, category, custom)
    select p_move_id, tt.label, (v_move.move_date + tt.offset_days * interval '1 day')::date,
           tt.offset_days, tt.category, false
    from task_templates tt
    where tt.move_type = v_move.type or tt.move_type is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notification automatique : détecte les tâches dont l'échéance est arrivée
-- (appelée par l'Edge Function planifiée check-tasks, cf. supabase/functions)
-- ---------------------------------------------------------------------------
create or replace function due_tasks_for_notification()
returns table (
  task_id uuid, move_id uuid, label text, due_date date,
  endpoint text, p256dh text, auth text
)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.move_id, t.label, t.due_date, ps.endpoint, ps.p256dh, ps.auth
  from tasks t
  join push_subscriptions ps on ps.move_id = t.move_id
  where t.done = false
    and t.snoozed = false
    and t.due_date <= current_date
    and (t.notified_at is null or t.notified_at < now() - interval '20 hours');
$$;

create or replace function mark_tasks_notified(p_task_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update tasks set notified_at = now() where id = any(p_task_ids);
$$;
