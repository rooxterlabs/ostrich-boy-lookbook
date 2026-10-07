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

The original `20261001010000_add_viewer_editor_auth.sql` established the existing
Editor account's role mapping. Do not reset that account or its password.

For public Viewer access with protected editing, apply
`migrations/20261006020000_restore_editor_password_access.sql` in the Lookbook
project's SQL Editor. It is re-runnable, validates the existing Editor role,
and changes privileges/policies without replacing content or images.

The latest migration supersedes the earlier direct-write access migrations.
Do not re-run those migrations after restoring Editor protection.

Anonymous access retains `SELECT` on the project and image metadata, with
read-only RLS policies scoped to `ostrich-boy` and `lookbook-images`. Anonymous
project/metadata write grants are revoked. Storage restrictive policies deny
anonymous uploads, updates and deletion in this bucket without affecting other
buckets. Authenticated writes require the existing `editor` role from
`lookbook_access_roles`. Upload/upsert and delete permissions are included.

Viewer opens without logging in. Edit uses the existing
`editor@ostrich-boy.invalid` account through Supabase Auth. Returning to View
signs out only the current session. Sessions are not stored, so reloads return
to public Viewer mode and entering Editor again requires the password.

**A GitHub/frontend deployment does not apply these SQL changes.** A live
`42501: permission denied for table lookbook_projects` indicates that the
anonymous PostgreSQL role lacks table privileges. Fix the grants first, then
check the RLS policies. The repair SQL ends with queries showing both.

An empty remote project displays the local seed data until it is saved from
direct Editor mode. Supabase becomes the active shared data source once that
project exists.
