-- Create Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  is_admin boolean default false
);

-- Categories Table
create table public.categories (
  id serial primary key,
  title text not null,
  slug text unique not null
);

-- Videos Table
create table public.videos (
  id serial primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  thumbnail_url text,
  video_key text not null, -- R2 Key
  duration integer, -- seconds
  year integer,
  slug text unique not null,
  rating text
);

-- Video <-> Category Join Table
create table public.video_categories (
  video_id integer references public.videos(id) on delete cascade,
  category_id integer references public.categories(id) on delete cascade,
  primary key (video_id, category_id)
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.videos enable row level security;

-- Policies (Simple for demo: everyone can read videos, only admins can write)
create policy "Public videos are viewable by everyone" on public.videos for select using (true);
create policy "Public categories are viewable by everyone" on public.categories for select using (true);
