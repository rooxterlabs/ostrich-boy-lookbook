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

## Prototype access

- Viewer password: `viewer`
- Editor password: `editor` (enter Viewer mode first, then choose **switch to: Editor Mode**)

These checks happen in the browser and are intentionally isolated in `src/features/auth/auth.ts` so they can be replaced later. They are **not secure authentication** and do not protect confidential production material.

## Testing the flows

1. Enter `viewer` and confirm only Approved folders and entries are visible.
2. Choose **switch to: Editor Mode**, enter `editor`, and edit a folder or entry.
3. Create a category or entry and confirm it defaults to Approved, then change its workflow state, link scenes, and save.
4. Upload multiple images, edit captions, reorder them, choose a primary image, and delete one after confirmation.
5. Open **Master Item List** and **Master Scene List** to confirm associations and filters.
6. Choose **switch to: Viewer Mode**, enter `viewer`, and confirm editing controls are no longer available.

## Local-storage limitations

Structured project data and uploaded image Blobs are saved in IndexedDB under the current browser profile. They are not shared with another browser, profile, user account, or computer. Clearing site data can permanently remove the project. Use the JSON export regularly; it contains the structured data and uploaded images for restoration.

The source code is versioned on GitHub. The Supabase client and locked-down database/storage schema are prepared, but IndexedDB remains the active data source until secure Viewer/Editor authentication and the migration flow are completed. See `supabase/README.md` for setup details.
