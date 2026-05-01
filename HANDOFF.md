# Session Handoff

**Last session end:** Automated Reminders auto-fire shipped — the second open Core item now complete. Audit revealed templates were seeded and the inbox UI worked, but **no actual auto-fire on job lifecycle existed** (only manual "Send Test" buttons). Built scheduler + email adapter + real retry. Verified end-to-end: scheduler fires booking_confirmation immediately on new upcoming jobs; day_of_eta in the 0–12h window; SMS routes through Twilio; email through `lib/email.js`; failures show clear reasons; retry re-delivers. **Work is uncommitted on `main`.**

Earlier in the session: doc realignment + Twilio SMS + A2P module shipped and pushed (commits `527520f` and `79fb588`).

Current branch: `main`, latest commit `79fb588`. Working tree dirty (Reminders auto-fire module).

---

## Session start checklist (first thing, every session)

Per `CLAUDE.md`:
1. `git rev-parse --is-inside-work-tree && git remote -v` — verify clone + origin.
2. `git fetch` — compare local HEAD vs `origin/main`. Report sync status.
3. If behind + clean → offer fast-forward. If diverged → flag; don't auto-merge.
4. Read [`SHELL_ROADMAP.md`](SHELL_ROADMAP.md) — find the next `[ ]` in the **CORE** section and its Definition of Done.
5. Dev server: `npm --prefix app run dev` → http://localhost:5173. **Current storage key: `'pp.store.v8'` / seed version 8.** Hard reload (Ctrl+Shift+R) if app shows stale data.

---

## What shipped this session

### Automated Reminders auto-fire (Core deliverable, this push)

**Audit gap:** templates seeded (`booking_confirmation`, `reminder_24h`, `day_of_eta`, `post_service`) and inbox UI worked, but the only `ADD_REMINDER_EVENT` dispatches were manual test buttons in `InvoiceDetail.jsx` and `Notifications.jsx`. The Core promise is "Automated Reminders" — they weren't.

**Files added:**
- `app/src/lib/email.js` — email adapter (mirrors `twilio.js`; branches on `VITE_EMAIL_BACKEND_URL`; ~5% stub failure rate to exercise failure UI)
- `app/src/lib/reminderScheduler.js` — pure functions: `shouldFire`, `hasFired`, `getDueReminders`, `retryDelivery`, `buildTokens`, `interpolate`
- `app/src/components/ReminderScheduler.jsx` — mounted at app root; reacts to state changes (jobs/events/templates/twilio-status) AND ticks every 60s for time-based windows. Dispatches `ADD_REMINDER_EVENT` (status `pending`) → calls adapter → dispatches `UPDATE_REMINDER_EVENT` with final status.

**Files modified:**
- `app/src/store/reducer.js` — added `UPDATE_REMINDER_EVENT` action (generic patch on a single event). The old `RETRY_REMINDER_EVENT` remains but is unused now.
- `app/src/pages/Reminders.jsx` — Inbox now handles `pending` status (amber badge) + shows `failureReason` inline + shows `recipient` under client name. Retry handler now calls `retryDelivery()` which goes through the adapter and patches the same event id (no duplicates).
- `app/src/App.jsx` — mounted `<ReminderScheduler />` alongside `<TwilioInboundListener />`.

**Fire windows (one-time per job per template, deduped):**
- `booking_confirmation`: immediately on any upcoming job
- `reminder_24h`: when startAt is 12–30h away
- `day_of_eta`: when startAt is 0–12h away
- `post_service`: when status flips to `completed`

**Token interpolation** for templates: `{client_contact} {company} {service} {site_name} {date} {time}`. Recipient resolution: SMS → site/contact/client phone; email → site/contact/client email.

**StrictMode race fix:** module-level `inFlight` Set survives the dev double-mount. Once a `(templateKey, jobId)` is added it's never deleted — synchronous failure paths (e.g. `Twilio not connected`) used to clear the key before mount-#2's effect ran, allowing duplicates. Permanent dedup is fine because state-based `hasFired()` handles cross-session refires.

**Verified in dev:**
- Fresh seed: 30 events, 0 duplicates, 2 scheduler-fired (filling gaps not covered by seed cycling)
- Twilio not connected → scheduler marks SMS reminders failed with reason "Twilio not connected"
- Connect Twilio + approve A2P + add new job → booking_confirmation email and day_of_eta SMS both fire successfully with provider message IDs
- Click Retry on a failed event → status: pending → sent (same event id, no dup; new SID assigned)

### Twilio SMS + A2P 10DLC (Core deliverable, prior commit `79fb588`)

