-- Public bucket for generated recipe photos. Uploads happen with the service key (Netlify function);
-- a public bucket only makes the files readable by URL, it grants no write or list access.
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;
