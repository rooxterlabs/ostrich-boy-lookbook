# OSTRICH BOY — PRODUCTION LOOKBOOK

A Vite, React and TypeScript production-lookbook prototype for Rooxter Films.

## Install and run

From `D:\People\Rooxter\_OstrichBoy_LookBook`:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## Checks and production build

```powershell
npm run typecheck
npm run lint
npm run build
```

The production bundle is written to `dist` and can be previewed locally with `npm run dev -- --host 127.0.0.1` or `npx vite preview`. Pushing `main` triggers the GitHub Pages deployment.

## Viewer and Editor access

- A new tab opens immediately in Viewer mode without a password.
- Click **Edit** and enter the password defined in `src/config/auth.ts` to enter Editor Mode.
- Editor Mode survives refresh in the same tab using `sessionStorage`.
- Click **Exit Editor Mode** to return immediately to Viewer and clear the session.

Mode switching does not use Supabase Auth, emails, UUIDs, or role tables. The
code-defined password is bundled in the website and provides a lightweight
gate. Supabase Database and Storage still hold the content and images.
Anonymous reads remain direct. Writes go through the password-checked
`lookbook-editor` Edge Function, scoped to this project and image bucket.
Deploy that function before using the new Editor to save data; see
`supabase/README.md`. Service-role credentials stay on the server.

## Testing the flows

1. Open the lookbook and confirm only Approved folders and entries are visible.
2. Choose **Edit**, enter the existing Editor password, and edit a folder or entry.
3. Create a category or entry and confirm it defaults to Approved, then change its workflow state, link scenes, and save.
4. Upload multiple images, edit captions, reorder them, choose a primary image, and delete one after confirmation.
5. Open **Master Item List** and **Master Scene List** to confirm associations and filters.
6. Refresh and confirm Editor Mode persists, then choose **Exit Editor Mode** and confirm editing controls disappear and a further refresh stays in Viewer.

## Data storage

Structured project data is stored in Supabase Database and uploaded images are stored in the `lookbook-images` bucket.

The source code is versioned on GitHub. The existing policies keep anonymous
reads available and deny direct anonymous writes. The Edge Function checks the
code-defined password and performs only the supported Lookbook operations on
the server. This change does not alter existing RLS policies, tables, Auth
users, or data. A frontend deployment alone does not deploy the Edge Function.
