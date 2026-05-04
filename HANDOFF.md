# Session Handoff

> **NEW (2026-05-03) — MOBILE RESPONSIVE MANDATE:** [`SHELL_MOBILE_RESPONSIVE.md`](SHELL_MOBILE_RESPONSIVE.md) was added to the shell from the Rainier proving build. **Zero horizontal scroll on any viewport, anywhere in the app.** Read that doc before any UI / CSS / new-page work. It contains a full audit of known offenders, 8 canonical CSS recipes, a per-page rollout checklist, and a testing protocol. The audit applies to this shell baseline — every flagged page in the doc has the same offender here. Visual mockup at [`app/public/mobile-contacts-mockup.html`](app/public/mobile-contacts-mockup.html). The Rainier session that produced this doc has only fixed the sidebar overflow leak so far; the per-page rollout (card lists for tables, etc.) is the next workstream that should backport here.

**Last session end:** **Permission defaults audit + Roles editor discoverability shipped** (Friday meeting follow-up). Tightened 5 default permissions, restructured the Roles editor into 8 grouped tables with sensitive-pills + precedence callout + reset button, relabeled the sidebar "Roles" → "Roles & Permissions", added Team-page cross-link, bumped storage v9 → v10. The shell is now ready to clone to a Rainier-credentialed repo.

Current branch: `main`, working tree clean.

---

## What shipped this session

### Permission defaults audit (5 flips in `app/src/lib/roles.js`)

The audit asked: are the current defaults sensible for a cleaning company? Conclusion was mostly yes, but 5 specific flips:

| Key | Before | After | Why |
|---|---|---|---|
| `pipeline.view` | owner+admin+crew | owner+admin | Sales pipeline is office-tier; field crew has no business reason to see deal stages. |
| `messaging.startConversation` | owner+admin+crew | owner+admin | Crew can still **reply** via `messaging.use`. Outbound to clients from the field is a liability. Owner re-grants per trusted senior tech via override. |
| `messaging.internalComment` | owner+admin | owner+admin+crew | Internal notes ("done", "running late", "client wasn't home") are exactly what crew should post. Not visible to clients. |
| `settings.services` | owner+admin | owner | Service catalog = pricing. Owner-only by default; office manager gets it via override if they own pricing. |
| `integrations.view` | owner+admin | owner | Reduces blast radius if an admin account is compromised. Still grantable per-user. |

### Roles editor restructure (`app/src/pages/settings/Roles.jsx`)

Was a flat 39-row table. Now:

- **8 grouped tables** — Schedule & Jobs / Clients & Sites / Contacts & Pipeline / Invoices & Reminders / Messaging / Settings / Integrations / Super Admin Only.
- **"Sensitive" pill** (amber, uppercase, badge-style) on 8 high-impact keys: `clients.archive`, `contacts.delete`, `invoices.edit`, `invoices.recordPayment`, `integrations.manage`, `settings.roles.edit`, `staff.assignRoles`, `staff.editOverrides`. When granted to a non-owner role, toast renders in error tone (no `warn` variant in Toast component; `error` is the closest "attention" tone).
- **Precedence callout** above the matrix: "For each user we check, in order: per-user revoke → per-user grant → role default below."
- **"Reset all to defaults"** button (header, secondary style). Dispatches `UPDATE_PERMISSION` for any key whose roles diverge from `PERMISSIONS[id].defaultRoles`. Toasts "Reset N permission(s)" or "Already at defaults".
- **"Other" fallback section** — renders any permission keys present in store but not in `PERM_GROUPS`. Guards against silent invisibility if someone adds a key to `roles.js` and forgets to group it.

### Discoverability touches

- `app/src/pages/settings/SettingsLayout.jsx` — sidebar item relabeled `Roles` → `Roles & Permissions`. Same icon, same gate.
- `app/src/pages/settings/Team.jsx` — added "Edit role defaults →" cross-link in the page header (right of subtitle, left of "Invite Member"). Gated on `settings.roles.edit`.

### Storage / seed bump

- `app/src/data/seed.js` — `version: 9` → `version: 10`
- `app/src/store/persist.js` — `STORAGE_KEY: 'pp.store.v9'` → `'pp.store.v10'`
- Existing dev installs reseed on next load. Old `v9` localStorage key is left in place as a recovery breadcrumb (not auto-removed).

### CSS additions (`app/src/index.css`)

- `.perm-group-head` — h3 inside the grouped permission cards (border-bottom separator).
- `.perm-sensitive-pill` — small amber uppercase pill. Falls back to `#fef3c7` / `#92400e` if `--badge-amber-bg` / `--badge-amber-text` tokens don't resolve.

### Verified end-to-end

