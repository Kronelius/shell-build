# Rainier Facility Solutions — Deployment Handoff

**Last session end (2026-05-07):** Notifications follow-ups — persistent in-app notifications inbox + bell, two-column Account layout with Mobile Push moved to left, mobile-push pref defaulted on. Storage v28 → v29.

Builds on the same-day notifications redesign (v27 → v28). The headline addition: a real **persistent notifications inbox** (`state.notifications`) backed by a bell icon visible on every page. The tab title now mirrors the bell badge — both read from the same unread count. Toasts still fire transiently for the same events; they're no longer the only delivery surface.

**State (v28 → v29, additive):**
- `state.notifications: []` — top-level array of `{ id, userId, eventKey, title, body, url, createdAt, readAt }`. Per-user, capped at 200 entries per user (oldest fall off when the listener pushes the 201st). Bell shows the most recent 50 by default.
- Migration `migrateV28toV29` slots in an empty array on existing states.
- `STORAGE_KEY` `pp.store.v28` → `pp.store.v29`.

**Reducer:** new actions `ADD_NOTIFICATION`, `MARK_NOTIFICATION_READ`, `MARK_ALL_NOTIFICATIONS_READ`, `CLEAR_NOTIFICATIONS`. ADD_NOTIFICATION enforces the per-user cap.

**Selectors:** `selectNotificationsForUser(s, userId, limit?)` (newest-first, optional limit), `selectUnreadNotificationCount(s, userId)`.

**Listener (`components/NotificationListener.jsx`):** now dispatches `ADD_NOTIFICATION` for every event the user has the toggle on for AND has visibility for, in addition to firing the toast. The tab title is driven by `selectUnreadNotificationCount` — bell badge and tab badge always agree.

**Bell + panel (`components/NotificationsBell.jsx`):** persistent button mounted twice in `AppLayout.jsx` — once inside the existing `.mobile-header` (right side, replaces empty space) for mobile, once inside a fixed-position `.bell-floater` at top-right of the viewport for desktop. CSS hides the desktop floater below the 640px breakpoint where the mobile-header takes over. The dropdown panel is anchored to the bell, 360px wide on desktop and `calc(100vw - 24px)` on mobile, max-height 70vh with internal scroll. Each row: title (bold) + 2-line body preview + relative time. Click → `MARK_NOTIFICATION_READ` + `navigate(url, { state: nav })` (referrer-aware, per project rule). "Mark all read" link in the panel head clears unread for the user. Click-outside (mousedown) and `Esc` close the panel; route changes also auto-close.

**Account → Notifications layout (this session):**
- Two-column `.account-grid` (1fr 1fr, gap 16, collapses to 1 column at 900px).
- **Left column** (`.account-col`, vertical flex): profile form on top, MobilePushCard underneath as its own `.card.detail-card` (was previously nested inside the notifications card on the right — moved per UX feedback that height mismatch made the layout look lopsided).
- **Right column**: notifications card with grouped event toggles only.
- Heights now balance ~647px / ~636px = 1.02 ratio at desktop.

**Mobile push pref:** default flipped from `false` to `true` per user direction ("ALWAYS BE ON FOR ALL"). The pref is intent ("do you want push on devices where you're subscribed?") — separate from per-device subscription state, which still requires explicit browser permission per device. The MobilePushCard now distinguishes the two: when pref=true but the device isn't subscribed yet (no PushSubscription), a "Subscribe this device" CTA appears below the toggle. When subscribed, the test-push button + per-device list show. iOS-not-installed-as-PWA and `Notification.permission === 'denied'` each render their own contextual copy.

**Push adapter:** added `isCurrentDeviceSubscribed()` mode-aware helper — checks the in-memory stub in stub mode, the real PushSubscription in hosted mode. Used by MobilePushCard to render the right state without reading internal stub variables.

**Files touched this session:**
- `app/src/data/seed.js` — `notifications: []` slot, version 28 → 29, `mobilePushEnabled` default true
- `app/src/store/persist.js` — `STORAGE_KEY` v28 → v29, `migrateV28toV29`, chains updated, default prefs now have `mobilePushEnabled: true`
- `app/src/store/reducer.js` — 4 new notification actions
- `app/src/store/selectors.js` — 2 new notification selectors
- `app/src/components/NotificationListener.jsx` — dispatches `ADD_NOTIFICATION`; tab title sourced from `selectUnreadNotificationCount`
- `app/src/components/NotificationsBell.jsx` (new) — bell button + dropdown panel
- `app/src/layouts/AppLayout.jsx` — mounts NotificationsBell twice (mobile-header + .bell-floater)
- `app/src/lib/push.js` — `isCurrentDeviceSubscribed()` helper
- `app/src/pages/settings/Account.jsx` — `.account-grid` with `.account-col` flex container; MobilePushCard moved to left column under profile; new state-based copy for the push card; "Subscribe this device" CTA when pref=on but not subscribed
- `app/src/index.css` — `.bell-*` styles (button, badge, panel, list, items, dot, link), `.bell-floater` fixed positioning, `.account-col` flex wrapper, mobile-header bell theming

**Verification:**
- `npm --prefix app run build` clean (682.03 kB / 181.96 kB gzip).
- v29 migration / fresh seed: `notifications: []`, all users get `notificationPrefs.mobilePushEnabled: true`.
- Bell renders top-right of viewport on desktop, inside mobile-header on mobile (320 / 375 / 1280 all checked).
- Empty state shows "You're all caught up." Seeded 3 test notifications via direct localStorage write + reload: badge shows `2` (one was pre-marked read), panel renders all 3 in correct chronological order with right unread/read styling, time-ago labels work ("just now" / "1h ago" / "1d ago").
- "Mark all read" clears badge + tab title; click-outside (mousedown) closes panel; `Esc` closes; route changes auto-close.
- Item click navigates to `/invoices` AND marks notification read AND resets tab title.
- Account layout heights at 1280×800: left col 647px, right col 636px, both tops aligned. At 320px / 375px viewport: collapses cleanly to single column, no horizontal overflow.

