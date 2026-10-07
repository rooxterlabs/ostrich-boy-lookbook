-- Restore the existing Editor password/account while keeping Viewer public.
-- Run in the Lookbook project's SQL Editor (wrqpiuwluhvbgvxkvzxc).
-- This script is re-runnable and does not reset passwords or change content.
begin;

do $$
begin
  if not exists (
    select 1 from auth.users u
    join public.lookbook_access_roles r on r.user_id = u.id
    where lower(u.email) = 'editor@ostrich-boy.invalid' and r.role = 'editor'
  ) then
    raise exception 'Existing Editor account/role not found. No permissions were changed.';
  end if;
end;
$$;

grant usage on schema public to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
on public.lookbook_projects, public.lookbook_images from anon;
grant select on public.lookbook_projects, public.lookbook_images to anon;
grant select, insert, update, delete
on public.lookbook_projects, public.lookbook_images to authenticated;

-- Reuse the existing role mapping; no new accounts or password values.
grant select on public.lookbook_access_roles to authenticated;
drop policy if exists "Users read their own Lookbook role" on public.lookbook_access_roles;
create policy "Users read their own Lookbook role"
on public.lookbook_access_roles for select to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema private to authenticated;
create or replace function private.lookbook_role()
returns text language sql security definer set search_path = '' stable
as $$
  select role from public.lookbook_access_roles where user_id = (select auth.uid())
$$;
revoke all on function private.lookbook_role() from public;
grant execute on function private.lookbook_role() to authenticated;

drop policy if exists "Direct Lookbook project access" on public.lookbook_projects;
create policy "Direct Lookbook project access"
on public.lookbook_projects for select to anon
using (id = 'ostrich-boy');

drop policy if exists "Direct Lookbook image metadata access" on public.lookbook_images;
create policy "Direct Lookbook image metadata access"
on public.lookbook_images for select to anon
using (project_id = 'ostrich-boy');

drop policy if exists "Authenticated Editor Lookbook project access" on public.lookbook_projects;
create policy "Authenticated Editor Lookbook project access"
on public.lookbook_projects for all to authenticated
using (id = 'ostrich-boy' and (select private.lookbook_role()) = 'editor')
with check (id = 'ostrich-boy' and (select private.lookbook_role()) = 'editor');

drop policy if exists "Authenticated Editor Lookbook image metadata access" on public.lookbook_images;
create policy "Authenticated Editor Lookbook image metadata access"
on public.lookbook_images for all to authenticated
using (project_id = 'ostrich-boy' and (select private.lookbook_role()) = 'editor')
with check (project_id = 'ostrich-boy' and (select private.lookbook_role()) = 'editor');

grant usage on schema storage to anon, authenticated;
grant select on storage.objects to anon;
grant select, insert, update, delete on storage.objects to authenticated;

drop policy if exists "Direct Lookbook image file access" on storage.objects;
create policy "Direct Lookbook image file access"
on storage.objects for select to anon
using (bucket_id = 'lookbook-images');

drop policy if exists "Authenticated Editor Lookbook image file access" on storage.objects;
create policy "Authenticated Editor Lookbook image file access"
on storage.objects for all to authenticated
using (bucket_id = 'lookbook-images' and (select private.lookbook_role()) = 'editor')
with check (bucket_id = 'lookbook-images' and (select private.lookbook_role()) = 'editor');

-- Deny anonymous writes to this bucket even if another permissive policy
-- exists, without revoking Storage permissions for unrelated buckets.
drop policy if exists "Anonymous Lookbook uploads blocked" on storage.objects;
create policy "Anonymous Lookbook uploads blocked"
on storage.objects as restrictive for insert to anon
with check (bucket_id <> 'lookbook-images');

drop policy if exists "Anonymous Lookbook image updates blocked" on storage.objects;
create policy "Anonymous Lookbook image updates blocked"
on storage.objects as restrictive for update to anon
using (bucket_id <> 'lookbook-images')
with check (bucket_id <> 'lookbook-images');

drop policy if exists "Anonymous Lookbook image deletion blocked" on storage.objects;
create policy "Anonymous Lookbook image deletion blocked"
on storage.objects as restrictive for delete to anon
using (bucket_id <> 'lookbook-images');

notify pgrst, 'reload schema';
commit;

select table_name,
  has_table_privilege('anon', 'public.' || table_name, 'SELECT') as anonymous_read,
  has_table_privilege('anon', 'public.' || table_name, 'INSERT') as anonymous_insert,
  has_table_privilege('anon', 'public.' || table_name, 'UPDATE') as anonymous_update,
  has_table_privilege('anon', 'public.' || table_name, 'DELETE') as anonymous_delete
from (values ('lookbook_projects'), ('lookbook_images')) as t(table_name);

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname, tablename) in (
  ('public', 'lookbook_projects'), ('public', 'lookbook_images'), ('storage', 'objects')
)
and ('anon' = any(roles) or policyname like 'Authenticated Editor Lookbook%')
order by schemaname, tablename, policyname;
