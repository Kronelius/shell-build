# Shell Build — Handoff

**Last session end (2026-05-19):** Shell rebranded from Rainier Facility Solutions to **PolishPoint baseline**. Pushed to `Kronelius/shell-build` as the canonical reusable foundation. Old shell-build main preserved at tag `pre-2026-05-rebrand`.

## What this repo is

`Kronelius/shell-build` is the master shell — a complete, generic operations CRM for cleaning / facility-services businesses. Built as a React + Vite SPA in `app/`. Branded as PolishPoint. Per-client deployments clone this repo as their starting point, then swap brand config + theme + seed.

## What just shipped

### Phase 0 — Tokenized non-CSS brand surfaces
- `app/src/brand.config.js` — single source of truth for brand name, primary hex, primary RGB, logo filename, title suffix
- `app/vite-plugin-brand.js` — substitutes `%BRAND_*%` placeholders in `index.html` at dev/build time
- `app/scripts/build-manifest.mjs` — pre-step that renders `manifest.template.json` → `public/manifest.json` from `BRAND` constants (runs before every `npm run dev` / `npm run build`)
- `app/scripts/gen-pwa-icons.mjs` — now imports `BRAND.logoFile` + `BRAND.primaryRgb`; one source of truth for icon generation
- `app/src/lib/documentTitle.js` — imports `BRAND.titleSuffix`
- `public/manifest.json` is now gitignored (generated artifact)

Result: re-skinning the shell for a new client = edit `brand.config.js` (5 fields) + swap `theme-<client>.css` + drop in new logo PNG + run gen-pwa-icons.

### Phase D — Theme swap to PolishPoint Blue
- `app/src/theme-rainier.css` deleted
- `app/src/theme-polishpoint.css` created from the canonical PolishPoint Blue palette (anchored on `#1E8FE8`)
- `app/src/index.css` import updated
- Brand-secondary token stubbed to teal so the one no-fallback consumer in `index.css` (line 2800) resolves cleanly

### Phase E — Seed genericization
- Company entity rebranded: `PolishPoint` / `Alex Morgan` (owner) / `(555) 555-0100` / `hello@polishpoint.app` / `123 Main St, Anytown USA` / `PP` initials + invoice prefix
- 8 team users renamed (Alex Morgan, Jordan Reyes, Sam Patel, Taylor Kim, Devon Carter, Charlie Adams, Avery Stone, Rowan Hill); all emails on `@polishpoint.app`
- Invoice IDs rebranded: `RFS-100x` → `PP-100x` (8 invoices)
- Snippets, response templates, and demo chat messages updated to reference PolishPoint and new team names
- Service catalog (10 services), client list (7 PNW-fictional businesses), contacts, sites, jobs, conversations — all kept as-is (already generic per the v33 seed)
- `INITIAL_STATE.version`: 36 → 37; `STORAGE_KEY`: `pp.store.v36` → `pp.store.v37`. No migration function needed — key bump orphans pre-rebrand localStorage and triggers fresh reseed.

### Phase G — Doc cleanup
- Deleted: `RAINIER_SCOPE.md`, `rainier-facility-solutions.html`, `mockups/messaging-mixed/*`
- Scrubbed Rainier mentions from: `CLAUDE.md`, `SHELL_ROADMAP.md`, `SUPABASE_READINESS.md`, `SHELL_MOBILE_RESPONSIVE.md`, `E2E_SECURITY_CHECK.md`, `UI_RULES.md`, `app/.env.example`, `app/src/lib/roles.js`, `app/src/lib/push.js`, `app/src/store/selectors.js`, `app/src/components/CsvImportModal.jsx`, `app/src/components/ConnectInboxModal.jsx`, `app/src/pages/Dashboard.jsx`, `app/src/pages/settings/Company.jsx`, `app/public/sw.js`
- HANDOFF.md (this file): reset to shell-baseline summary

## What's preserved as historical context (intentionally)

- `app/src/store/persist.js` — migration functions `migrateV33toV34`, `migrateV34toV35`, `migrateV35toV36` still reference `@rainierfs.com` and `@rainierfacilitysolutions.com` in their transformation logic. These ONLY operate on stored localStorage from the Rainier-era proving build. Fresh shell-build clones start at v37 and never trigger these. Per project conventions, past migration code stays verbatim.

## Suggested next pickup

1. **First per-client clone.** Use the new "Per-client clone checklist" in `SHELL_ROADMAP.md` to create the next client deployment (clone shell-build to a new repo under the client's GitHub org, swap brand + theme + seed).
2. **Tokenization gap** — `app/src/index.css` still has raw px values for spacing/font-sizes (acknowledged in `STYLING.md` "Known gaps"). Color tokenization is solid; spacing/typography is a future cleanup pass. Not blocking any per-client work.
3. **Supabase Phase 1** — per `SUPABASE_READINESS.md`, the next architectural milestone is replacing localStorage with Supabase (Postgres + Auth + Realtime + RLS). Phase 0 + 1 land in the shell baseline; Phases 2–7 are per-client.

## Running the app

```bash
cd app
npm install              # first time
npm run dev              # http://localhost:5173 (or first free port)
```

`npm run dev` automatically runs the manifest prebuild step. `npm run build` does the same for production.

## Re-skin recipe (per-client clone)

1. Edit `app/src/brand.config.js`:
   ```js
   BRAND = {
     name: 'Acme Cleaning',
     primaryHex: '#XXXXXX',
     primaryRgb: { r: 0x.., g: 0x.., b: 0x.., alpha: 1 },
     logoFile: 'acme-logo.png',
     titleSuffix: 'Acme Cleaning CRM',
     ...
   }
   ```
2. Drop logo at `app/public/acme-logo.png`
3. Create `app/src/theme-acme.css` (copy `theme-polishpoint.css`, swap hex values)
4. Update `app/src/index.css` import: `@import './theme-polishpoint.css'` → `@import './theme-acme.css'`
5. Update `app/src/data/seed.js` company entity + team users; bump `INITIAL_STATE.version` + `STORAGE_KEY` in lockstep
6. `node scripts/gen-pwa-icons.mjs`
7. `npm run dev` to verify, mobile-responsive screenshot pass per CLAUDE.md, commit, push to client repo