- Storage migrates `v9` → `v10` on next load (confirmed via Claude Preview).
- All 5 default flips persist correctly in the new v10 store.
- `can()` resolves the new defaults correctly per role:
  - **Owner**: full access (pipeline, messaging, settings, integrations all true)
  - **Admin**: pipeline + messaging unchanged; `settings.services` and `integrations.view` now denied
  - **Crew**: `pipeline.view` and `messaging.startConversation` denied; `messaging.internalComment` granted
- Roles editor renders all 8 grouped tables, all 8 sensitive pills, precedence callout, reset button.
- Reset button works: mutate a permission → click reset → permission returns to default + toast appears.
- Team page shows "Edit role defaults →" cross-link in section-head.

---

## Files touched this session

- `app/src/lib/roles.js` — 5 default array flips
- `app/src/pages/settings/Roles.jsx` — full restructure (PERM_GROUPS, DANGER_KEYS, callout, grouped tables, sensitive pill, reset button, smarter toast)
- `app/src/pages/settings/SettingsLayout.jsx` — sidebar label
- `app/src/pages/settings/Team.jsx` — cross-link in section-head
- `app/src/data/seed.js` — version 9 → 10
- `app/src/store/persist.js` — STORAGE_KEY v9 → v10 + bump comment
- `app/src/index.css` — `.perm-group-head` + `.perm-sensitive-pill`
- `SHELL_ROADMAP.md` — added `[x]` Permission defaults audit + Roles editor discoverability item

---

---

---

## Session start checklist (first thing, every session)

Per `CLAUDE.md`:
1. `git rev-parse --is-inside-work-tree && git remote -v` — verify clone + origin.
2. `git fetch` — compare local HEAD vs `origin/main`. Report sync status.
3. If behind + clean → offer fast-forward. If diverged → flag; don't auto-merge.
4. Read [`SHELL_ROADMAP.md`](SHELL_ROADMAP.md) — Core is complete; the only remaining work is **deployment** (clone to Rainier repo) and per-client tweaks.
5. Dev server: `npm --prefix app run dev` → http://localhost:5173. **Storage key: `'pp.store.v10'` / seed version 10.**

---

## Prior session reference (already committed in `237db27`)

### 1. Scheduling & Calendar (Core deliverable)

Built RRULE recurrence, conflict detection, drag-drop reschedule, series management, month-click-to-day, schema bump v8 → v9. See prior HANDOFF entries for full module details. Bug fix: `monthCellClick` was racing two `setSearchParams` calls — fixed to atomic single update.

### 2. Mobile audit + responsive fixes (Core deliverable)

**Root cause of most overflow issues:** `1fr` grid templates default to `minmax(auto, 1fr)`, where `auto` is content's intrinsic min-content size. When content is wider than the track, the grid expands to fit. Fixed by changing to `minmax(0, 1fr)` everywhere mobile grids stack to one column.

**Files modified:**
- `app/src/index.css` — many fixes:
  - `.main { min-width: 0 }` so flex item can shrink below content size
  - `.card { min-width: 0 }` for grid/flex contexts
  - `.dash-cols`, `.metric-strip`, `.detail-grid`, `.settings-shell`, `.template-editor`, `.week-grid`, `.detail-dl`, `.pipeline-board`, `.stat-grid`, `.msg-layout`, `.msg-3pane` — all converted from `1fr` to `minmax(0, 1fr)` in mobile media queries
  - `.tab-container` — added `overflow-x: auto` + `flex-shrink: 0` on tab buttons so tab strips scroll horizontally instead of overflowing
  - `.detail-head-actions` — removed `flex-shrink: 0`, added `min-width: 0`, `max-width: 100%`, `flex-wrap: wrap` so action buttons wrap on mobile
  - `.pipeline-toolbar` — added `flex-wrap: wrap`; form-group children get `min-width: 0; flex: 1 1 200px`
  - `.modal-card-lg` — new size variant for the CSV import modal (max-width 800px)
  - New `.csv-*` styles for the import UI
- `app/src/pages/Messaging.jsx` — mobile auto-select guard:
  - Don't auto-select first conversation on mobile when no `paramId` (lets user see inbox first)
  - Clear `activeId` when navigating from `/messaging/:id` back to `/messaging` on mobile
  - Pass `onBack={handleBackToInbox}` to message panel
  - Add `has-active` class to `.msg-3pane` based on activeId for CSS targeting
- `app/src/components/ConversationMessagePanel.jsx` — added `onBack` prop + back button in panel header (uses existing `chevronLeft` icon)
- `app/src/components/Modal.jsx` — added `size` prop; renders `modal-card-${size}` class

**Mobile messaging pattern:** at ≤768px viewport, the 3-pane grid collapses to 1 column. CSS uses the `.has-active` class to toggle between showing the thread list (when no active conversation) and the message panel (when one is selected). Back button in panel header navigates to `/messaging` and clears activeId.