**Open / next session:** Backend `/api/push/*` routes still need to land in the deployment companion before stub mode can be turned off in prod. With the bell now persisted, the next obvious extension is server-pushed notifications: when the backend forwards a push event, the user's open browser session(s) should also receive an `ADD_NOTIFICATION` dispatch. Today, only client-side state changes feed the listener.

---

## 2026-05-07 (earlier) — Notifications redesign — deleted /settings/notifications, added per-user toggles, shipped PWA + Web Push.

The previous "Reminders" settings page was removed entirely (templates editor, sequence enable/disable, delivery inbox — all gone). Operators don't need to manage reminder templates or audit deliveries; the scheduler keeps firing customer-facing reminders in the background, failures fail silently. The Notifications surface is now a per-user, role-aware toggle list co-located inside Account → Notifications, and a Mobile Push card next to it that drives Web Push subscription on the current device.

**State (v27 → v28, additive):**
- `users[i].notificationPrefs` on every user — per-event toggles (`newCustomerMessage`, `newDM`, `newInternalMessage`, `jobCreatedOrRescheduled`, `jobCancelled`, `invoicePaid`, `invoiceOverdue`) plus a `mobilePushEnabled` master flag. Defaults: all event toggles on, mobile push off.
- Migration `migrateV27toV28` backfills `notificationPrefs` on existing users (merges with any pre-seeded fixture).
- `STORAGE_KEY` `pp.store.v27` → `pp.store.v28`.

**Reducer:** new `UPDATE_NOTIFICATION_PREFS` action (`{ userId, patch }`).

**Selectors:** `selectNotificationPrefs(s, userId)`, `selectVisibleNotificationGroups(s, userId)`, `selectShouldNotifyUser(s, userId, eventKey)`. `selectUnreadForConversation` now respects `mutedByUserIds` for ALL channels (sms/email/internal/dm) — previously only DMs checked muting (and even there, the existing handling was incidental). Muting a thread silences both the unread badge AND the in-app listener.

**Catalog (`app/src/lib/notifications.js`):** single source of truth for the toggle list, role allowlists, and permission gates. Crew see Schedule + DMs/internal-message only. Owner/Admin see everything subject to permission gates (invoice toggles require `invoices.view`).

**UI:**
- `app/src/pages/settings/Account.jsx` — added a Notifications section: grouped toggle list (Messaging / Schedule / Invoices) with `pref-row` styling, plus a `MobilePushCard` subcomponent at the bottom. The card detects iOS-not-installed-as-PWA + shows install instructions, surfaces stub-mode notice when push backend isn't wired, lists per-device subscriptions with Remove buttons, and includes a "Send test push" affordance.
- `app/src/pages/settings/SettingsLayout.jsx` — Notifications pill + reminder badge wiring removed.
- `app/src/App.jsx` — `/settings/notifications` route redirects to `/settings/account`; `/reminders` redirects to `/`. Notifications page import + `SettingsNotifications` component removed.
- `app/src/index.css` — added `.pref-row*`, `.push-card*`, `.push-device-*` styles.

**In-app delivery:**
- `app/src/components/NotificationListener.jsx` (new) — root-mounted alongside `<ReminderScheduler>`. Subscribes to relevant store deltas (new messages, new/rescheduled/cancelled jobs assigned to the current user, invoice status transitions to paid/overdue). For each event: looks up the receiving user's `notificationPrefs`, checks role/permission visibility, checks mute, then fires `toast.info()` + updates `document.title` to `(N) Rainier CRM`. First-mount guard seeds the "seen" sets so existing state doesn't fire a flood.
- `app/src/lib/documentTitle.js` (new) — small helper for tab title management. Idle = base title; unread = `(N) <base>`.

