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

- The lookbook opens immediately in Viewer mode.
- Click **Edit** and enter the existing Supabase Editor password to enter Editor mode.
- Click **Back to View** to sign out of Editor mode without another password.
- Refreshing opens public Viewer mode again. Editor sessions are kept in memory only.

Viewer reads use anonymous access. Supabase Auth and `lookbook_access_roles` verify the existing Editor account; database and Storage policies permit writes only for that Editor role. No passwords are embedded in the source or environment variables.

## Testing the flows

1. Open the lookbook and confirm only Approved folders and entries are visible.
2. Choose **Edit**, enter the existing Editor password, and edit a folder or entry.
3. Create a category or entry and confirm it defaults to Approved, then change its workflow state, link scenes, and save.
4. Upload multiple images, edit captions, reorder them, choose a primary image, and delete one after confirmation.
5. Open **Master Item List** and **Master Scene List** to confirm associations and filters.
6. Choose **Back to View** and confirm editing controls are no longer available.

## Data storage

Structured project data is stored in Supabase Database and uploaded images are stored in the `lookbook-images` bucket.

The source code is versioned on GitHub. The latest access migration keeps anonymous reads and restores password-protected Editor writes. Deploying the frontend does not apply SQL migrations: the live database must also receive the grants and policies. See `supabase/README.md` for setup details.
