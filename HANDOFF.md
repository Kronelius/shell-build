# Session Handoff

> **NEW (2026-05-04) — OUTREACH MODULE SHIPPED, INSTANTLY-BACKED:** Cold-email module is live at `/outreach` with real Instantly.ai v2 API integration. `lib/outreach.js` is the entire client surface (createCampaign, addLeads, OAuth mailbox connect, listEmails polling, etc.) with stub fallback when no Instantly key is configured. NewCampaignModal is a 3-step wizard whose submit POSTs to Instantly and bulk-uploads selected CRM contacts as leads. Auto-routing of inbound replies into Pipeline + Tags is live. **Storage bumped v10 → v13** in three steps (v11 = Outreach base, v12 = Prospecting / Find Prospects with Scrap.io, v13 = real Instantly client + cached mailboxes + per-campaign schedule fields).

> **CRITICAL FIX:** Prior commit `6e5f714` ("Data integrity sweep") modified `App.jsx` + `reducer.js` + `index.css` to reference Outreach files but did **not** commit the actual `Outreach.jsx` / `CampaignDetail.jsx` / `OutreachDispatcher.jsx` / `lib/outreach.js` / `lib/scrapio.js` / `lib/decisionMakerEnricher.js` / `lib/outreachClassifier.js` / `NewCampaignModal.jsx` files. **Origin/main was broken** for any fresh clone. This session ships the missing files and brings storage to v13.

> **MOBILE RESPONSIVE MANDATE (2026-05-03):** [`SHELL_MOBILE_RESPONSIVE.md`](SHELL_MOBILE_RESPONSIVE.md) — zero horizontal scroll on any viewport. Per-page rollout checklist still pending. Read the doc before any UI/CSS work.

**Last session end (2026-05-04):** Outreach module rebuilt as a real Instantly.ai integration (was previously a fully-local stub). Working tree currently in flux during commit chunks; once committed, branch will match `origin/main` after the three-chunk push.

---

## What shipped this session — Outreach + Instantly pivot

### Architectural decision: Instantly.ai is the sending engine

The first cut of Outreach (built earlier and partially committed in `6e5f714`) had `lib/outreach.js` as a pure local stub — campaigns lived only in our React store, "sending" was simulated with timeouts. The user asked us to confirm whether Instantly's public API supports the "create-in-our-app, lives-in-Instantly" workflow before continuing. Audit (in [`developer.instantly.ai`](https://developer.instantly.ai/)) confirmed full coverage: campaign CRUD, bulk leads, OAuth mailbox connect, AI reply classification (`ai_interest_value` 0–1 + `i_status` enum + `lead_*` webhook events), polling fallback for users without Hypergrowth-tier webhooks. We pivoted before committing the broken-main fix so the integration ships against a real backend.

### `lib/outreach.js` rewritten as a real Instantly v2 client

Endpoints implemented (see `lib/outreach.js` for the full JSDoc):

| Function | Endpoint |
|---|---|
| `validateInstantlyKey` | `GET /api/v2/accounts?limit=1` (cheapest probe — there is no `/me`) |
| `listMailboxes` | `GET /api/v2/accounts` (mapped to a flat `{ id, email, provider, status, warmupScore, dailyLimit }` shape) |
| `getMailboxByEmail` | `GET /api/v2/accounts/{email}` |
| `initOAuth` | `POST /api/v2/oauth/{google\|microsoft}/init` (no body — returns `{ session_id, auth_url, expires_at }`) |
| `pollOAuthSession` | `GET /api/v2/oauth/session/status/{sessionId}` |
| `createCampaign` | `POST /api/v2/campaigns` |
| `activateCampaign` | `POST /api/v2/campaigns/{id}/activate` (no body) |
| `pauseCampaign` | `POST /api/v2/campaigns/{id}/pause` (no body — confirmed `/pause`, NOT `/stop`) |
| `deleteCampaign` | `DELETE /api/v2/campaigns/{id}` |
| `getCampaignAnalytics` | `GET /api/v2/campaigns/analytics/overview?id={id}` |
| `addLeads` | `POST /api/v2/leads/add` (wrapper field is `leads`, `campaign_id` is top-level) |
| `listEmails` | `GET /api/v2/emails?is_unread=true&email_type=received&limit=50&sort_order=desc` |
| `markEmailRead` | `PATCH /api/v2/emails/{id}` with `{ is_unread: false }` |
| `getUnreadCount` | `GET /api/v2/emails/unread/count` |
| `listWebhookEventTypes` | `GET /api/v2/webhooks/event-types` |
| `createWebhook` | `POST /api/v2/webhooks` |
| `listWebhooks` | `GET /api/v2/webhooks` |

