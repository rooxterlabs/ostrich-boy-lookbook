create table public.lookbook_projects (
  id text primary key,
  title text not null,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.lookbook_images (
  id text primary key,
  project_id text not null references public.lookbook_projects(id) on delete cascade,
  entry_id text not null,
  storage_path text not null unique,
  name text not null,
  caption text not null default '',
  sort_order integer not null default 0,
  position_x double precision,
  position_y double precision,
  scale double precision,
  frame_ratio text check (frame_ratio in ('landscape', 'vertical')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lookbook_images_project_entry_order_idx
  on public.lookbook_images(project_id, entry_id, sort_order);

create function public.set_lookbook_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_lookbook_projects_updated_at
before update on public.lookbook_projects
for each row execute function public.set_lookbook_updated_at();

create trigger set_lookbook_images_updated_at
before update on public.lookbook_images
for each row execute function public.set_lookbook_updated_at();

alter table public.lookbook_projects enable row level security;
alter table public.lookbook_images enable row level security;

revoke all on table public.lookbook_projects from anon, authenticated;
revoke all on table public.lookbook_images from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lookbook-images',
  'lookbook-images',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Access policies intentionally arrive with the future Viewer/Editor
-- authentication migration. Until then, the publishable browser key cannot
-- read or modify production records or files.
