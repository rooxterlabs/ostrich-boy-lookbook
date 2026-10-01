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

The first migration deliberately grants no browser access. Remote reads and
writes remain disabled until Viewer/Editor authentication can enforce the
correct Row Level Security and Storage policies. The existing IndexedDB data
continues to be the active data source in the meantime.
