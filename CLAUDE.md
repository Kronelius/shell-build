# PolishPoint Platform — Build Notes

## Doc set (read in this order at session start)

1. **`CLAUDE.md`** (this file) — stable project context, conventions, file map. Auto-loaded.
2. **`HANDOFF.md`** — session-to-session continuity: what just shipped, open issues, suggested next pickup.
3. **`SHELL_ROADMAP.md`** — living roadmap with sprints + per-module Definition of Done checklists. Source of truth for what's done / in progress / pending.

## Session Start Checklist (do this FIRST, every session)
Before responding to any request in this folder:
1. **Verify a proper git clone exists.** Run `git rev-parse --is-inside-work-tree` and `git remote -v`. If either fails or no `origin` remote is set, STOP and tell the user — do not proceed with work until the clone is sound.
2. **Sync with GitHub.** Run `git fetch` and compare local `HEAD` to `origin/<current-branch>`. Report the result (up-to-date, ahead, behind, or diverged).
3. **If behind and the working tree is clean**, offer to fast-forward before continuing. If ahead or diverged, flag it — don't auto-push or auto-merge.
4. **Read `HANDOFF.md`** for session continuity (what just shipped, what's next, gotchas).
5. **Read `SHELL_ROADMAP.md`** to know the active roadmap state — find the next `[ ]` and read its Definition of Done before starting.
6. Only after reporting sync status + reading both docs should you start on the user's actual request.

## Session End / As Work Lands
- **Tick off DoD items** in `SHELL_ROADMAP.md` (`[ ]` → `[x]`) the moment a piece ships — don't batch.
- **Bump seed version + storage key in lockstep** when state shape changes: `INITIAL_STATE.version` in `seed.js` AND `STORAGE_KEY` in `persist.js`. Currently on **v7** / `'pp.store.v7'`.
- **At session end, refresh `HANDOFF.md`** with:
  - What shipped this session (entities, files touched, biggest diffs)
  - Open issues / partial work / blockers
  - Suggested next pickup point (usually the next `[ ]` in SHELL_ROADMAP)
- **Commit in logical chunks when the user asks** (don't auto-commit).

## Project status

This is the **master shell build** — a reusable foundation we deploy to every client. Rainier Facility Solutions is the proving ground; the framework is generic. The primary product lives in `app/` — a React + Vite SPA with a real data model, router, state store, and permission system. Client data in seed files is representative ("Acme Cleaning Co.") on purpose — every name/value is genericized so the shell clones cleanly.

**Rainier purchased Core only ($1,000).** All build effort goes to finishing Core for Rainier delivery. Add-on packages (IPR, QuickBooks, Inventory Management, EMS, Field Ops) are listed in `SHELL_ROADMAP.md` for shell continuity but are **not built unless sold**.

**Out of scope here:** the 3-page branded website is built and live in a separate repo.

### Active roadmap

The active build plan lives in [`SHELL_ROADMAP.md`](SHELL_ROADMAP.md) — read it at session start. It is the source of truth for what's done, in progress, and pending. **Update it as items land** (flip `[ ]` → `[x]`).

Current focus: the **CORE** section of the roadmap. Everything below the CORE section is unsold and frozen.

### Build depth expectation

When implementing a roadmap item that's IN scope (Core for Rainier), build it **production-shaped, not placeholder-shaped**. A module is not done until every surface in its Definition of Done is built, wired, and verified. Default to extensive — entity + reducer + selectors + every UI surface + permissions + activity logging + edge cases + storage-key bump — in one pass.

**Do NOT speculatively build unsold add-on items.** If an unsold module gets requested, push back: confirm it's been sold before starting.

### Deployment model (post-shell)

Once shell Core is complete:
1. Commit finished shell to `Kronelius/shell-build` as the canonical baseline.
2. For each new client: create a repo under the **client's GitHub credentials** (e.g. `RainierFacilitySolutions/app`), push shell as initial commit, add **Kronelius as collaborator** with admin/write access for ongoing maintenance.
3. Per-client work is config + data only (theme, services, users, content, migrations) — never code forks. Bug fixes and feature backports flow shell → client repos as PRs from Kronelius.

## Primary files

| Path | Purpose |
|---|---|
| `app/` | React + Vite SPA — the real product. `npm --prefix app run dev` serves it on port 5173. |
| `app/src/App.jsx` | Router. All routes are guarded by `<RequirePerm>`. |
| `app/src/store/` | Context + reducer store. `reducer.js` is the complete action surface; `selectors.js` is the read-only surface; `persist.js` handles localStorage with version-gated reseeds (currently `pp.store.v7`). |
| `app/src/data/seed.js` | INITIAL_STATE — company, users, services, clients, contacts, tags, invoices, jobs, etc. Bumps `version` when schema changes to force a fresh reseed. |
| `app/src/lib/roles.js` | Role labels, permission keys, `can(user, permKey, permissions, overrides)` checker. |
| `app/src/hooks/usePermission.js` | Hooks that wire `can()` to current user + overrides. |
| `app/src/pages/Clients.jsx` | CRM hub (mounted at `/contacts`). 2 sub-tabs: Contacts (default), Accounts. |
| `app/src/pages/Pipeline.jsx` | Standalone Kanban board at `/pipeline`. Wraps `components/PipelineBoard`. |
| `app/src/pages/ContactDetail.jsx` | Full contact profile. Tabs: Overview / Activity / Related / Notes. |
| `app/src/pages/ClientDetail.jsx` | Account profile. Tabs: Overview / Contacts / Sites / Service History / Invoices / Notes. |
| `app/src/pages/settings/` | Account, Company, Services, Team, TeamDetail (with per-user permission overrides card), Roles (permission matrix), Notifications. |
| `app/src/components/` | Shared UI primitives + domain components (TagChip, TagPicker, ContactPicker, AddContactModal, VisibilitySelect, PipelineCard, PipelineBoard, DetailHeader, FormField, Modal, ConfirmDialog, Toast, Badge, Avatar, Icon, EmptyState, UserSwitcher, RequirePerm). |
| `app/src/theme.css` | Token vocabulary — tokens → aliases → recipes. See `app/src/STYLING.md`. |
| `app/src/STYLING.md` | The styling contract. Respect the three-bucket rule. |
| `shell.html` | Original static HTML wireframe. Kept for reference only — **the live product is `app/`**, not this file. |
| `theme-polishpoint-blue.css` | PolishPoint Blue theme — can be linked into `shell.html` or adapted for the app. |
| `rainier-facility-solutions.html` | Legacy — original Rainier hardcoded mockup. Reference only. |

## Running the app

```bash
npm --prefix app install    # first time
npm --prefix app run dev    # http://localhost:5173
```

Dev-server preset is in `.claude/launch.json` as `polishpoint-app`.

## Data model notes

- **`Contact`** is the person-level CRM entity. `email` is the unique identifier. Contacts can be attached to a company (`companyId`) or stand alone as leads / prospects / vendors.
- **`Client`** (aka Account in the UI) is the company/billing entity. Has `primaryContactId` pointing at the designated person.
- **Cross-module FKs**: invoices have `billingContactId`, sites have `siteContactId`, conversations have `contactId`. All optional.
- **`Tag`** entities have scope `contact` / `client` / `all` and a color alias (maps to Badge variants).
- **`userPermissionOverrides`** is a sparse list `[{ userId, grants, revokes }]`. Empty rows are pruned on save.
- **Schema versioning**: bump `INITIAL_STATE.version` in `seed.js` AND the `STORAGE_KEY` in `persist.js` when you change the shape. A version mismatch forces a fresh reseed from INITIAL_STATE.

## Navigation conventions

- **Back arrows return to where the user came from.** `DetailHeader` reads `location.state?.from` and falls back to the `backTo` prop only when the user arrived via direct URL / refresh.
- **Every link or `navigate()` call that opens a detail page must carry a referrer.** At the top of the component, call `const nav = useFromHere();` (from `app/src/hooks/useFromHere.js`), then pass `state={nav}` on `<Link>` or `{ state: nav }` as the second arg to `navigate(url, ...)`. Skipping this silently regresses the back button for that entry point.
- **List pages keep filter state in the URL** (`useSearchParams` with `replace: true`), not `useState`. This is what makes the referrer meaningful — Back restores the exact filtered view. When adding a new filter to Clients / Invoices / Schedule, extend the `setParam` pattern already in place. Top-level nav clicks (sidebar → `/schedule`, `/invoices`, etc.) do NOT need `state={nav}` — only deep-links to a specific record do.

## Permissions cheat sheet

Roles: `owner` (Super Admin in UI) / `admin` / `crew`. Defaults are in `lib/roles.js`; the live matrix lives in `state.permissions` and is editable at `/settings/roles` (Super Admin only). Overrides grant or revoke permissions per user; `can()` resolves revoke > grant > role default.

Key CRM perms: `contacts.view`, `contacts.view.all`, `contacts.edit`, `contacts.edit.own`, `contacts.delete`, `contacts.assignOwner`, `tags.manage`, `pipeline.view`, `pipeline.edit`. Super Admin gates: `staff.assignRoles`, `staff.editOverrides`.

## Design system

- Tokens + aliases + recipes only — no hardcoded colors, no inline hex. See `app/src/STYLING.md`.
- Badge color variants: `green` / `amber` / `red` / `blue` / `slate` / `purple`. Reused by tag chips.
- Token vocabulary is shared with the Swatchboard. Reference files:
  - `C:\Users\danie\Documents\PolishPoint\Blue\theme_polishpoint_blue_swatchboard.html`
  - `C:\Users\danie\Documents\PolishPoint\Blue\blue-theme-mockup.html` (legacy visual reference, not canonical)
