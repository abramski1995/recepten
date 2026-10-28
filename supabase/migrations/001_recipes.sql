-- Recipes table. Only the Netlify function (service key) talks to it, so
-- row level security is on with no policies: the public anon key gets no access.
create extension if not exists pgcrypto;

create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  source_url    text,
  image_url     text,
  description   text,
  notes         text,
  servings      integer check (servings is null or servings between 1 and 99),
  total_minutes integer check (total_minutes is null or total_minutes > 0),
  ingredients   text[] not null default '{}',
  steps         text[] not null default '{}',
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists recipes_tags_idx on public.recipes using gin (tags);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists recipes_updated_at on public.recipes;
create trigger recipes_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

alter table public.recipes enable row level security;
