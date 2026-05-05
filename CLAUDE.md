# PolishPoint Platform — Build Notes

## Doc set (read in this order at session start)

1. **`CLAUDE.md`** (this file) — stable project context, conventions, file map. Auto-loaded.
2. **`HANDOFF.md`** — session-to-session continuity: what just shipped, open issues, suggested next pickup.
3. **`SHELL_ROADMAP.md`** — living roadmap with sprints + per-module Definition of Done checklists. Source of truth for what's done / in progress / pending.
4. **`SHELL_MOBILE_RESPONSIVE.md`** — mandatory styling spec for mobile. **Zero horizontal scroll on any viewport, anywhere in the app.** Read before any UI/CSS work, any new page, any new list/table. Contains audit, canonical CSS recipes, per-page checklist, regression tests. Visual reference: [`app/public/mobile-contacts-mockup.html`](app/public/mobile-contacts-mockup.html).
5. **`UI_RULES.md`** — cosmetic + interaction rules (container hygiene, persistent bulk bars, click-target ergonomics, toast policy, segmented-control radii, etc). Read before adding/modifying UI; update in the same commit when establishing a new pattern. Reads from the token vocabulary in `app/src/STYLING.md`.

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

### Bespoke ownership model — copy + framing rules (load-bearing)

**Every client owns their installation outright.** They paid a one-time fee for a bespoke build. The code is theirs, the database is theirs, the API keys are theirs, the email sending is theirs. There is no SaaS layer, no agency in the middle, no recurring subscription, no "us" providing service. Kronelius is the developer that built and maintains the software — but to the user inside the app, **the app is theirs**.

This means **no SaaS-vendor copy in the UI.** Banned phrases in any user-facing text:

- "Tell us once" / "Let us know" / "We need..." / "We'll pull..." / "We use OAuth"
- "Our servers" / "Our backend" / "We never see..."
- "Demo mode" / "Production mode" — the user doesn't think in those terms; they either have an integration set up or they don't
- "Trial" / "Upgrade" / "Subscribe" / "Plan tier" wording oriented around buying access
- Any phrasing that positions the app as a service the user is buying from a third party

Use instead:

- "Your business profile" / "Your targeting" / "Set this once"
- "Your Anthropic key — stored locally in your installation" (or just describe what the key does without making claims about a vendor)
- "Connect a mailbox to start sending" instead of "Production needs a mailbox"
- Imperative voice describing the app's behavior, not first-person plural pretending to be a service: **"Sample results populate the table until a key is added"** not **"Demo mode runs against simulated results"**

Mental model: the user is configuring **their own software**. Every screen should feel like an admin panel they own, not a wizard from a service they pay each month. Comments inside the codebase can still say "we" (developer-to-developer talk) — but the moment text touches a `<div>` or a label, scrub it.

