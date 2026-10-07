-- Apply to the live Lookbook project (wrqpiuwluhvbgvxkvzxc) with its SQL Editor
-- or an admin database connection. Deploying frontend files does not run SQL.
-- Re-runnable and data-preserving: changes grants/policies only, never content.
begin;

grant usage on schema public to anon;
grant select, insert, update, delete on table public.lookbook_projects to anon;
grant select, insert, update, delete on table public.lookbook_images to anon;

alter table public.lookbook_projects enable row level security;
alter table public.lookbook_images enable row level security;

drop policy if exists "Direct Lookbook project access" on public.lookbook_projects;
create policy "Direct Lookbook project access"
on public.lookbook_projects for all to anon
using (id = 'ostrich-boy')
with check (id = 'ostrich-boy');

drop policy if exists "Direct Lookbook image metadata access" on public.lookbook_images;
create policy "Direct Lookbook image metadata access"
on public.lookbook_images for all to anon
using (project_id = 'ostrich-boy')
with check (project_id = 'ostrich-boy');

-- Private-bucket downloads, uploads with upsert, and removals all require
-- object privileges and matching RLS. No owner/user/session check is used.
grant usage on schema storage to anon;
grant select, insert, update, delete on table storage.objects to anon;

drop policy if exists "Direct Lookbook image file access" on storage.objects;
create policy "Direct Lookbook image file access"
on storage.objects for all to anon
using (bucket_id = 'lookbook-images')
with check (bucket_id = 'lookbook-images');

notify pgrst, 'reload schema';
commit;

-- Inspect the resulting table privileges and applicable policies.
select table_schema, table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
  and (table_schema, table_name) in (
    ('public', 'lookbook_projects'), ('public', 'lookbook_images'),
    ('storage', 'objects')
  )
order by table_schema, table_name, privilege_type;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname, tablename) in (
  ('public', 'lookbook_projects'), ('public', 'lookbook_images'),
  ('storage', 'objects')
)
and 'anon' = any(roles)
order by schemaname, tablename, policyname;
