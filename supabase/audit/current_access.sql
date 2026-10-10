-- Read-only inspection. No grants, policies, users, passwords, or content change.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname, tablename) in (
  ('public', 'lookbook_projects'), ('public', 'lookbook_images'),
  ('public', 'lookbook_access_roles'), ('storage', 'objects')
)
order by schemaname, tablename, policyname;

select table_name, role_name, privilege,
  has_table_privilege(role_name, table_name, privilege) as permitted
from (values ('public.lookbook_projects'), ('public.lookbook_images'),
  ('public.lookbook_access_roles'), ('storage.objects')) as tables(table_name)
cross join (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as privileges(privilege)
order by table_name, role_name, privilege;

select n.nspname as schema_name, p.proname, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private' and p.proname = 'lookbook_role';

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'lookbook-images';