**This is retroactive.** When you touch a file with old SaaS-style copy, fix it as you go.

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
| `app/src/store/` | Context + reducer store. `reducer.js` is the complete action surface; `selectors.js` is the read-only surface; `persist.js` handles localStorage with version-gated reseeds (currently `pp.store.v13`). |
| `app/src/data/seed.js` | INITIAL_STATE — company, users, services, clients, contacts, tags, invoices, jobs, campaigns + sequence steps + enrollments + outreach replies + prospect searches/results + decisionMakerRuns + outreachSettings (incl. Instantly API key + cached mailboxes). Bumps `version` when schema changes to force a fresh reseed. |
| `app/src/lib/roles.js` | Role labels, permission keys, `can(user, permKey, permissions, overrides)` checker. Includes `outreach.*` + `prospecting.*` perms. |
| `app/src/lib/outreach.js` | **Instantly.ai v2 API client** + stub fallback. `createCampaign / addLeads / activateCampaign / pauseCampaign / deleteCampaign / listMailboxes / initOAuth / pollOAuthSession / listEmails / markEmailRead / createWebhook` etc. When `outreachSettings.instantlyApiKey` is set, hits `api.instantly.ai`; otherwise simulates locally so the demo still works. Token translator maps our `{first_name}` → Instantly's `{{firstName}}`. Classification mapper translates Instantly's `lead_interested` / `ai_interest_value` → our 6-class enum. |
| `app/src/lib/scrapio.js` | Scrap.io adapter for Find Prospects (Google Maps business search). Stub mode generates plausible mocks based on query/location. |
| `app/src/lib/decisionMakerEnricher.js` | Two-layer decision-maker enricher (Layer 1: Claude reads website; Layer 2: Perplexity Sonar fallback). Ships as adapter with stub. |
| `app/src/lib/outreachClassifier.js` | Stub-mode reply classifier (regex over body). Production replaced by Instantly's server-side AI via `lib/outreach.emailToReply()`. |
| `app/src/components/OutreachDispatcher.jsx` | Mounted at app root. Stub mode: simulates outbound sends every 10s + auto-routes synthetic replies. Production mode: polls `GET /api/v2/emails` every 90s for inbound replies (fallback for users without Hypergrowth-tier webhooks) + applies the same auto-routing rules. |
| `app/src/hooks/usePermission.js` | Hooks that wire `can()` to current user + overrides. |
| `app/src/pages/Clients.jsx` | CRM hub (mounted at `/contacts`). 2 sub-tabs: Contacts (default), Accounts. |
| `app/src/pages/Pipeline.jsx` | Standalone Kanban board at `/pipeline`. Wraps `components/PipelineBoard`. |
| `app/src/pages/Outreach.jsx` | Cold-email hub at `/outreach`. 4 tabs: Campaigns / Replies / Find Prospects / Settings. |
| `app/src/pages/CampaignDetail.jsx` | Per-campaign detail at `/outreach/campaigns/:id`. Tabs: Overview / Sequence / Audience / Replies. Activate/Pause/Delete buttons go through Instantly when an API key is configured. |
| `app/src/pages/ContactDetail.jsx` | Full contact profile. Tabs: Overview / Activity / Related / Notes. |
| `app/src/pages/ClientDetail.jsx` | Account profile. Tabs: Overview / Contacts / Sites / Service History / Invoices / Notes. |
| `app/src/pages/settings/` | Account, Company, Services, Team, TeamDetail (with per-user permission overrides card), Roles (permission matrix), Notifications. |
| `app/src/components/` | Shared UI primitives + domain components (TagChip, TagPicker, ContactPicker, AddContactModal, VisibilitySelect, PipelineCard, PipelineBoard, DetailHeader, FormField, Modal, ConfirmDialog, Toast, Badge, Avatar, Icon, EmptyState, UserSwitcher, RequirePerm, NewCampaignModal, OutreachDispatcher). |
| `app/src/theme.css` | Token vocabulary — tokens → aliases → recipes. See `app/src/STYLING.md`. |
| `app/src/STYLING.md` | The styling contract. Respect the three-bucket rule. |
| `UI_RULES.md` | Cosmetic + interaction rules (layout, selection bars, click targets, toasts, etc). Update this file when establishing a new UI pattern. |
| `shell.html` | Original static HTML wireframe. Kept for reference only — **the live product is `app/`**, not this file. |
| `theme-polishpoint-blue.css` | PolishPoint Blue theme — can be linked into `shell.html` or adapted for the app. |

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

Outreach perms (owner+admin by default): `outreach.view`, `outreach.edit`, `outreach.send`, `outreach.replies`. Prospecting (Find Prospects sub-tab): `prospecting.search`, `prospecting.enrich`, `prospecting.save`. Crew has none of these by default — sales-tier capability.

## Outreach module + Instantly.ai integration

The shell ships a cold-email module at `/outreach` powered by **Instantly.ai's v2 API**. Architectural rule: we do not run our own SMTP — Instantly is the sending engine. Our value-add is the CRM, the audience picker, the AI auto-routing into Pipeline + Tags, and the local cache that survives offline.

