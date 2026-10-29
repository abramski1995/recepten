-- Favorites: a simple flag per recipe (single-user app).
alter table public.recipes add column if not exists favorite boolean not null default false;
