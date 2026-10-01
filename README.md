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

The production bundle is written to `dist` and can be previewed locally with `npm run dev -- --host 127.0.0.1` or `npx vite preview`. This project has no deployment configuration.

## Secure access

- Viewer credentials provide read-only access.
- Editor credentials provide read and write access.

Passwords are verified by Supabase Auth and are never stored in this repository or in browser environment variables. Database and Storage permissions are enforced by Row Level Security.

## Testing the flows

1. Enter the Viewer password and confirm only Approved folders and entries are visible.
2. Choose **switch to: Editor Mode**, enter the Editor password, and edit a folder or entry.
3. Create a category or entry and confirm it defaults to Approved, then change its workflow state, link scenes, and save.
4. Upload multiple images, edit captions, reorder them, choose a primary image, and delete one after confirmation.
5. Open **Master Item List** and **Master Scene List** to confirm associations and filters.
6. Choose **switch to: Viewer Mode**, enter the Viewer password, and confirm editing controls are no longer available.

## Data storage

Structured project data is stored in Supabase Database and uploaded images are stored in the private `lookbook-images` bucket. Existing IndexedDB data is used only to initialize an empty Supabase project on the first successful Editor login.

The source code is versioned on GitHub. Supabase Auth verifies Viewer and Editor passwords, Row Level Security enforces their permissions, and Supabase Database and Storage house the shared text and images. See `supabase/README.md` for setup details.