**Verified at 375px and 768px:** Dashboard, Schedule (Day/Week/Month), Contacts, Pipeline, Messaging, Reminders, Invoices, all Settings sub-pages, ContactDetail, ClientDetail, JobDetail, InvoiceDetail. All 17 pages have `scrollWidth === viewportWidth` (no horizontal scroll).

### 3. CSV Import for Contacts/Accounts (Core deliverable)

Replaces the gap in "Migration tooling" — now a real feature any client can use to load existing data.

**New files:**
- `app/src/lib/csv.js` — pure utilities:
  - `parseCsv(text)` — RFC-4180 CSV parser (handles quoted fields, escaped quotes `""`, CRLF/LF). No external deps.
  - `guessField(header, fieldDefs)` — heuristic header-to-field matching (exact then partial alias match)
  - `applyMapping(row, headers, mapping)` — maps a parsed row to entity fields
  - `CONTACT_FIELDS`, `CLIENT_FIELDS` — field definitions with aliases (e.g., `email` matches `Email`, `Email Address`, `e-mail`)
  - `normalizeContact`, `normalizeClient` — coerce values (lowercase email, validate lifecycle)
  - `validateContactRow`, `validateClientRow` — required-field + email-shape checks
- `app/src/components/CsvImportModal.jsx` — 4-step wizard:
  - **Upload**: file picker (max 5 MB) + paste-text fallback
  - **Map**: auto-guesses column mappings; user can override; required-field validation
  - **Preview**: stats card (Ready/Duplicate/Invalid) + table with status colors; first 50 rows shown, all processed
  - **Result**: imported / skipped counts

**Files modified:**
- `app/src/pages/Clients.jsx` — added "Import CSV" button next to "+ Add Contact" / "+ Add Account" on both tabs; mounted `CsvImportModal` with appropriate `entity` prop

**Dedupe rules:**
- Contacts: lowercased email; checks against existing + within-batch
- Accounts: lowercased trimmed name; same checks
- Invalid rows (missing required field, invalid email format) are skipped, not blocked

