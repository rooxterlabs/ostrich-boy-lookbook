# Supabase Database and Storage

The browser uses only `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`, as shown in `.env.example`. Never place a
secret/service-role key in Vite variables, frontend code, or the repository.

## Current access model

Viewer reads `lookbook_projects`, `lookbook_images`, and the private
`lookbook-images` bucket through the existing anonymous read policies.
Editor Mode uses the one password in `src/config/auth.ts`, with a tab session
in `sessionStorage`. Switching modes makes no Supabase Auth requests.

Project saves, image uploads/replacements/metadata updates, and deletions go
through `functions/lookbook-editor`. Its handler checks the same password
before creating a server-side Supabase client. Its operation allowlist is
limited to project `ostrich-boy` and bucket `lookbook-images`. It does not
accept caller-selected tables, SQL, buckets, project IDs, or storage paths.

The Edge Function uses the server's built-in `SUPABASE_SERVICE_ROLE_KEY` to
perform those operations. That credential bypasses RLS, so the handler's
project/bucket checks are required. Public database write grants and Storage
policies do not need to change. The original UUID/role-based policies and
tables can remain as historical configuration; this app no longer uses them
for mode access or editing. No Auth users need to be deleted or recreated.

This is a lightweight gate: the password is intentionally included in the
browser bundle. Anyone who discovers it can call the permitted endpoint
operations. It does not provide private, user-based authorization.

## Deploy the write endpoint

From the application root, use a trusted shell with a Supabase deployment
access token configured outside the repository as `SUPABASE_ACCESS_TOKEN`:

```powershell
npx supabase functions deploy lookbook-editor --project-ref wrqpiuwluhvbgvxkvzxc --no-verify-jwt --use-api
```

`config.toml` disables the Supabase Auth JWT requirement for this function;
the handler performs the password check itself. Supabase supplies the
server URL/service-role key automatically in its hosted runtime. No secret
needs to be copied into browser code. The function imports the password
from `src/config/auth.ts`; deploy from the full application checkout.

Deploy the function before publishing the updated frontend. A GitHub Pages
deployment alone does not deploy it. Whenever changing `EDITOR_PASSWORD`,
redeploy both the function and the website together. A missing function
leaves public viewing available but prevents saving; there is no fallback
to anonymous writes or the retired Auth flow.

## Inspect and verify

`audit/current_access.sql` contains read-only queries for the live grants,
RLS policies, role function, and bucket configuration. Run it in the
project's SQL Editor to inspect dashboard-only changes. Do not rerun the
historical anonymous-write migrations.

```powershell
npx deno check --config supabase/functions/lookbook-editor/deno.json supabase/functions/lookbook-editor/index.ts
npx deno test --config supabase/functions/lookbook-editor/deno.json tests/editor-api.test.ts
npm run build
npm run lint
```

The endpoint tests use isolated Database/Storage fixtures. Live verification
must additionally save and restore a test edit and upload, update, order,
download, and remove disposable images after deployment. The existing
published content must remain intact.