**PWA install:**
- `app/public/manifest.json` (new) — name "Rainier Facility Solutions", short_name "Rainier", `display: standalone`, brand `#212269` theme + background, icons array.
- `app/public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (new) — generated from `rainier-facilities-logo.png` via `app/scripts/gen-pwa-icons.mjs` (one-shot Node + sharp). Re-run the script when the logo or brand color changes.
- `app/index.html` — added `<link rel="manifest">`, `<meta name="theme-color">`, `<link rel="apple-touch-icon">`, iOS PWA meta tags (`apple-mobile-web-app-*`).
- `app/package.json` — `sharp` added as devDep (used only by the icon generator script; not imported by the app bundle).

**Service worker:**
- `app/public/sw.js` (new) — hand-rolled, no Workbox. Handles `push` (parses `{ title, body, url, tag }` payload, calls `showNotification`) and `notificationclick` (focuses existing client + navigates, or opens new). No offline caching.
- `app/src/main.jsx` — registers `/sw.js` with scope `/` on `load`, gated on `'serviceWorker' in navigator`.

**Push adapter:**
- `app/src/lib/push.js` (new) — mirrors `lib/twilio.js` / `lib/email.js` adapter pattern. Exports: `enableMobilePush`, `disableMobilePush`, `getCurrentSubscription`, `getDevices`, `removeDevice`, `sendTestPush`, `urlBase64ToUint8Array`, `isPushSupported`, `isStandalonePWA`, `isIOS`, `isPushAvailable`, `PUSH_BACKEND_URL`. Branches on `VITE_PUSH_BACKEND_URL`; stub mode keeps an in-memory subscription list and fires a local Notification for the test-push path so the dev experience exercises the full UI without a backend.

**Env (`app/.env.example`):**
- `VITE_PUSH_BACKEND_URL` — points at deployment companion's `/api/push/*` routes.
- `VITE_VAPID_PUBLIC_KEY` — Web Push VAPID public key (safe in frontend bundle).
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — backend env (private key NEVER reaches the client). Generate keypair via `npx web-push generate-vapid-keys`.

**Backend contract (deployment companion repo, NOT in this repo):**
- `POST /api/push/subscribe` — `{ userId, subscription, deviceLabel }` → upsert in `push_subscriptions` table keyed by `(userId, endpoint)`. Returns `{ ok, subscriptionId }`.
- `DELETE /api/push/subscribe` — `{ userId, endpoint }` → drop row.
- `GET /api/push/devices?userId=` → list for per-device UI: `[{ subscriptionId, deviceLabel, endpointMasked, lastSeenAt }]`.
- `POST /api/push/test` → `{ delivered, failed, expired }`. Server-side fans out a canned payload to all of the user's subscriptions.
- Push fan-out service called from existing event sources (Twilio webhook, email inbound, scheduled reminders, etc.) using the `web-push` Node library + VAPID. Looks up `notificationPrefs.mobilePushEnabled` AND the per-event toggle before sending. 410 Gone responses delete dead subscriptions.

**Removed:**
- `app/src/pages/settings/Notifications.jsx` (deleted, 467 lines) — templates editor + sequence + delivery inbox.

**Verification:**
- `npm --prefix app run build` clean (677.86 kB / 180.98 kB gzip).
- Mobile responsive pass at 320×568, 375×812, 641×800: all viewports clean (no horizontal scroll, all toggle rows + mobile push card render within bounds).
- Service worker registers on `/` scope; tab title shows `(N) Rainier CRM` reflecting unread count from initial seed.
- `/settings/notifications` correctly redirects to `/settings/account`; `/reminders` redirects to `/`.
- Toggle round-trip: clicking a `.pref-row .toggle` updates `notificationPrefs[key]` in localStorage; reload preserves the value.
- Fresh reseed at v28 produces the right `notificationPrefs` shape (no leftover `conversationAssigned` from earlier drafts).

**Open / next session:** Backend `/api/push/*` routes need to land in the deployment companion before stub mode can be turned off in prod. After that, real-world verification of iOS Safari 16.4+ end-to-end (install PWA → grant permission → subscribe → trigger from backend → notification fires with app closed) is the ship-blocker for the mobile push promise.

---

## 2026-05-06 — Email System — full Phase 1–4 frontend build (Resend + Connected Inboxes + Messaging email channel)

Wired the complete email surface that was previously stub-only. Two distinct layers ship together: **system transactional** (Resend, app-owned subdomain — invitations, reminders, billing) and **per-user conversational** (Connected Inboxes — Gmail OAuth, Microsoft 365 OAuth, SMTP/IMAP — sent FROM each employee's real address inside Messaging). Marketing/drip is explicitly out of scope and called out in copy as living in higher-tier add-ons.

**State changes (v26 → v27):**
- `company.integrations.email` slot mirroring `…twilio` — `{ connected, provider, apiKeyLast4, verifiedDomain, defaultFrom, defaultReplyTo, connectedAt, lastVerifiedAt, lastError, domain: { status, dkimRecords[], spfStatus, dmarcStatus, lastCheckedAt, failureReason } }`.
- `connectedInboxes: []` — per-user mailbox connections. Each row: `{ id, userId, provider, email, displayName, status, isDefault, smtpHost?/Port?/Security?, imapHost?/Port?/Security?, inboundCapability, inboundEnabled }`. **Tokens + SMTP passwords NEVER live in client state** — backend holds them encrypted at rest.
- v27 migration is purely additive — slots in defaults where missing.

**Reducer (`reducer.js`):** new ACTIONS `CONNECT_EMAIL_PROVIDER`, `DISCONNECT_EMAIL_PROVIDER`, `UPDATE_EMAIL_DOMAIN_STATUS`, `UPDATE_EMAIL_DEFAULT_FROM`, `UPDATE_EMAIL_ERROR`, `ADD_CONNECTED_INBOX`, `UPDATE_CONNECTED_INBOX`, `REMOVE_CONNECTED_INBOX`, `SET_DEFAULT_CONNECTED_INBOX`, `RECEIVE_EMAIL`. `SET_MESSAGE_DELIVERY` extended to carry `emailMessageId`.

**Selectors (`selectors.js`):** `selectEmailIntegration`, `selectEmailConnected`, `selectEmailVerifiedDomain`, `selectEmailDefaultFrom` (falls back to `company.email` so dev/stub mode keeps working), `selectEmailDefaultReplyTo`, `selectIsEmailSendReady`, `selectEmailBlockers`, `selectConnectedInboxes`, `selectConnectedInboxById`, `selectConnectedInboxesForUser`, `selectDefaultConnectedInbox`, `selectUserHasActiveInbox`, `selectMessagingEmailBlockersForUser`.

**Frontend adapters:**
- `lib/email.js` — `sendEmail({ to, from, subject, body, replyTo, headers, tags })` extended with `headers` + `tags` (backwards compatible). New `getEmailHealth()` for domain status polling. New `simulateInboundEmail()` dev helper.
- `lib/connectedInboxes.js` (new) — `connectGoogle()`, `connectMicrosoft()`, `connectSmtp()`, `disconnectInbox()`, `testInboxSend()`, `sendViaInbox()`. Stub mode simulates the full handshake/send shape. OAuth popup helper handles `postMessage`-back protocol.

**UI surfaces shipped:**
- **Settings → Integrations** — added Resend section (Connection card, Domain Verification card with copyable DKIM rows + status polling, blocker banner, Test Email card). `ConnectEmailProviderModal` mirrors `ConnectTwilioModal`.
- **Settings → Connected Inboxes** (new page at `/settings/inboxes`, gated on `messaging.use`) — empty-state + connected-mailbox rows with provider chip, status badge, Default toggle, Test send (inline form), Disconnect (with confirm).
- **`ConnectInboxModal`** (new) — provider tiles (Gmail/Microsoft/SMTP) with collapsible per-ESP help panels: Gmail Workspace admin guidance, Microsoft tenant consent, Yahoo/iCloud/Fastmail/Zoho app-password setup, custom-domain SMTP guidance, plus a troubleshooting table on failure (auth/connection/timeout/TLS/less-secure-apps).
- **Messaging compose pane** — segmented `SMS | Email` channel toggle (renders only when contact has both phone + email; disabled buttons explain why); Email channel reveals Subject + "Sending as" inbox dropdown; auto-prefills `Re: <subject>` on replies; inline "Connect your inbox" CTA when no active connection. Toggling channel auto-creates / navigates to the contact's other-channel thread (preserves the existing per-channel-conversation schema).
- **`Messaging.handleSend`** — branches on channel: SMS via `sendSMS()` (existing), Email via `sendViaInbox(inboxId, …)` with `Message-ID` / `In-Reply-To` / `References` headers built from prior messages so Gmail/Outlook group correctly. Per-conversation `Reply-To: reply+<convId>@inbound.<verified-domain>` only when the inbox has inbound capture enabled (Phase 4c).
- **`RECEIVE_EMAIL` reducer action** — mirrors `RECEIVE_SMS`. Threads inbound by `In-Reply-To → priorMessage.emailHeaders.messageId` first, falls back to from-email contact match, finally creates an unlinked thread.
- **Settings → Notifications** — boundary banner explicitly distinguishes system reminder sender (Resend default From) from per-user Messaging sends (Connected Inbox).
- **`.env.example`** (new at `app/`) — documents `VITE_EMAIL_BACKEND_URL`, `RESEND_*`, Google/Microsoft OAuth client IDs, `INBOX_TOKEN_ENCRYPTION_KEY`, etc. Frontend env vs backend env clearly partitioned.

**What's NOT in this repo (deployment companion responsibility):**
- `app/api/email/{send,health,inbound}.js` — Resend wrapper + Resend Inbound webhook handler.
- `app/api/inbox/connect/{google,microsoft,smtp}.js` — OAuth flows + SMTP handshake.
- `app/api/inbox/[id]/{send,test,disconnect}.js` — per-user routes.
- `app/api/inbox/webhook/{google,microsoft}.js` + `imap-poll.js` — inbound capture (Gmail Pub/Sub / Graph webhooks / IMAP poll).

The frontend adapters all fall into local stub mode when `VITE_EMAIL_BACKEND_URL` is unset, so the full UX is exercisable end-to-end without the backend wired.

**Mobile-responsive verification (per CLAUDE.md):** ran the full pass at 320×568 / 375×812 / 641×800. All touched surfaces — `/settings/integrations`, `/settings/inboxes`, `ConnectInboxModal` (step 1 tiles + step 2 SMTP form), `/settings/notifications` boundary banner, Messaging compose pane (toggle + Subject + Sending-as) — render with zero horizontal scroll at every viewport. ConnectInboxModal SMTP step (9 inputs × 4 form rows) fits at 320 with no row overflow. Verified via `preview_eval` DOM-rect assertions; the `preview_screenshot` tool was timing out so visual confirmation is by element-bounds checks rather than image inspection.

**Build:** `npm --prefix app run build` clean; bundle 674.65 kB / 179.44 kB gzip (up ~50 kB from baseline for the new flows). No new lint errors introduced (existing pre-v15 migration unused-var warnings unchanged).

Files touched this session:
- `app/src/lib/email.js` (extended)
- `app/src/lib/connectedInboxes.js` (new)
- `app/src/data/seed.js` (`email` slot under `integrations`, `connectedInboxes: []`, version → 27)
- `app/src/store/persist.js` (STORAGE_KEY → `pp.store.v27`, `migrateV26toV27`, `DEFAULT_EMAIL_INTEGRATION` constant)
- `app/src/store/reducer.js` (5 email-provider actions + 4 inbox actions + `RECEIVE_EMAIL` + `SET_MESSAGE_DELIVERY` extension)
- `app/src/store/selectors.js` (12 new selectors)
- `app/src/components/AddUserModal.jsx` (uses `selectEmailDefaultFrom`)
- `app/src/components/ConnectEmailProviderModal.jsx` (new)
- `app/src/components/ConnectInboxModal.jsx` (new — provider tiles + per-ESP help + troubleshooting table)
- `app/src/components/ConversationMessagePanel.jsx` (channel toggle + Subject + Sending-as + email-block gate)
- `app/src/pages/settings/Integrations.jsx` (Resend section: Connection + Domain Verification + Test Email + blockers banner)
- `app/src/pages/settings/ConnectedInboxes.jsx` (new — per-user inbox list + test-send + disconnect)
- `app/src/pages/settings/Notifications.jsx` (boundary banner)
- `app/src/pages/settings/SettingsLayout.jsx` (added "Connected Inboxes" pill)
- `app/src/pages/Messaging.jsx` (email branch in `handleSend` + `handleSwitchChannel` + new selectors imported + new props passed to panel)
- `app/src/App.jsx` (route `/settings/inboxes`)
- `app/.env.example` (new — documents the full env surface)

**Open / next session:** all four phases shipped; commit when ready (suggest splitting by phase). Backend API routes (`app/api/*`) need to land in the deployment companion before stub mode can be turned off in prod. After that, real-world verification of OAuth round-trips (Google + Microsoft) requires hosting + DNS + provider client-IDs configured.

---

## Prior session (2026-05-06) — Contacts CSV import overhaul

The Accounts CSV import path was dropped entirely; in GHL accounts derive from contacts, so the modal now lives only on the Contacts tab. Row validation relaxed from "email required" to "any one of email / phone / firstName / lastName / company" — phone-only and name-only contacts now land. Email is still the dedup key; rows without email surface a `No email — dedup skipped` note in the preview so the tradeoff is explicit. Unknown company names auto-create accounts during import (case-insensitive match against existing clients, batch-deduped so the same company across 50 rows produces one account, not 50). New "Download sample CSV ↓" link in the upload step ships an 8-column template with three example rows demonstrating the variety. Reducer `ADD_CONTACT` was the load-bearing change: it used to silently swallow email-less dispatches; uniqueness check now scopes to rows that have an email. Single-add (AddContactModal) still requires email at the form layer — only CSV bulk-import is lenient.

Files: `app/src/lib/csv.js`, `app/src/components/CsvImportModal.jsx`, `app/src/pages/Clients.jsx`, `app/src/store/reducer.js`. Two commits on main: `343938f` (reducer guard relaxation) → `b323531` (CSV overhaul). Storage key was `pp.store.v26` at that point (now `v27` after this session's migration).

---

## Earlier on 2026-05-06 — Internal Chat creation, archive removal, mobile polish

Three changes shipped earlier today:

1. **Internal Chat got a real creation flow.** Previously the four seeded internal threads were the *only* internal threads — there was no UI to create a new one. Added a "+ New thread" CTA pinned to the top of the thread list panel, visible only on the Internal Chat tab and gated by a new `messaging.startInternalThread` permission (owner / admin defaults). Modal asks for a title + optional first message, dispatches `ADD_INTERNAL_CONVERSATION`, navigates to the new thread. Public-by-default visibility — every staff member sees every internal thread (the prior `crewCanSee` gate was dropped for `channel: 'internal'`).
2. **Archive concept removed app-wide; only deletion exists now.** Conversations, contacts, and accounts are hard-deleted with cascade rules: deleting a conversation cascades to its messages; deleting a contact nulls `conversation.contactId` so threads survive as "Unlinked"; deleting an account cascades to its contacts (and their conversations follow the contact rule), sites, jobs, invoices, and activities. The Internal Chat bulk action bar now shows exactly **Mark read** (blue pill), **Mark unread** (blue pill), **Delete** (red pill) — no Assign for internal. Inbox keeps Assign + the same three pill buttons; DMs keep no bulk select. The Delete button on the message panel header replaces Archive (red, with confirm dialog).
3. **Messaging mobile styling fixed.** The 3-pane → single-pane collapse already worked at 768px via `.has-active` modifier and the back-button plumbing, but no rules existed below 768px to handle iPhone-class viewports. Added a `@media (max-width: 640px)` tier in `app/src/index.css` that (a) stacks the messaging-header into two rows — equal-flex inbox tabs above, full-width Filters + New-conversation buttons below, (b) makes the message-pane-head flex-wrap so the title gets a full row and the action row drops below in icon-only form (Delete collapses via `font-size: 0`), (c) repositions the filters popover as a compact dropdown anchored to the Filters button (replaces an earlier bottom-sheet attempt that visually competed with the search bar) and trims it to the high-signal axes only — Channels / Status / Pinned only — hiding Tags / Assignee / Date range / Combine logic on mobile, (d) lets the bulk action bar wrap left-aligned. Tab padding tightened to `6px 4px` so "Internal Chat" fits without truncation at the 320px floor. Verified at 320 / 375 / 414 / 640 / 641 — zero horizontal scroll at every viewport. **Storage bumped `pp.store.v20 → v21`** with a migrator that purges archived records, strips the `archived` field from surviving conversations, and reconciles `state.permissions` against the live PERMISSIONS schema (adds new keys, renames `clients.archive` → `clients.delete` carrying over its role list, drops dead keys).
4. **Mobile sidebar drawer + header polish.** Two further mobile fixes after the messaging pass:
   - **Sidebar drawer Dashboard clipping fixed.** The mobile sidebar (`@media (max-width: 640px)` in `index.css:794`) had `padding-top: 52px` against a 56px-tall fixed `.mobile-header`, so the first nav button (Dashboard) sat 3px under the header. Bumped to `padding-top: 64px` for clean breathing room (9px gap above the first nav).
   - **Mobile header gradient.** Replaced the flat `--color-neutral-900` background on `.mobile-header` with a brand-colored 120° gradient (`primary-700 → primary-500 @ 35% → primary-400`) wired through a new `--mobile-header-grad` token in `theme-rainier.css`. Subtle inset highlight + colored shadow round it out. Uses the same brand-blue palette as the sidebar so the two surfaces feel like one when the drawer is open. Falls back to `--mobile-header-bg` if a future theme doesn't define the gradient.

**Earlier this engagement:** User-to-user DMs shipped on the Messaging suite (third inbox bucket, 1:1 staff direct messaging, privacy gated to participants for ALL roles). Theme + seed swap shipped (PolishPoint Blue across every component, Rainier-flavored seed data).

The repo is **ready for the next per-client config pass** (logo wiring, labor-focused dashboard cards, CSV migration, Twilio provisioning).

Source of truth for what's in scope: [`RAINIER_SCOPE.md`](RAINIER_SCOPE.md). Read it first.

---

## What shipped this session — DMs

### 1. New schema (additive)
- `conversations`: new `channel: 'dm'` value (joins existing `'sms' | 'email' | 'internal'`).
- `conversations`: new `participantUserIds: [userIdA, userIdB]` field — sorted ascending, length always 2. Only set on DM conversations.
- `messages`: shape unchanged. DM messages use `direction: 'internal'` with `authorUserId` set to the sender.

### 2. Reducer ([app/src/store/reducer.js](app/src/store/reducer.js))
- New action `ADD_DM_CONVERSATION` with payload `{ id?, participantUserIds: [a, b] }`. Sorts the pair, rejects self-DMs, dedups against an existing non-archived DM with the same pair, and accepts an optional `id` so callers can navigate deterministically.
- `MARK_CONVERSATION_READ` / `MARK_CONVERSATION_UNREAD` now accept an optional `currentUserId` and switch predicate when the conversation is a DM: "unread for me" = messages authored by the *other* participant. Existing sms/email/internal behavior unchanged. Bulk variants follow the same logic.

### 3. Selectors ([app/src/store/selectors.js](app/src/store/selectors.js))
- `selectConversationsForInbox` extended with an `inbox === 'dm'` branch — filters `channel === 'dm'` AND `participantUserIds` includes the current user. **The participant filter IS the privacy gate** and applies to every role; owners and admins do NOT see DMs they aren't party to.
- New `selectDmConversationBetween(s, userIdA, userIdB)` — used by the New-DM flow for dedup before dispatch.
- New `selectOtherParticipant(s, conv, currentUserId)` — used by thread list (other-participant name + avatar) and context panel.
- `selectUnreadForConversation` made DM-aware (counts messages where `authorUserId !== currentUserId && !readAt` for DMs).

### 4. Storage migration v19 → v20
- [app/src/store/persist.js](app/src/store/persist.js): `STORAGE_KEY` `'pp.store.v19'` → `'pp.store.v20'`. New `migrateV19toV20()` is additive (no data backfill — DMs are a new channel + new field). Existing chains terminate at the new migrator: v17 → v18 → v19 → v20, v18 → v19 → v20, v19 → v20.
- [app/src/data/seed.js](app/src/data/seed.js): `INITIAL_STATE.version` `19` → `20`. Plus one seeded DM thread between Heather and Lauren (with 3 messages — last one unread on Heather's side) so the demo is non-empty on first load.

### 5. UI
- [app/src/components/MessagingHeader.jsx](app/src/components/MessagingHeader.jsx) — third inbox toggle "DMs". When DMs is the active inbox, the header swaps "New conversation" for "New DM". The filter "Channels" chip group also gained a `dm` chip so users can filter the broader inbox by channel if they ever want a global view.
- [app/src/components/NewDmModal.jsx](app/src/components/NewDmModal.jsx) — **NEW.** Modal that lists active users (excludes self), supports search-by-name-or-email, dedups via `selectDmConversationBetween` before dispatch, and navigates to the thread (existing or new) on pick.
- [app/src/components/ConversationThreadList.jsx](app/src/components/ConversationThreadList.jsx) — DM rows render with the *other* participant's name + Avatar (computed via `selectOtherParticipant`). The bulk-action checkbox column and select-all are hidden in the DMs bucket; the BulkActionBar never shows for DMs (assignment/snooze concepts don't apply). DM message preview drops the `[Internal]` prefix (DMs are inherently private — double-labeling was noise).
- [app/src/components/ConversationContextPanel.jsx](app/src/components/ConversationContextPanel.jsx) — new `DmContextPanel` shows the other participant's profile (name, role, email, phone, status) plus a Privacy callout. Replaces the contact/client/pipeline cards for DMs.
- [app/src/components/ConversationMessagePanel.jsx](app/src/components/ConversationMessagePanel.jsx) — DM threads render `DmBubble` (left/right by `authorUserId === currentUserId`). Snippet picker, Assign menu, and Follow toggle are hidden for DMs. Composer placeholder personalized: "Message {first name}…". Star + Archive remain.
- [app/src/components/ChannelBadge.jsx](app/src/components/ChannelBadge.jsx) — added `dm` variant ("DM" label, blue badge).
- [app/src/pages/Messaging.jsx](app/src/pages/Messaging.jsx) — `visibleInboxes` now includes `dm` for both the canViewExternalInbox and crew-only paths (DMs are accessible to all roles per user request). Reads `?inbox=` query param on mount so deep-links from "New DM" land on the DMs tab. Sends from a DM thread set `direction: 'internal'`. `MARK_CONVERSATION_READ` is dispatched with `currentUserId` so the new DM read-tracking branch fires correctly.
- [app/src/index.css](app/src/index.css) — minimal `.dm-picker-list` / `.dm-picker-row` styles for the New-DM modal.

### 6. Permissions — no schema change
Per the user's clarification, DMs are gated on the existing `messaging.use` permission. No new permission key was added. `messaging.startConversation` (which gates external SMS/Email outreach for cost/brand-voice reasons) intentionally does NOT gate DMs — internal staff comms have no such concern.

### 7. Verified end-to-end
Used the preview tools from a fresh v20 reseed:
- DMs tab + "New DM" button visible to all roles.
- Heather sees the seeded Heather↔Lauren DM with "Lauren Park" as the row name + 1-unread badge; opening it clears the badge; sending a reply appears as outgoing.
- Lauren switched in: row name becomes "Heather Cole", row + tab show 1 unread badge for Heather's reply.
- Kyle (owner, not a participant) sees zero DMs — privacy gate verified for owner role.
- "New DM" picker excludes the current user. Picking a brand-new teammate creates a thread; picking the same teammate again from a fresh modal routes to the existing thread (no duplicate).
- v19 → v20 migration: synthesized v19 blob, reload → v20 key written, version 20, DMs preserved.
- Inbox + Internal Chat regression-checked: 9 external threads + 4 internal threads still render correctly with no DM bleed-through.

---

## What shipped in the prior clone session

### 1. Theme application — every-component-themed
Per the contract in [shell `app/src/STYLING.md`](app/src/STYLING.md). Touched [`app/src/index.css`](app/src/index.css) end-to-end so every component reads the recipes in [`app/src/theme-polishpoint-blue.css`](app/src/theme-polishpoint-blue.css):

- **Body** — aurora radial-gradient layers + fixed bg attachment + body::before aurora
- **Sidebar** — white→light-blue→primary gradient, soft-shadow edge notch, RTL-flipped scrollbar
- **Nav buttons** — SVG-mask triangle pill extending past sidebar's right edge, hover/active gradients with drop-shadow filter
- **Cards / detail-cards** — primary-bg→white gradient + triple-layer shadow (white inset highlight + colored ring + outer blue glow)
- **Buttons** — `.btn-primary` gradient + glow ring; `.btn-secondary` neumorphic two-direction shadow; `.btn-danger` red gradient + red glow
- **Badges** (green/amber/red/blue/purple/slate) — gradient + matching colored shadow
- **Inputs** — gradient borders via `linear-gradient + padding-box/border-box`, focus shifts to richer gradient + colored glow
- **Tables** — gradient blue header + alternating striped rows, **rounded corners on `.table-wrap`** (border + border-radius + overflow-y: hidden)
- **Tabs / dash-switcher / filter-chip / chip / segmented** — glass background (`backdrop-filter: blur`) + active blue gradient
- **Dashboard hero** — diagonal gradient + radial orb (top-right) + faint white orb (bottom-right) + colored glow shadow
- **Stat cards / pipeline cards / drip nodes / timeline cards / schedule blocks** — primary-soft→primary-bg gradient + colored ring + outer glow
- **Pipeline columns** — subtle blue tint, gradient stage count badges with shadows
- **Metric strip** — per-cell gradient (blue / purple / neutral) + 2px gradient top bar + neumorphic surface shadow
- **Mobile header / hamburger / modal / toast / notif-chip / settings nav / week-grid / month-grid** — all consume theme recipes
- **User-switcher chip** — glass-pill with backdrop-blur + colored border

### 2. Seed swap — Rainier-flavored demo data
[`app/src/data/seed.js`](app/src/data/seed.js) full rewrite (v10 → v11):

- **Company**: Rainier Facility Solutions, RFS logo, `office@rainierfs.com`, `(253) 555-0100`, Cascade Ave S Seattle WA address
- **Users** (per Q7, Q11, Q20):
  - Kyle Whitfield — Super Admin (default current user)
  - Steve Whitfield — Super Admin
  - Heather Cole — Admin
  - Lauren Park — Admin
  - Marcus Greene, Riley Diaz, Jamie Sato, Casey Vega — Crew
- **Services** (per Q23, three lines):
  - Commercial: Janitorial, Floor Care, Restroom Sanitation
  - Residential: Cleaning, Move-In/Out, Deep Clean
  - Specialized: Carpet & Upholstery, Window, Pressure Washing, Post-Construction
- **Pipeline stages** (per Q2, Q3 — mirrors GHL): Hot Lead → Drip Campaign → Walkthrough Scheduled → Quote Sent → Won / Lost
- **Lead-source tags** (per Q1): Referral, Call-In, Web Form, Email Campaign (plus VIP, Hot Lead, Net-30, Needs Quote, Commercial, Residential, Specialized, DND)
- **Reminder templates** (per Q10):
  - `welcome_email` — auto-sends on lifecycle change to "customer"
  - `post_service` rewritten as first-clean recap
  - `booking_confirmation`, `reminder_24h`, `day_of_eta` retained
- **Internal messaging channels** (per Q14, Q6): pinned `Time Off Requests` + `Accounting Handoffs` threads with seeded conversation starters
- **Demo accounts**: Evergreen Medical, Lakeside Office Park, Cascade Logistics, Mt. Baker HOA, Pacific Ridge, Olympic Senior Living, Salishan Townhomes (rebranded; replace via CSV import once Rainier's GHL contacts land)

### 3. Permission tightening — Q24 admin financial revoke
[`app/src/lib/roles.js`](app/src/lib/roles.js):

- `invoices.view`, `invoices.edit`, `invoices.recordPayment` → owner-only
- `reminders.view`, `reminders.edit` → owner-only
- Updated `admin` `ROLE_DESCRIPTIONS`: "Cannot see financials or assign roles."
- Heather/Lauren get specific grants via per-user override at `/settings/team/[user]` if/when needed.

### 4. Storage version bump
- `INITIAL_STATE.version`: 10 → 11
- `STORAGE_KEY`: `pp.store.v10` → `pp.store.v11`
- Existing dev caches force a fresh reseed on next load.

---

## Files touched this session

- `app/src/index.css` — comprehensive theme wire-up (every component → recipes); table border-radius on `.table-wrap`
- `app/src/theme-polishpoint-blue.css` — copied into `app/src/` (was at repo root) so it bundles with the app
- `app/src/data/seed.js` — full Rainier seed rewrite
- `app/src/lib/roles.js` — admin financial revoke + role description
- `app/src/store/persist.js` — STORAGE_KEY v10 → v11 with bump notes
- `app/.claude/launch.json` (parent's, not in repo) — `rainier-app` config on port 5175
- New top-level docs: `RAINIER_SCOPE.md` (the spec)
- This file (`HANDOFF.md`) replaced shell handoff with Rainier deployment context

---

## Running the app

```bash
npm --prefix app install
npm --prefix app run dev   # → http://localhost:5175 (or whatever Vite picks)
```

Storage key: `pp.store.v27` / seed version 27. Default user is Kyle Boyden (Super Admin). Switch via the user chip in the sidebar footer.

---

## Next-session pickup — what's left for Rainier

These are **per-client repo work**, all listed in [`RAINIER_SCOPE.md`](RAINIER_SCOPE.md) §3. Pick whichever the user prioritizes:

### 1. Logo wiring
- Place `Rainier-Facilities_logo.PNG` (already in `Clients\Rainier Facility Solutions\Rainier-Facilities_logo.PNG`) into `app/public/`.
- Update the brand component (sidebar logo) to render the image instead of the "RFS" initials text. The current sidebar logo CSS (`.sidebar-logo`) uses initials by default; either make the component conditional on `company.logoUrl`, or hard-code the img for Rainier.
- Update `seed.js` `company` to add `logoUrl: '/Rainier-Facilities_logo.PNG'`.

### 2. Labor-focused dashboard cards (Q17 / Q18)
Rainier wants on-load metrics: missed cleans, labor report, client complaints (Q17) plus revenue, open receivables, $ collected, outstanding quotes (Q18). The first three need new data plumbing:
- **Missed cleans**: jobs.status already supports `missed` (or a `missed_at` timestamp) — add a selector + a Dashboard card that surfaces past-week missed count + revenue impact.
- **Labor report**: needs a labor-hours model (currently no entity). Options: (a) compute from `jobs.endAt - jobs.startAt` × crew size as a proxy; (b) add a `timeEntries` entity. Confirm with client before building (b).
- **Client complaints**: needs a `complaints` entity (linked to client + job). Or repurpose `contactActivities` with a `kind: 'complaint'` filter and a complaint-tagged badge.
- **Revenue / open receivables / $ collected / outstanding quotes**: data already exists; add cards that surface them on the dashboard.

Note: AR aging / P&L / unpaid invoice sync (per Q22) is QuickBooks-add-on territory — **don't build until sold**.

### 3. CSV migration ($200 add-on)
Rainier's existing GoHighLevel contacts get imported via the shell's CSV import wizard at `/contacts` → "Import CSV". Run after they sign the migration add-on. Wizard handles dedup, field mapping, and batch dispatch.

### 4. Twilio + A2P 10DLC provisioning (per Q16)
- Provision the **employee line first** on a new Twilio number (Settings → Integrations → Connect Twilio).
- Customer line stays on GHL until later port. The shell's Twilio adapter (`lib/twilio.js`) is wired; just supply real credentials via `VITE_TWILIO_BACKEND_URL` + the backend env vars.
- Submit A2P 10DLC registration via Settings → Integrations → A2P registration modal once Rainier has their EIN + brand info ready.

### 5. GitHub remote setup (deployment milestone)
Currently the clone's `origin` points at `Kronelius/shell-build`. Per [shell `CLAUDE.md` deployment model](CLAUDE.md):
1. Create `RainierFacilitySolutions/app` repo under Rainier's GitHub credentials.
2. `git remote set-url origin https://github.com/RainierFacilitySolutions/app.git`
3. `git push -u origin main`
4. Add Kronelius as collaborator with admin/write access.

---

## Out of scope — push back if requested

Per `RAINIER_SCOPE.md` §5 and the user's explicit direction:

- **Key inventory / key toggle** — tabled as a future extra feature; not in this engagement
- **QuickBooks add-on** — not sold; per Q21 invoicing stays in QB; in-app dashboard widgets for AR/P&L/unpaid invoices need the QB integration sold first
- **Quotes / estimates** — Sales Automation add-on, not sold
- **7-day sales sequence automation** — Sales Automation add-on, not sold
- **Department-handoff onboarding workflow** — workflow add-on, not sold (manual logging only in Core)
- **Employee onboarding docs (handbook, I-9, W-4, SOPs)** — EMS $800, not sold
- **Hours worked / pay stubs / time-off as workflow** — EMS $800, not sold (time-off-as-channel above is the Core stand-in)
- **Field ops (checklists, photos, GPS)** — Field Ops $600, not sold
- **Stack consolidation (replace Swept, Gusto, GHL outright)** — multiple add-ons; not sold

---

## Patterns preserved from the shell

These are the load-bearing conventions inherited from the shell. Don't fork them — backport changes through PRs from `Kronelius/shell-build`:

- **Adapter pattern for external services**: `lib/twilio.js`, `lib/email.js` — env-var-branched stubs in dev, real backend in prod
- **Background scheduler dispatched at app root**: `ReminderScheduler.jsx`, `TwilioInboundListener.jsx`
- **Concrete instance expansion for recurring jobs**: don't virtualize — generate N real job records with shared `seriesId`
- **Conflict = warning, not hard block**: cleaning companies may intentionally double-book; amber warning, never gate submission
- **Atomic URL param updates**: build one `URLSearchParams`, call `setSearchParams` once; separate calls race
- **Storage-key bump on seed-shape change**: bump both `INITIAL_STATE.version` AND `STORAGE_KEY` in lockstep (currently **v20 / `pp.store.v20`**)
- **Permission gating**: `canEditAll || entity.ownerUserId === currentUser?.id`
- **Schema-key vs UI-label split**: keep schema keys stable (`owner`, `admin`, `crew`); render labels through `ROLE_LABELS` only
- **Design tokens — every-component-themed contract**: see [shell `app/src/STYLING.md`](app/src/STYLING.md). No bare flat colors anywhere. Every component reads the theme's recipes.