**Company-name resolution for contacts:** when a CSV has a `company` column, the import looks up an existing client by name (case-insensitive); if found, sets `companyId` on the new contact. If no match, the company is dropped (we don't auto-create accounts from contact import — that should be a separate intentional flow).

**Verified end-to-end:**
- Test CSV with 5 rows (3 valid, 1 duplicate of seed `pat@metromed.com`, 1 invalid email) → preview shows correct stats; import adds 3 contacts (13 → 16); skipped count 2
- Account import: 3 rows (2 new, 1 duplicate of seed Metro Medical) → 2 imported, 1 skipped
- Auto-mapping correctly matches `First Name → firstName`, `Email Address → email`, `Mailing Address → address`, etc.
- Mobile (375px) — wizard renders cleanly, table scrolls horizontally inside its container

### 4. Role label naming decision (Core trivial)

Decision documented in `app/src/lib/roles.js`: **keep schema keys** (`owner / admin / crew`); UI display via `ROLE_LABELS` (`Super Admin / Admin / Crew`). Renaming the schema is high-cost / zero-benefit. For per-client label customization, edit `ROLE_LABELS` only.

---

## Core is complete

| Module | Status |
|---|---|
| Operations Dashboard | `[x]` |
| Scheduling & Calendar | `[x]` |
| Client Database (incl. CSV import) | `[x]` |
| Automated Reminders | `[x]` |
| Messaging Suite (incl. mobile) | `[x]` |
| SMS via Twilio + A2P | `[x]` |
| Logging invoices | `[x]` |
| Role label naming | `[x]` |
| Mobile responsive | `[x]` |

The shell is ready to clone to a Rainier-credentialed repo. Per-client work that remains (in the Rainier repo, not shell):
- Theme tokens (PolishPoint Blue or custom)
- Users seeded: Heather (admin), Lauren (admin), Kyle (super admin), Steve (super admin), cleaner roster
- Service catalog (residential / commercial / specialized)
- Existing contact migration from GHL ($200 migration add-on — uses the new CSV import)
- Phone line porting from GHL
- Admin permission default tweak: hide financials by default (per Rainier Q24)
- Any Rainier-specific dashboard cards from their dashboard-elements attachment

---

## Patterns to preserve (copy these for future work)

- **Adapter pattern for external services**: `lib/twilio.js` and `lib/email.js` are the models. Branch on env var; fully-shaped stub for dev that simulates timings + failure modes. Production swap is just env var configuration.
- **Background scheduler / dispatcher mounted at app root**: `ReminderScheduler.jsx` and `TwilioInboundListener.jsx` are the models.
- **Concrete instance expansion for recurring jobs**: don't virtualize. Generate N real job records with shared `seriesId`. First instance carries `recurrence` metadata. Edit/delete scope via ConfirmDialog ("this one" vs "all future").
- **Conflict = warning, not hard block**: cleaning companies may intentionally double-book. Amber warnings, never gating submission.
- **Atomic URL param updates**: when setting multiple search params (e.g. date + view), build one `URLSearchParams` and call `setSearchParams` once. Separate calls race.
- **Module-level dedup for StrictMode races**: never delete entries from the dedup Set; state-based dedup covers refires.
- **CSS grid mobile pattern**: when collapsing multi-column grids to 1 column on mobile, use `minmax(0, 1fr)` not `1fr`. The default `1fr` (= `minmax(auto, 1fr)`) lets content widen the track past viewport. Same goes for `.main { min-width: 0 }` so the flex container can shrink under wide content.
- **Mobile single-pane navigation**: when a desktop split-view (list + detail) needs to collapse on mobile, toggle a class like `has-active` on the container based on selection state, then use CSS to show/hide the appropriate pane. Add a "back" button that navigates to the listing URL and clears the selection.
- **Storage-key bump on seed-shape change**: bump both `INITIAL_STATE.version` in `seed.js` AND `STORAGE_KEY` in `persist.js` in lockstep. Currently **v9 / `'pp.store.v9'`**.
- **Permission gating**: `canEditAll || entity.ownerUserId === currentUser?.id` — "edit all OR own."
- **CSV parsing**: write your own RFC-4180 parser (~50 lines) — papaparse and friends are overkill and add weight. State machine over chars handles quotes/escapes correctly.
- **Schema-key vs UI-label split**: keep schema keys stable and short (`owner`, `admin`, `crew`); render labels through a separate map. Per-client label tweaks edit only the map, never the schema.
- **Design tokens**: no hardcoded colors. Token → alias → recipe. See `app/src/STYLING.md`.

---

## Gotchas / known issues

- **Pre-existing lint errors** (don't fix unless asked):
  - `ContactDetail.jsx`: hooks-after-early-return — runtime is fine.
  - `Messaging.jsx`: three `setState-in-effect` warnings in URL/inbox sync effects.
  - `MessagingHeader.jsx` + `PipelineBoard.jsx`: Fast-refresh warnings for non-component exports.
- **Twilio stub failure rate**: ~8% of stubbed outbound sends fail. Email stub fails ~5%. Intentional — exercises failure UI.
- **localStorage size**: well within 5MB quota.
- **CSV import doesn't auto-create accounts from contact rows**: if a contact CSV has a company name not found in existing clients, it's silently dropped. Importer can re-run accounts CSV first, then contacts.
- **`window.matchMedia` checks at 768px**: matched against `(max-width: 768px)`. Resizing the window after navigating won't re-evaluate the auto-select effect — it only runs on visibleConversations / paramId changes. Acceptable for the mobile/desktop boundary; users typically don't resize across that line mid-session.
- **Reminder template content stored on event**: each fired reminder snapshots rendered content. Template edits don't retroactively change fired events.

---

## What's NOT in scope

- **Inventory Management ($400 add-on)** — keys, supplies tracking. **Don't build.**
- **Employee Management System ($800)** — time-off, time tracking, document storage, training, GPS clock-in, e-sign onboarding, supervisor inspections, promotion workflow, Gusto. **Don't build.**
- **Field Ops ($600)** — checklists, before/after photos, offline mode, job verification. **Don't build.**
- **Invoice & Payment Routing ($400)** — Stripe Connect, recurring billing, tipping, customizable templates, automated invoice reminders. **Don't build.**
- **QuickBooks Integration ($300)** — bidirectional sync. **Don't build.**
- **3-page branded website** — separate repo, already shipped.
- **Sequences engine, Quotes module, Lifecycle email engine, Operational KPI cards** — speculation that wasn't promised.

If any of these get requested mid-session, **stop and confirm a sale** before building.

---

## Suggested next-session opener

Working tree clean (this session's permission audit committed and pushed). Next session is the deployment step:

> "All Core shell items are complete. Per `CLAUDE.md` deployment model: tag the shell-build baseline, then create `RainierFacilitySolutions/app` repo (under Rainier's GitHub credentials), push the shell as initial commit, add Kronelius as collaborator. Then begin Rainier-specific config: theme tokens, user seeds (Heather/Lauren admins, Kyle/Steve super admins, cleaner roster), service catalog (residential/commercial/specialized), Rainier-specific dashboard cards. The CSV import is in place — Rainier's existing contact migration from GHL goes through that ($200 add-on). The Q24 'hide financials from admin' tweak now needs less work since shell already locked `settings.services` and `integrations.view` to owner-only."