- **Adapter:** `lib/outreach.js` is the entire integration surface. When `outreachSettings.instantlyApiKey` is set, calls hit `api.instantly.ai/api/v2/*`. When unset, every function falls back to a local stub so dev/demo works end-to-end.
- **Stub-vs-production branching:** components check `outreachIsStub(apiKey)` and either dispatch local actions only (stub) or call the API + dispatch local mirror actions (production). The reducer + selectors are identical across modes — store shape is the source of truth for the UI.
- **Token translation:** authoring uses `{first_name}` / `{last_name}` / `{company}` / `{sender_first_name}` / `{sender_company}`. `lib/outreach.toInstantlyTokens()` translates to Instantly's `{{firstName}}` / `{{lastName}}` / `{{companyName}}` / custom variables on send.
- **Reply classification:** Instantly classifies inbound replies AI-side and exposes `ai_interest_value` (0.0–1.0 score) + `i_status` (integer enum: 1=interested, 2=meeting-booked, etc.) + webhook event names (`lead_interested`, `lead_not_interested`, `lead_unsubscribed`, etc.). `lib/outreach.emailToReply()` maps all three to our 6-class enum (`interested / not_interested / question / out_of_office / unsubscribe / other`).
- **Mailbox connect:** real OAuth via `POST /api/v2/oauth/{google|microsoft}/init` returning `{ session_id, auth_url, expires_at }`. We open `auth_url` in a new tab and poll `/oauth/session/status/{sessionId}` every 2.5s until success. Then `getMailboxByEmail()` confirms + `listMailboxes()` refreshes the cache.
- **Polling vs webhooks:** Instantly webhooks are gated to Hypergrowth ($97/mo). For Growth-tier users, `OutreachDispatcher.jsx` polls `GET /api/v2/emails?is_unread=true&email_type=received` every 90s. For Hypergrowth users, configure a webhook pointing at a backend endpoint (deferred — not yet built; tracked in roadmap).
- **Rate limit:** 6,000 req/min. Polling at 90s burns ~40 req/hr per workspace.
- **Plan tier UX:** `outreachSettings.instantlyPlanTier` is `'growth' | 'hypergrowth' | null`. Set on first key validation; gates webhook-only UI.
- **Reference docs:** [https://developer.instantly.ai/](https://developer.instantly.ai/) · OpenAPI spec at [`/api-reference/openapi.json`](https://developer.instantly.ai/api-reference/openapi.json).

When extending Outreach: add the API call to `lib/outreach.js` first (with a stub-mode fallback), then call it from the component, then dispatch the local mirror action. Don't bypass the adapter — the rest of the module assumes there's exactly one place to read/write Instantly state.

## Design system

- Tokens + aliases + recipes only — no hardcoded colors, no inline hex. See `app/src/STYLING.md`.
- Badge color variants: `green` / `amber` / `red` / `blue` / `slate` / `purple`. Reused by tag chips.
- Token vocabulary is shared with the Swatchboard. Reference files:
  - `C:\Users\dtucc\OneDrive\Documents\PolishPoint\theme_polishpoint_blue_swatchboard.html` (canonical)
  - `C:\Users\dtucc\OneDrive\Documents\PolishPoint\theme_polishpoint_blue.html` (mockup)

### Every-component-themed contract (load-bearing)

When you do any styling work — re-skinning a client clone, applying a theme to the shell, building a new component — **every visible element on the surface you touch must consume the active theme's recipes**. No bare flat colors when the theme defines a gradient. No missing `box-shadow` on a card / button / badge that has a colored-shadow recipe. No flat sidebar where the theme has a gradient + edge notch + triangle nav indicator. No flat hero where the theme has a gradient + radial orb.

The procedure is documented in [`app/src/STYLING.md`](app/src/STYLING.md) under "The Every-Component-Themed Contract" — **read it before any re-skin or visual PR**. The pre-merge checklist there is mandatory: walk the inventory of `index.css`, identify every selector still on base tokens, and wire it to the matching theme recipe. A re-skin is "done" only when every page (Dashboard, Schedule, Pipeline, Contacts, Messaging, Invoices, Reminders, Settings, detail views, mobile header, modals) shows the theme on every component.

### Mobile responsive contract (load-bearing — ZERO horizontal scroll)

When you build or modify any UI surface, **it must fit a 375px viewport with no horizontal scrolling**. This is non-negotiable — applies to tables, modals, settings, messaging panes, every list page, every detail page. Tables that don't fit must be replaced with card lists on mobile, not allowed to scroll sideways.

**Read [`SHELL_MOBILE_RESPONSIVE.md`](SHELL_MOBILE_RESPONSIVE.md) before any new page, any new list/table, any modal, any layout work.** It contains:

- The full audit of known offenders (file + line + fix).
- 8 canonical CSS recipes you should reuse (page head, filter drawer, card list, sticky bulk bar, modal sizing, toast/popover, sidebar overflow clip, global flexbox guard).
- Per-page implementation checklist for the rollout.
- Testing protocol — including a one-liner dev-tools eval that lists every element pushing past viewport.
- 10 regression-risk edge cases (iOS 100vh, RTL, safe-area insets, browser zoom, third-party embeds, etc.).

A page is **not** "done" until you've verified at 320 / 375 / 414 / 640 / 641px that nothing scrolls horizontally. Pair every new `<table>` with a card-list alternative gated on `@media (max-width: 640px)`. Visual mockups for every canonical pattern live at [`app/public/mobile-contacts-mockup.html`](app/public/mobile-contacts-mockup.html) (Contacts list — 3 states) and [`app/public/mobile-mockups.html`](app/public/mobile-mockups.html) (six more: Invoices list, Invoice line items, Reminders inbox, Team members, Roles & Permissions accordion, Messaging list + thread).
