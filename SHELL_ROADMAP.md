# Shell Completion Roadmap

## Context

This repo (`Kronelius/shell-build`) is the **master shell** — a reusable foundation we deploy to every client. Rainier Facility Solutions is the proving ground.

**Rainier purchased Core only ($1,000).** The entire focus right now is shipping Core for Rainier. Add-on modules below are listed for future builds; do not build them until sold.

**Out of scope here:** the 3-page branded website is built and live in a separate repo.

## Deployment model

1. Commit the finished shell to `Kronelius/shell-build` as the canonical baseline.
2. For each new client: create a repo under the **client's GitHub credentials**, push shell as initial commit, add **Kronelius as collaborator** with admin/write access.
3. Per-client work is config + data only (theme, services, users, content, migrations) — never code forks.

Bug fixes and feature backports flow shell → client repos as PRs from Kronelius.

## Build depth expectation

Build production-shaped, not placeholder-shaped. Every module ships with full entity + reducer + selectors + every UI surface + permissions + activity logging in one pass.

## Status legend

`[ ]` open · `[~]` in progress · `[x]` done

---

# CORE — what we owe Rainier ($1,000)

This is **the only build target right now.** Ship every item here for Rainier.

## `[~]` Operations Dashboard `[Core]`

Built as `Dashboard.jsx`. Audit + finish:
- Greeting + role-aware view
- Today's schedule (own jobs for crew, all for admin) — **[x]**
- Week revenue chart — **[x]**
- Top clients — **[x]**
- Overdue invoice list — **[x]**
- Follow-ups card (stale leads + unanswered threads) — **[x]**
- Mobile-friendly layout audit
- Wire any Rainier-specific dashboard cards from the dashboard-elements attachment they referenced

## `[~]` Scheduling & Calendar `[Core]`

Built as `Schedule.jsx`. Audit:
- Day / week / month views
- Drag-drop reschedule
- RRULE recurrence (daily / weekly / biweekly / monthly / custom)
- Conflict detection (overlapping cleaner assignments)

## `[~]` Client Database `[Core]`

Largely built. Audit:
- Contacts/Accounts split — **[x]**
- Tagging system — **[x]**
- Per-contact visibility — **[x]**
- Owner assignment — **[x]**
- Activity timeline — **[x]**
- ContactDetail / ClientDetail tabs — **[x]**
- Email uniqueness — **[x]**
- **Migration tooling** — minimum CSV import for contacts/clients (separate $200 charge applies)

## `[x]` Automated Reminders (staff/clients) `[Core]`

Audit complete — all DoD items shipped:
- `[x]` 24-hour reminder template wired (auto-fires when job startAt is 12–30h away)
- `[x]` Day-of reminder template wired (auto-fires when startAt is 0–12h away)
- `[x]` Booking confirmation template wired (auto-fires immediately on `ADD_JOB` for upcoming jobs)
- `[x]` Post-service template wired (auto-fires when job status flips to `completed`)
- `[x]` Real retry behavior (re-delivers through adapter, not just status flip)
- `[x]` Failure escalation (clear failure reason in inbox + toast; pending state visible)
- `[x]` Per-event read/unread

**Architecture:** `lib/reminderScheduler.js` exposes pure functions (`shouldFire`, `getDueReminders`, `retryDelivery`, `interpolate`, `buildTokens`). `components/ReminderScheduler.jsx` mounts at app root, reacts to state changes, ticks every 60s, dispatches `ADD_REMINDER_EVENT` (status `pending`) → calls adapter → dispatches `UPDATE_REMINDER_EVENT` with final status.

`lib/email.js` adds the matching email adapter (mirrors `twilio.js`; branches on `VITE_EMAIL_BACKEND_URL`, ~5% stub failure rate). SMS reminders route through `lib/twilio.sendSMS`; email reminders through `lib/email.sendEmail`.

Module-level `inFlight` Set guards against React.StrictMode's dev-only double-mount race (a useRef would be reset on remount, allowing duplicate fires before state propagates). Once a `(templateKey, jobId)` pair is added, it's never deleted; state-based `hasFired()` handles cross-session dedup.

Token interpolation: `{client_contact} {company} {service} {site_name} {date} {time}`. Recipient resolution: SMS → site/contact/client phone; email → site/contact/client email.

New reducer action: `UPDATE_REMINDER_EVENT` (generic patch — used by scheduler + retry). The old `RETRY_REMINDER_EVENT` action remains but is unused now; retry goes through `retryDelivery()`.

Inbox surface in `Reminders.jsx`: status badge handles `sent / pending / failed`; failed rows show the failure reason inline; rows show `recipient` under client name; retry button calls `retryDelivery()` (re-delivers through adapter and patches the same event).

## `[~]` Messaging Suite `[Core]`

Built. Audit:
- GHL-style inbox — **[x]**
- Snippets — **[x]**
- Assignment + contact linkage — **[x]**
- Pinned threads — **[x]**
- Context panel with inline editing — **[x]**
- Mobile-friendly behavior verification

## `[x]` SMS via Twilio + A2P setup `[Core]`

