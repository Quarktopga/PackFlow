-- ============================================================================
-- PackFlow — schéma de base (à exécuter en premier, via le SQL Editor Supabase)
-- ============================================================================
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Déménagements
-- ---------------------------------------------------------------------------
create table if not exists moves (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  move_date   date,
  type        text check (type in ('buy_buy','rent_buy','rent_rent','buy_rent')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists move_members (
  move_id   uuid not null references moves(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (move_id, user_id)
);

create index if not exists idx_move_members_user on move_members(user_id);

-- ---------------------------------------------------------------------------
-- Invitations & accès déménageur
-- ---------------------------------------------------------------------------
create table if not exists invite_tokens (
  token       text primary key default encode(gen_random_bytes(24), 'hex'),
  move_id     uuid not null references moves(id) on delete cascade,
  role        text not null default 'member' check (role in ('member')),
  created_by  uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  used_at     timestamptz,
  used_by     uuid references auth.users(id)
);

create table if not exists mover_tokens (
  token       text primary key default encode(gen_random_bytes(24), 'hex'),
  move_id     uuid not null references moves(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null default (now() + interval '60 days'),
  revoked_at  timestamptz
);

-- ---------------------------------------------------------------------------
-- Cartons & objets
-- ---------------------------------------------------------------------------
-- id à 4 caractères, unique globalement (simplifie les clés étrangères et
-- l'embedding PostgREST) ; l'accès reste scoppé par move_id via RLS.
-- Le QR code n'est jamais stocké : il encode l'URL de la fiche carton et se
-- régénère à la volée à partir de l'id (cf. js/qrgen.js). Rien à synchroniser.
create table if not exists boxes (
  id           char(4) primary key,
  move_id      uuid not null references moves(id) on delete cascade,
  width        numeric(6,1),
  height       numeric(6,1),
  depth        numeric(6,1),
  destination  text,
  created_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists idx_boxes_move on boxes(move_id);

create table if not exists items (
  id           uuid primary key default gen_random_uuid(),
  box_id       char(4) not null references boxes(id) on delete cascade,
  emoji        text,
  name         text not null check (char_length(name) between 1 and 120),
  description  text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_items_box on items(box_id);

-- ---------------------------------------------------------------------------
-- Rétro-planning : modèles + tâches réelles
-- ---------------------------------------------------------------------------
create table if not exists task_templates (
  id          uuid primary key default gen_random_uuid(),
  move_type   text check (move_type in ('buy_buy','rent_buy','rent_rent','buy_rent')), -- null = commun à tous les types
  label       text not null,
  offset_days integer not null, -- relatif au jour J (négatif = avant, positif = après)
  category    text not null check (category in ('admin','logement','energie','cartons','jour_j','apres'))
);

create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  move_id     uuid not null references moves(id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 160),
  due_date    date not null,
  offset_days integer,
  category    text not null check (category in ('admin','logement','energie','cartons','jour_j','apres')),
  done        boolean not null default false,
  done_at     timestamptz,
  snoozed     boolean not null default false,
  custom      boolean not null default false,
  notified_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists idx_tasks_move on tasks(move_id);
create index if not exists idx_tasks_due on tasks(due_date) where done = false and snoozed = false;

-- ---------------------------------------------------------------------------
-- Mobilier (volume)
-- ---------------------------------------------------------------------------
create table if not exists furniture (
  id          uuid primary key default gen_random_uuid(),
  move_id     uuid not null references moves(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  room        text,
  width       numeric(6,1) not null,
  height      numeric(6,1) not null,
  depth       numeric(6,1) not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_furniture_move on furniture(move_id);

-- ---------------------------------------------------------------------------
-- Abonnements push (notifications de rappel de tâches)
-- ---------------------------------------------------------------------------
create table if not exists push_subscriptions (
  endpoint    text primary key,
  move_id     uuid not null references moves(id) on delete cascade,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_move on push_subscriptions(move_id);
