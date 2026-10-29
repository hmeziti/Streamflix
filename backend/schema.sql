-- StreamFLIX — schéma Supabase
-- Idempotent : peut être rejoué sur une base existante pour la mettre à niveau.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Profils (étend auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false
);

create table if not exists public.categories (
  id serial primary key,
  title text not null,
  slug text unique not null,
  position integer not null default 0
);
alter table public.categories add column if not exists position integer not null default 0;

create table if not exists public.videos (
  id serial primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  thumbnail_url text,
  video_key text not null, -- clé R2, ID Google Drive ou ID / URL VidMoly
  source_type text not null default 'r2',
  duration integer, -- secondes
  year integer,
  slug text unique not null,
  rating text,
  genre text[] not null default '{}'
);
alter table public.videos add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
alter table public.videos add column if not exists source_type text not null default 'r2';
alter table public.videos add column if not exists genre text[] not null default '{}';

do $$
begin
  alter table public.videos
    add constraint videos_source_type_check check (source_type in ('r2', 'drive', 'vidmoly'));
exception when duplicate_object then null;
end $$;

-- Liaison vidéo <-> catégorie, ordonnée par position
create table if not exists public.video_categories (
  video_id integer references public.videos(id) on delete cascade,
  category_id integer references public.categories(id) on delete cascade,
  position integer not null default 0,
  primary key (video_id, category_id)
);
alter table public.video_categories add column if not exists position integer not null default 0;

-- ---------------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------------

-- La PK (video_id, category_id) ne sert pas la lecture "vidéos d'une catégorie triées"
create index if not exists video_categories_category_position_idx
  on public.video_categories (category_id, position);
create index if not exists videos_created_at_idx on public.videos (created_at desc);
create index if not exists categories_position_idx on public.categories (position, id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

-- Crée automatiquement le profil à l'inscription (nécessaire pour le flag is_admin)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Lecture publique du catalogue. Aucune policy d'écriture : toutes les écritures
-- passent par le Worker (clé service_role, qui contourne la RLS) après contrôle is_admin.

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.categories enable row level security;
alter table public.video_categories enable row level security;

drop policy if exists "Public videos are viewable by everyone" on public.videos;
create policy "Public videos are viewable by everyone"
  on public.videos for select using (true);

drop policy if exists "Public categories are viewable by everyone" on public.categories;
create policy "Public categories are viewable by everyone"
  on public.categories for select using (true);

drop policy if exists "Video categories are viewable by everyone" on public.video_categories;
create policy "Video categories are viewable by everyone"
  on public.video_categories for select using (true);

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select using ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Premier administrateur (à lancer une fois après votre inscription)
-- ---------------------------------------------------------------------------
-- update public.profiles set is_admin = true where email = 'vous@exemple.com';
