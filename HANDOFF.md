# Rainier Facility Solutions — Deployment Handoff

**Last session end (2026-05-06):** Contacts CSV import overhaul — GHL-style, contacts-only.

The Accounts CSV import path was dropped entirely; in GHL accounts derive from contacts, so the modal now lives only on the Contacts tab. Row validation relaxed from "email required" to "any one of email / phone / firstName / lastName / company" — phone-only and name-only contacts now land. Email is still the dedup key; rows without email surface a `No email — dedup skipped` note in the preview so the tradeoff is explicit. Unknown company names auto-create accounts during import (case-insensitive match against existing clients, batch-deduped so the same company across 50 rows produces one account, not 50). New "Download sample CSV ↓" link in the upload step ships an 8-column template with three example rows demonstrating the variety. Reducer `ADD_CONTACT` was the load-bearing change: it used to silently swallow email-less dispatches; uniqueness check now scopes to rows that have an email. Single-add (AddContactModal) still requires email at the form layer — only CSV bulk-import is lenient.

Files: `app/src/lib/csv.js`, `app/src/components/CsvImportModal.jsx`, `app/src/pages/Clients.jsx`, `app/src/store/reducer.js`. Two commits on main: `343938f` (reducer guard relaxation) → `b323531` (CSV overhaul). Storage key unchanged (`pp.store.v26`) — schema shape didn't change, just the validation invariant.

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

Storage key: `pp.store.v26` / seed version 26. Default user is Kyle Boyden (Super Admin). Switch via the user chip in the sidebar footer.

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
