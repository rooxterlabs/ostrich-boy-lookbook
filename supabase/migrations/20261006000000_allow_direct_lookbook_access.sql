-- The Viewer and Editor Auth accounts remain available, but the deployed
-- lookbook now enters either mode without collecting a password. These policies
-- let its anonymous browser client read and edit the shared project and images.

grant select, insert, update, delete on table public.lookbook_projects to anon;
grant select, insert, update, delete on table public.lookbook_images to anon;
grant usage on schema storage to anon;
grant select, insert, update, delete on table storage.objects to anon;

create policy "Direct Lookbook project access"
on public.lookbook_projects for all to anon
using (true)
with check (true);

create policy "Direct Lookbook image metadata access"
on public.lookbook_images for all to anon
using (true)
with check (true);

create policy "Direct Lookbook image file access"
on storage.objects for all to anon
using (bucket_id = 'lookbook-images')
with check (bucket_id = 'lookbook-images');
