# Supabase setup

The app is prepared for a Supabase project using two local Vite variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Keep real values in `.env.local`; Git ignores that file. Never put a secret or
service-role key in a `VITE_` variable because Vite exposes those values to the
browser bundle.

## Apply the schema

Run `migrations/20261001000000_create_lookbook_storage.sql` in the Supabase SQL
Editor, or apply it with an authenticated Supabase CLI session. It creates:

- `lookbook_projects` for the structured lookbook document;
- `lookbook_images` for image metadata and editorial transforms;
- the private `lookbook-images` Storage bucket.

Then run `migrations/20261006010000_repair_anonymous_lookbook_access.sql` in the
Lookbook project's SQL Editor. It can be safely re-run on an existing project;
it changes privileges and policies without replacing any project or images.

The old `20261001010000_add_viewer_editor_auth.sql` is historical and is not
required for direct access. Existing Auth accounts/role records can remain but
are not consulted by the app. No accounts or passwords need to be created.

The repair grants `anon` schema usage and `SELECT`, `INSERT`, `UPDATE`, `DELETE`
on `lookbook_projects`, `lookbook_images`, and `storage.objects`. RLS stays
enabled, with anonymous policies scoped to project `ostrich-boy` and bucket
`lookbook-images`. Uploads with upsert require all of `SELECT`, `INSERT`, and
`UPDATE`; image removal also requires `DELETE`. The bucket can stay private
because its anonymous policy permits the app's existing download path.

The app uses only the publishable key, with no user token or session. Viewer and
Editor are UI modes; both use the same anonymous backend permissions.

**A GitHub/frontend deployment does not apply these SQL changes.** A live
`42501: permission denied for table lookbook_projects` indicates that the
anonymous PostgreSQL role lacks table privileges. Fix the grants first, then
check the RLS policies. The repair SQL ends with queries showing both.

An empty remote project displays the local seed data until it is saved from
direct Editor mode. Supabase becomes the active shared data source once that
project exists.