Definition of done — all shipped:
- `[x]` Twilio account connection flow (`settings/Integrations.jsx`, `ConnectTwilioModal.jsx`)
- `[x]` Single-number provisioning + display (step 2 of connect flow)
- `[x]` A2P 10DLC registration helper — full form + status tracking + super-admin override (`A2PRegistrationModal.jsx`)
- `[x]` Inbound SMS → Messaging thread routing (`RECEIVE_SMS` action; matches by phone or creates unlinked thread; `TwilioInboundListener` subscribes in production)
- `[x]` Outbound SMS send from Messaging (gated on `selectIsTwilioSendReady`; `SET_MESSAGE_DELIVERY` cycles queued → sent → delivered via `subscribeToDelivery`)
- `[x]` Delivery receipt handling on conversation-messages (`deliveryStatus`, `twilioMessageSid`, `failureReason` on each outbound message)
- `[x]` Number management UI (in connection card; disconnect flow)
- `[x]` Inbound webhook URL display + copy-to-clipboard (for ops to register with Twilio)
- `[x]` Test SMS card on Integrations page (verify outbound without leaving Settings)
- `[x]` Simulate inbound SMS card (dev only — exercises the routing path; auto-hidden when `VITE_TWILIO_BACKEND_URL` is set)
- `[x]` Permission keys (`integrations.view` admin+, `integrations.manage` super-admin only)
- `[x]` Send-readiness blockers card (lists every reason SMS can't send)

**Architecture chosen:** option (b) — frontend-adapter pattern. `lib/twilio.js` exposes the full integration surface (`connectTwilio`, `provisionNumber`, `disconnectTwilio`, `sendSMS`, `subscribeToDelivery`, `subscribeToInbound`, `simulateInbound`, `submitA2P`). When `VITE_TWILIO_BACKEND_URL` env var is set, calls hit the deployment backend; otherwise the adapter simulates locally with realistic timings (queued → sent → delivered, ~8% stub failure rate to exercise failure UI).

Storage bumped v7 → v8 (`pp.store.v8`).

## `[~]` Logging invoices `[Core]`

Built as `Invoices.jsx` + `InvoiceDetail.jsx`. **Note: only logging in Core** — full invoice/payment customization is the IPR add-on (not sold to Rainier). Audit Core scope:
- Manual invoice creation — **[x]**
- Status tracking (draft / sent / paid / overdue) — **[x]**
- Payment recording (manual entry only in Core) — **[x]**
- Billing-contact picker — **[x]**

## `[ ]` Permission default audit `[Core]`

- Admin role: confirm financials hidden by default (Rainier Q24)
- Document final default matrix in `roles.js` comments
- Crew role gates the right surfaces

## `[ ]` Role label naming `[Core]`

- Decide: rename `owner / admin / crew` → `Super Admin / Admin / Staff` in `roles.js`, OR keep schema and rely on `ROLE_LABELS` map (current pattern works fine — recommend keeping)

---

# Done (recent shell work — for reference)

- `[x]` Phase 1 CRM (Contacts/Accounts split, Pipeline, Super Admin permissions)
- `[x]` Phase 2 Messaging (GHL-style inbox, snippets, assignment, contact linkage, focus modal)
- `[x]` Phase 2 cross-module contact linkage (invoices, jobs, messaging)
- `[x]` Pipeline polish (uniform cards, drop indicator, reorder)
- `[x]` Dashboard Follow-ups card
- `[x]` Add-User modal (Settings → Team)
- `[x]` Roles editor (Settings → Roles, editable matrix)
- `[x]` Pipeline bulk actions + stage CRUD
- `[x]` Reminders delivery inbox (per-event read/unread + retry + delivery dashboard)
- `[x]` SMS via Twilio + A2P 10DLC (Settings → Integrations: connect, number provision, A2P registration with super-admin status override, webhook URL display, test SMS, simulate inbound; full adapter pattern in `lib/twilio.js`; outbound wired through Messaging composer with delivery-status tracking; inbound auto-routes to existing or new thread)
- `[x]` Automated Reminders auto-fire (`lib/reminderScheduler.js` + `components/ReminderScheduler.jsx`: booking_confirmation on new upcoming jobs, reminder_24h in 12–30h window, day_of_eta in 0–12h window, post_service on status=completed; routes through `lib/twilio.js` for SMS and `lib/email.js` for email; real retry that re-delivers through the adapter; pending/sent/failed lifecycle visible in Delivery Inbox)

---

# Rainier-specific work (after Core shell ships)

Post-clone, in Rainier's repo:

- Theme tokens (PolishPoint Blue or custom)
- Users seeded: Heather (admin), Lauren (admin), Kyle (super admin), Steve (super admin), cleaner roster
- Service catalog (residential / commercial / specialized)
- Existing contact migration from GHL ($200 migration add-on)
- Phone line porting from GHL (or staged: employee line first, customer line later)
- Admin permission default tweak: hide financials (per Q24)

---

# Future add-on modules (NOT sold to Rainier — don't build until sold)

Listed here for shell-roadmap continuity only. When a client buys one of these, expand it into full DoDs at that time.

- `[Sold separately]` **Invoice & Payment Routing — $400** — customizable templates, automated invoice reminders, Stripe Connect, recurring billing, tipping, payment routing
- `[Sold separately]` **QuickBooks Integration — $300** — bidirectional sync (customers / invoices / payments), AR aging surfaces
- `[Sold separately]` **Inventory Management — $400** — physical key tracking + general inventory (supplies, equipment, stock alerts)
- `[Sold separately]` **Employee Management System — $800** — document storage with expiration, certifications & training, GPS clock-in/out, ESIGN/UETA-compliant onboarding, supervisor inspections, raise/promotion workflow, time-off requests, Gusto integration
- `[Sold separately]` **Field Ops — $600** — digital cleaning checklists, before/after photos, offline capability, job completion verification (checklist + photos + GPS)

---

# Stretch / unsold (not in any package)

These came up in the Rainier questionnaire but weren't in the scope email. Not promised, not sold. Don't build.

- 7-day sales sequence automation (would be a future "Sales Automation" add-on)
- Quotes / Estimates module (Rainier said quoting is "gut-call")
- Generic client-onboarding workflow with department handoffs
- Lifecycle email engine (welcome / first-clean recap)
- Operational KPI cards (missed cleans / labor / complaints) — *unless rolled into Core dashboard for Rainier*