Helpers also exported: `buildCampaignBody({ localCampaign, localSteps, schedule, mailboxEmails })` translates our local entity shape to Instantly's nested `campaign_schedule.schedules[].timing/days/timezone` + `sequences[].steps[].variants[]` payload. `contactToLead(contact, companyName, senderCtx)` translates a CRM contact to an Instantly lead with `custom_variables`. `toInstantlyTokens(template)` rewrites `{first_name}` → `{{firstName}}` etc. `emailToReply(email)` translates an Instantly email row to our `outreachReplies` row shape (with classification mapping below). `classifyByIStatus(int)` and `INSTANTLY_CLASSIFICATION` map server-side classes to ours. `outreachIsStub(apiKey)` returns true when no key is configured — every component checks this to decide stub-vs-real flow. Stub fallbacks (`sendOutreachEmail`, `connectMailbox`, `simulateInboundReply`) preserved for dev mode.

### Settings tab: real Instantly OAuth flow

`Outreach.jsx` Settings tab now shows:

1. **`InstantlyApiKeyCard`** — paste-and-validate flow against `GET /accounts?limit=1`. On success: stores key + timestamp, immediately fetches mailbox list, surfaces "Connected · N mailboxes loaded" toast. On Disconnect: clears key + cached mailboxes + plan tier.
2. **`MailboxCard`** — branched UI:
   - **No Instantly key:** falls back to the legacy single-mailbox stub demo so dev experience continues.
   - **With key:** lists cached mailboxes from `settings.instantlyMailboxes` with `email · provider · status · warmup score · daily cap`. Connect Google / Microsoft buttons trigger real OAuth — `initOAuth` returns `auth_url` (opened in new tab) + `sessionId`, then we poll `pollOAuthSession` every 2.5s for up to 5 min. On `success`: lookup the mailbox, refresh the cached list, success toast. On `error` / `expired` / `401`: cancel polling, surface the failure.
3. Existing Anthropic / Scrap.io / Perplexity API key cards untouched.
4. Existing SendingCapsCard + AutoRoutingCard untouched.

### NewCampaignModal rewritten

3-step wizard, but the model has shifted:

- **Step 1 (Basics):** name + sender mailbox dropdown (sourced from `settings.instantlyMailboxes` in production, falls back to internal `users[]` in stub) + per-campaign schedule (daily cap + sending hours + sending days + IANA timezone). Defaults populate from `outreachSettings.dailyCap / sendingHoursStart / sendingHoursEnd / defaultTimezone`.
- **Step 2 (Audience):** unchanged — CRM contact picker with search + tag filter.
- **Step 3 (Sequence):** unchanged — pick from 3 starter templates (4-touch cold / 3-touch warm / single-touch warm).

Submit handler:
- **Production (Instantly key set):** `createCampaign(apiKey, body)` → captures returned campaign id → `addLeads(apiKey, { campaignId, leads })` → dispatches `ADD_CAMPAIGN` + `ADD_CAMPAIGN_STEP × N` + `ENROLL_CONTACTS` to local store using the Instantly id as our id. Surface "Campaign 'X' created in Instantly with N leads" toast. Navigate to `/outreach/campaigns/:id`.
- **Stub:** same dispatches with a locally-minted id, no API call. Surface "(stub mode)" suffix in the toast.

### CampaignDetail wired through the API

`setStatus(next)` in CampaignDetail.jsx now calls `activateCampaign(apiKey, id)` or `pauseCampaign(apiKey, id)` before dispatching the local mirror. `removeCampaign()` calls `deleteCampaign(apiKey, id)`. All three short-circuit to local-only in stub mode.

### OutreachDispatcher: poll mode

Two modes now:
- **Stub:** every 10s, walks active enrollments, simulates outbound sends through the stub adapter (existing behavior).
- **Production:** every 90s, calls `listEmails(apiKey, { isUnread: true, emailType: 'received', limit: 50 })`. For each email not already in our `outreachReplies`, dispatches `RECEIVE_OUTREACH_REPLY` with the translated payload (classification mapped from `i_status` + `ai_interest_value`). Module-level `seenEmailIds` Set guards against re-ingest. Auto-routing logic untouched — same rules apply against the real classifications.

### Storage / seed bumps

- `app/src/data/seed.js` — `version: 10` → `version: 13` (consolidated three steps into one bump on this session). Added `outreachSettings.instantlyApiKey` + `instantlyKeyValidatedAt` + `instantlyPlanTier` + `instantlyMailboxes` + `instantlyMailboxesFetchedAt` + `defaultTimezone` + `pendingOAuth`.
- `app/src/store/persist.js` — `STORAGE_KEY: 'pp.store.v10'` → `'pp.store.v13'` in lockstep.
- Existing dev installs reseed on next load.

### CSS additions (`app/src/index.css`)