**State (v7 → v8):**
- `company.integrations.twilio` added: `connected`, `accountSidLast4` (never full SID/token in localStorage), `phoneNumber`, `phoneNumberFriendlyName`, `connectedAt`, `lastError`, `inboundWebhookUrl`, `a2p { status, brandName, ein, businessAddress, useCase, sampleMessages, submittedAt, approvedAt, rejectionReason, notes }`.
- `messages` extended with optional `deliveryStatus` (`queued|sent|delivered|failed|received`), `twilioMessageSid`, `failureReason`, `fromPhone`, `toPhone` for SMS.
- `STORAGE_KEY` bumped `pp.store.v7` → `pp.store.v8`.

**Reducer actions (`store/reducer.js`):**
- `CONNECT_TWILIO`, `DISCONNECT_TWILIO`, `UPDATE_TWILIO_NUMBER`, `UPDATE_TWILIO_WEBHOOK`, `UPDATE_TWILIO_ERROR`
- `SUBMIT_A2P`, `UPDATE_A2P_STATUS`, `RESET_A2P`
- `RECEIVE_SMS` (matches phone → existing thread OR creates unlinked thread with phone-as-title)
- `SET_MESSAGE_DELIVERY` (patches a single message's delivery state)

**Selectors (`store/selectors.js`):**
- `selectIntegrations`, `selectTwilioIntegration`, `selectTwilioConnected`, `selectTwilioPhone`, `selectA2P`
- `selectIsTwilioSendReady` — gate for outbound (connected + number + A2P approved)
- `selectTwilioBlockers` — ordered list of blockers shown in the UI when sending isn't ready

**Permissions (`lib/roles.js`):**
- `integrations.view` (owner, admin)
- `integrations.manage` (owner only)

**Adapter (`lib/twilio.js`):**
- `connectTwilio({ accountSid, authToken })` → `{ ok, accountSidLast4, availableNumbers[] }`
- `provisionNumber({ phoneNumber, friendlyName })` → `{ ok, phoneNumber, friendlyName, inboundWebhookUrl }`
- `disconnectTwilio()`
- `sendSMS({ from, to, body })` → `{ sid, status: 'queued' }`
- `subscribeToDelivery(sid, onUpdate)` → unsubscribe fn (cycles 'sent' → 'delivered'/'failed')
- `subscribeToInbound(onMessage)` → unsubscribe (no-op in stub; SSE in prod)
- `simulateInbound({ fromPhone, toPhone, body })` — dev-only helper
- `submitA2P(payload)` → `{ ok, status: 'pending' }`
- Branches on `import.meta.env.VITE_TWILIO_BACKEND_URL`. Stub mode includes ~8% random failure rate to exercise failure UI.

**UI:**
- `pages/settings/Integrations.jsx` — five cards: Twilio connection, A2P registration (with super-admin override buttons), inbound webhook URL (copy-to-clipboard), test SMS, simulate inbound (dev-only — auto-hidden when backend env var is set).
- `components/ConnectTwilioModal.jsx` — 2-step credentials entry → number selection.
- `components/A2PRegistrationModal.jsx` — brand + EIN + address + use case + 1-5 sample messages + internal notes.
- `components/TwilioInboundListener.jsx` — mounted in `App.jsx`, subscribes to inbound stream and dispatches `RECEIVE_SMS`.
- `pages/Messaging.jsx` `handleSend` rewired: SMS-channel outbound goes through `sendSMS`, optimistically adds the message with `deliveryStatus: 'queued'`, then patches via `SET_MESSAGE_DELIVERY` as the adapter resolves. Failure cases set `deliveryStatus: 'failed'` and toast the reason.

**Routing/nav:**
- `pages/settings/SettingsLayout.jsx` — added Integrations entry (gated by `integrations.view`).
- `App.jsx` — added `/settings/integrations` route + mounted `<TwilioInboundListener />`.

**Vite config (`app/vite.config.js`):**
- Server now honors `process.env.PORT` (set by Claude Preview runtime when autoPort is on); falls back to 5173 for plain `npm run dev`.

**Doc updates from earlier this session:**
- `SHELL_ROADMAP.md` — restructured for Core-only focus; 5 add-on packages tagged `[Sold separately]`; Twilio module now `[x]`.
- `CLAUDE.md` — added build-depth expectation, deployment model section, "Rainier purchased Core only" callout.
- New memories: `build-depth.md`, `deployment-model.md`.

---

## Remaining Core items (in priority order)

| Item | Status | Effort |
|---|---|---|
| Scheduling RRULE / conflict-detection audit | `[~]` | Light–medium |
| Operations Dashboard polish + mobile audit | `[~]` | Light |
| Messaging mobile audit | `[~]` | Light |
| Migration tooling (CSV import for contacts/clients) | `[ ]` | Medium |
| Permission default audit (admin sees no financials) | `[ ]` | Trivial |
| Role label naming decision | `[ ]` | Trivial |

**Suggested next pickup:** Scheduling RRULE / conflict-detection audit. Verifies recurrence (daily/weekly/biweekly/monthly/custom) and overlapping-cleaner conflict detection both work end-to-end. If gaps, build them production-shaped.

---

## Patterns to preserve (copy these for future work)

- **Adapter pattern for external services**: `lib/twilio.js` is the model. Branch on env var; provide a fully-shaped stub for dev that simulates timings + failure modes. Production swap is just env var configuration. Apply the same shape for QuickBooks, Gusto, Stripe Connect when they sell.
- **Optimistic dispatch + status patching**: `handleSend` in `Messaging.jsx` adds the message immediately with `deliveryStatus: 'queued'` then patches via `SET_MESSAGE_DELIVERY` as the adapter resolves. UI updates feel instant; failures still surface clearly.
- **Send-readiness blockers selector**: `selectTwilioBlockers` returns an ordered list of human-readable blocker reasons. UI cards show every blocker explicitly rather than just disabling the send button silently.
- **Two-step modal flow**: `ConnectTwilioModal` uses local `step` state to walk credentials → number selection. Pattern reusable for other multi-stage integration flows.
- **Inline editable cards with dirty-track Save bar**: `buildForm(entity)` snapshot → compare against form state → Save row renders only when dirty. Reference: `ContactLinkCard` in `ConversationContextPanel.jsx`.
- **Per-field dispatch on save**: `UPDATE_CONTACT` for generic patches; `ASSIGN_CONTACT_OWNER` for owner; `SET_CONTACT_STAGE` for stage. Same shape applies to any future inline-edit card.
- **Client-side uniqueness check before dispatch**: the reducer silently drops dup emails. Check with a selector, show toast, return early.
- **`key={entity.id}` for form reset**: avoids `setState-in-effect`. Caller mounts the card with entity-id as key; switching entities remounts with a fresh form — no `useEffect` needed.
- **Storage-key bump on seed-shape change**: bump both `INITIAL_STATE.version` in `seed.js` AND `STORAGE_KEY` in `persist.js` in lockstep. Currently v8 / `'pp.store.v8'`.
- **Permission gating**: `canEditAll || entity.ownerUserId === currentUser?.id` — "edit all OR own."
- **Dedupe before create**: any "new X" flow targeting an identity should check for existing active records first.
- **Embeddable page components**: `contactId` prop + `embedded` boolean lets page components render inside modals.
- **Design tokens**: no hardcoded colors. Token → alias → recipe. See `app/src/STYLING.md`.

---

## Gotchas / known issues

- **Pre-existing lint errors** (don't fix unless asked):
  - `ContactDetail.jsx`: hooks-after-early-return — runtime is fine.
  - `Messaging.jsx`: three `setState-in-effect` warnings in URL/inbox sync effects (pre-existing; the new SMS wiring did not add any).
  - `MessagingHeader.jsx` + `PipelineBoard.jsx`: Fast-refresh warnings for non-component exports. Design-intentional.
- **Contact owner vs conversation assignee**: different fields (`contact.ownerUserId` vs `conversation.assignedUserId`). Don't conflate them in the data model.
- **Snippet folders ≠ message folders**: snippets still use `selectSnippetFolders` and `folderId` (singular). Intentional — message folders were removed in v5.
- **LF/CRLF noise**: Windows machine, git converts line endings on commit. Harmless.
- **Twilio stub failure rate**: ~8% of stubbed outbound sends fail (in `lib/twilio.js` `STUB_FAILURE_RATE`). This is intentional — exercises the failure UI path. Real production never sees this.
- **localStorage size**: each Twilio integration adds ~2KB to the persisted state. Negligible, noted for future audit.
- **Message id collision risk**: optimistic outbound message ids are `m_${Date.now()}_${randomBase36}`; reducer's `newId('m')` uses a different id generator. They won't collide.

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

> "Continue Core completion for Rainier. Read `HANDOFF.md` and `SHELL_ROADMAP.md`. Audit Reminders — confirm the 24h / day-of / confirmation templates are all wired and firing into the delivery inbox. Then move to Scheduling RRULE/conflict audit."

Or, if commits come first:

> "Read `HANDOFF.md`. Before anything else, review the uncommitted work and commit it in logical chunks: (1) doc realignment + memories, (2) Twilio module."
