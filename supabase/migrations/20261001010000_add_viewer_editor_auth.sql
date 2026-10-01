create table public.lookbook_access_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer', 'editor'))
);

insert into public.lookbook_access_roles (user_id, role)
select id, 'viewer' from auth.users where lower(email) = 'viewer@ostrich-boy.invalid'
on conflict (user_id) do update set role = excluded.role;

insert into public.lookbook_access_roles (user_id, role)
select id, 'editor' from auth.users where lower(email) = 'editor@ostrich-boy.invalid'
on conflict (user_id) do update set role = excluded.role;

do $$
begin
  if not exists (select 1 from public.lookbook_access_roles where role = 'viewer') then
    raise exception 'The Viewer Auth user was not found.';
  end if;
  if not exists (select 1 from public.lookbook_access_roles where role = 'editor') then
    raise exception 'The Editor Auth user was not found.';
  end if;
end;
$$;

alter table public.lookbook_access_roles enable row level security;
revoke all on table public.lookbook_access_roles from anon, authenticated;
grant select on table public.lookbook_access_roles to authenticated;

create policy "Users read their own Lookbook role"
on public.lookbook_access_roles for select to authenticated
using ((select auth.uid()) = user_id);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.lookbook_role()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select role from public.lookbook_access_roles
  where user_id = (select auth.uid())
$$;

revoke all on function private.lookbook_role() from public;
grant execute on function private.lookbook_role() to authenticated;

grant select, insert, update, delete on table public.lookbook_projects to authenticated;
grant select, insert, update, delete on table public.lookbook_images to authenticated;

create policy "Viewer and Editor read Lookbook projects"
on public.lookbook_projects for select to authenticated
using ((select private.lookbook_role()) in ('viewer', 'editor'));
create policy "Editor creates Lookbook projects"
on public.lookbook_projects for insert to authenticated
with check ((select private.lookbook_role()) = 'editor');
create policy "Editor updates Lookbook projects"
on public.lookbook_projects for update to authenticated
using ((select private.lookbook_role()) = 'editor')
with check ((select private.lookbook_role()) = 'editor');
create policy "Editor deletes Lookbook projects"
on public.lookbook_projects for delete to authenticated
using ((select private.lookbook_role()) = 'editor');

create policy "Viewer and Editor read Lookbook images"
on public.lookbook_images for select to authenticated
using ((select private.lookbook_role()) in ('viewer', 'editor'));
create policy "Editor creates Lookbook images"
on public.lookbook_images for insert to authenticated
with check ((select private.lookbook_role()) = 'editor');
create policy "Editor updates Lookbook images"
on public.lookbook_images for update to authenticated
using ((select private.lookbook_role()) = 'editor')
with check ((select private.lookbook_role()) = 'editor');
create policy "Editor deletes Lookbook images"
on public.lookbook_images for delete to authenticated
using ((select private.lookbook_role()) = 'editor');

create policy "Viewer and Editor read Lookbook files"
on storage.objects for select to authenticated
using (bucket_id = 'lookbook-images' and (select private.lookbook_role()) in ('viewer', 'editor'));
create policy "Editor uploads Lookbook files"
on storage.objects for insert to authenticated
with check (bucket_id = 'lookbook-images' and (select private.lookbook_role()) = 'editor');
create policy "Editor updates Lookbook files"
on storage.objects for update to authenticated
using (bucket_id = 'lookbook-images' and (select private.lookbook_role()) = 'editor')
with check (bucket_id = 'lookbook-images' and (select private.lookbook_role()) = 'editor');
create policy "Editor deletes Lookbook files"
on storage.objects for delete to authenticated
using (bucket_id = 'lookbook-images' and (select private.lookbook_role()) = 'editor');