- `.mailbox-list` + `.mailbox-row` + `.mailbox-row-main` — connected mailboxes list inside the new MailboxCard.
- `.days-picker` + `.days-picker-day` + `.days-picker-day.on` — pill-style sending-day toggle in NewCampaignModal step 1.
- (Existing Outreach-specific CSS — campaign-grid, reply-card, sequence-step, audience-list, template-card, wizard-step, prospecting-* — was already in the file from the prior commit.)

### Roadmap + scope rework

- `SHELL_ROADMAP.md` — added an `[~]` Outreach module section (with full DoD checklist, marked items `[x]` for what's done, `[ ]` for deferred items: webhook UI for Hypergrowth, analytics fetch, per-step variants, lead-lifecycle polling) and an `[x]` Find Prospects sub-module section. Removed "7-day sales sequence automation" from the Stretch / unsold list — the Outreach module IS that capability.
- `CLAUDE.md` — updated Primary files table to include all new Outreach + Prospecting files, bumped storage version reference to v13, added an "Outreach module + Instantly.ai integration" section documenting the architectural rule (Instantly is the sending engine, our value-add is CRM + audience + auto-routing + cache).

### Verified end-to-end

- Settings tab renders all cards: InstantlyApiKeyCard at top, branched MailboxCard, existing Anthropic / Scrap.io / Perplexity cards, SendingCaps, AutoRouting (confirmed via Claude Preview).
- Storage migrates v10 → v13 on next load — old v10/v11/v12 keys left in localStorage as recovery breadcrumbs.
- No hot-reload errors in the dev server through the rewrite.

---

## Files touched this session

- `app/src/lib/outreach.js` — full rewrite from local-stub to real Instantly v2 client (with stub fallback)
- `app/src/components/NewCampaignModal.jsx` — full rewrite (sender dropdown sources from Instantly mailboxes, per-campaign schedule fields, real API submit)
- `app/src/pages/Outreach.jsx` — added `InstantlyApiKeyCard`, replaced `MailboxCard` with branched OAuth version, added `useRef` import, refresh + OAuth polling logic
- `app/src/pages/CampaignDetail.jsx` — wired activate / pause / delete to the API in production mode
- `app/src/components/OutreachDispatcher.jsx` — added `pollInstantlyReplies()` for production mode + branched tick interval
- `app/src/data/seed.js` — added Instantly settings fields, version 12 → 13
- `app/src/store/persist.js` — STORAGE_KEY v12 → v13 + bump comment
- `app/src/index.css` — `.mailbox-list` + `.mailbox-row` + `.days-picker` styles
- `SHELL_ROADMAP.md` — added Outreach + Find Prospects sections; removed sales-sequence stretch item
- `CLAUDE.md` — updated Primary files, storage version, added Outreach + Instantly section
- `HANDOFF.md` — this rewrite

(Plus the 11 files modified + 9 untracked files that were already pending from the broken-main state — committed as part of this session's chunked landing.)

---

## Session start checklist (first thing, every session)

Per `CLAUDE.md`:
1. `git rev-parse --is-inside-work-tree && git remote -v` — verify clone + origin.
2. `git fetch` — compare local HEAD vs `origin/main`. Report sync status.
3. If behind + clean → offer fast-forward. If diverged → flag; don't auto-merge.
4. Read [`SHELL_ROADMAP.md`](SHELL_ROADMAP.md) — Outreach is the new shell module; Core is complete except mobile-responsive rollout.
5. Dev server: `npm --prefix app run dev` → http://localhost:5173. **Storage key: `'pp.store.v13'` / seed version 13.**

---

## Suggested next session

1. **Webhook UI for Hypergrowth-tier Instantly users** — currently the OutreachDispatcher polls every 90s. For Hypergrowth, add a Settings → Outreach card that creates a webhook via `POST /api/v2/webhooks` pointing at a deploy backend endpoint (the backend just relays the POST body to a /messaging-style SSE/websocket the client subscribes to).
2. **Analytics from `/campaigns/analytics/overview`** — currently `selectCampaignKpis` computes from local events. Replace with a fetch + cache pattern keyed off `campaign.instantlyCampaignId`.
3. **Per-step variant editor** — Instantly supports `variants[]` per step (A/B/n-way). Sequence editor in CampaignDetail currently single-variant only. Add a "+ Variant" button per step.
4. **Plan-tier detection** — first call after `validateInstantlyKey` should attempt `POST /webhooks` with a no-op event to detect 403 (Growth) vs 200 (Hypergrowth). Store the result in `outreachSettings.instantlyPlanTier` and gate webhook UI accordingly.
5. **Lead lifecycle polling** — currently we ingest replies. Also poll `/leads/{id}` for `i_status` changes so the Pipeline reflects "Meeting Booked" / "Closed" updates the user makes inside Instantly.
6. **Backport this work to the Rainier client repo** — the Outreach module is shell-tier; Rainier's clone needs the next sync.

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
