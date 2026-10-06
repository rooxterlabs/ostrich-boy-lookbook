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

## Direct access

- The lookbook opens immediately in Viewer mode.
- Use the mode switch to enter Viewer or Editor mode immediately; no password is requested.
- The existing Viewer and Editor Supabase accounts and passwords are retained, but no longer gate the application.

Because Editor mode is entered directly, anyone with access to the deployed lookbook can edit its content.

## Testing the flows

1. Open the lookbook and confirm only Approved folders and entries are visible.
2. Choose **switch to: Editor Mode** and edit a folder or entry.
3. Create a category or entry and confirm it defaults to Approved, then change its workflow state, link scenes, and save.
4. Upload multiple images, edit captions, reorder them, choose a primary image, and delete one after confirmation.
5. Open **Master Item List** and **Master Scene List** to confirm associations and filters.
6. Choose **switch to: Viewer Mode** and confirm editing controls are no longer available.

## Data storage

Structured project data is stored in Supabase Database and uploaded images are stored in the `lookbook-images` bucket.

The source code is versioned on GitHub. The direct-access migration permits the app's anonymous client to read and edit its shared database and image storage. See `supabase/README.md` for setup details.
