# Rainier Facility Solutions — Deployment Handoff

**Last session end:** **Theme + seed swap shipped.** Cloned `Kronelius/shell-build@ba53172` into the Rainier app dir, applied PolishPoint Blue theme comprehensively (every component now consumes swatchboard recipes — sidebar gradient + edge notch + triangle nav indicator, body aurora, gradient cards/badges/buttons/inputs/tabs/hero/metric-strip/messaging/calendar, rounded-corner tables), then replaced the demo seed with Rainier-flavored data. Storage `pp.store.v10 → v11`.

The repo is **ready for the next per-client config pass** (logo wiring, labor-focused dashboard cards, CSV migration, Twilio provisioning).

Source of truth for what's in scope: [`RAINIER_SCOPE.md`](RAINIER_SCOPE.md). Read it first.

---

## What shipped in this clone session

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

Storage key: `pp.store.v11` / seed version 11. Default user is Kyle Whitfield (Super Admin). Switch via the user chip in the sidebar footer.

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
- **Storage-key bump on seed-shape change**: bump both `INITIAL_STATE.version` AND `STORAGE_KEY` in lockstep (currently **v11 / `pp.store.v11`**)
- **Permission gating**: `canEditAll || entity.ownerUserId === currentUser?.id`
- **Schema-key vs UI-label split**: keep schema keys stable (`owner`, `admin`, `crew`); render labels through `ROLE_LABELS` only
- **Design tokens — every-component-themed contract**: see [shell `app/src/STYLING.md`](app/src/STYLING.md). No bare flat colors anywhere. Every component reads the theme's recipes.
