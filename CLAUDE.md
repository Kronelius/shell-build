# PolishPoint Platform — Build Notes

## Session Start Checklist (do this FIRST, every session)
Before responding to any request in this folder:
1. **Verify a proper git clone exists.** Run `git rev-parse --is-inside-work-tree` and `git remote -v`. If either fails or no `origin` remote is set, STOP and tell the user — do not proceed with work until the clone is sound.
2. **Sync with GitHub.** Run `git fetch` and compare local `HEAD` to `origin/<current-branch>`. Report the result (up-to-date, ahead, behind, or diverged).
3. **If behind and the working tree is clean**, offer to fast-forward before continuing. If ahead or diverged, flag it — don't auto-push or auto-merge.
4. Only after reporting sync status should you start on the user's actual request.

## Project status

This is **not a wireframe or demo** anymore. We are actively building out the full PolishPoint platform. The primary product lives in `app/` — a React + Vite SPA with a real data model, router, state store, and permission system. Every shell feature is being wired for genuine use. Client data in seed files is still representative ("Acme Cleaning Co."), but the framework, routing, permissions, and persistence are all production-shaped.

### Active build targets
- **CRM** (built — Phase 1 live, GHL-shaped navigation):
  - **`Contacts`** sidebar entry → `/contacts` → `pages/Clients.jsx`. Two sub-tabs: **Contacts** (people, email = source of truth) and **Accounts** (companies). No Pipeline tab inside — Pipeline is its own top-level nav.
  - **`Pipeline`** sidebar entry → `/pipeline` → `pages/Pipeline.jsx`. Dedicated Kanban board, same pattern as GHL's Opportunities: Contacts and Pipeline are siblings, not nested.
  - Tagging system, per-contact visibility (`org` / `team` / `private`), owner assignment, bulk actions.
  - `ContactDetail` page with Overview, Activity (synthesized timeline), Related, Notes.
  - Email uniqueness enforced on add/update.
- **Staff & permissions** (built — Phase 1 live):
  - `owner` role relabeled "Super Admin" in UI (no schema migration).
  - Per-user permission overrides (grant/revoke) editable by Super Admin in Settings → Team → member detail.
  - 10 new permission keys covering contacts, tags, pipeline, staff role-assignment.
- **Next up (Phase 2)**: billing-contact picker on Invoices, site-contact on Jobs, contact linkage on Messaging threads, Dashboard "follow-ups" card.

## Primary files

| Path | Purpose |
|---|---|
| `app/` | React + Vite SPA — the real product. `npm --prefix app run dev` serves it on port 5173. |
| `app/src/App.jsx` | Router. All routes are guarded by `<RequirePerm>`. |
| `app/src/store/` | Context + reducer store. `reducer.js` is the complete action surface; `selectors.js` is the read-only surface; `persist.js` handles localStorage with version-gated reseeds (`pp.store.v2`). |
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

## Permissions cheat sheet

Roles: `owner` (Super Admin in UI) / `admin` / `crew`. Defaults are in `lib/roles.js`; the live matrix lives in `state.permissions` and is editable at `/settings/roles` (Super Admin only). Overrides grant or revoke permissions per user; `can()` resolves revoke > grant > role default.

Key CRM perms: `contacts.view`, `contacts.view.all`, `contacts.edit`, `contacts.edit.own`, `contacts.delete`, `contacts.assignOwner`, `tags.manage`, `pipeline.view`, `pipeline.edit`. Super Admin gates: `staff.assignRoles`, `staff.editOverrides`.

## Design system

- Tokens + aliases + recipes only — no hardcoded colors, no inline hex. See `app/src/STYLING.md`.
- Badge color variants: `green` / `amber` / `red` / `blue` / `slate` / `purple`. Reused by tag chips.
- Token vocabulary is shared with the Swatchboard. Reference files:
  - `C:\Users\danie\Documents\PolishPoint\Blue\theme_polishpoint_blue_swatchboard.html`
  - `C:\Users\danie\Documents\PolishPoint\Blue\blue-theme-mockup.html` (legacy visual reference, not canonical)
