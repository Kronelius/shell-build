# Rainier Facility Solutions — Scope of Work

**Source of truth:** the client questionnaire `Questionnaire 4.23.26.docx` (delivered by client, 2026-04-23).
**Package sold:** Core only — $1,000.
**Target repo:** `RainierFacilitySolutions/app` (clone of `Kronelius/shell-build`, baseline `ba53172`).

This doc is the bridge between the questionnaire answers and the shell. It tells anyone working on the Rainier clone exactly what Rainier requested, where each request lives in our package matrix, and what per-client work the Rainier repo owns.

---

## 1. Questionnaire answers (verbatim)

| # | Question | Rainier's answer |
|---|---|---|
| 1 | Lead sources | Referrals, call-ins, web form, email campaigns. |
| 2 | 7-day sales plan / GHL workflow | Yes, use the pre-existing sales plan. |
| 3 | Lead routing into pipeline buckets | Manually drop into the right bucket. Hot bucket vs drip campaign. |
| 4 | Where deals die | Lack of follow-up — things fall between the cracks. |
| 5 | Quote inputs | Gut-call. Some basic formula could be created later. |
| 6 | Quote-accepted automation | Client account created, scheduling notified, accounting notified, schedule final walk-through and key pickup. |
| 7 | Onboarding flow | Heather creates client account → Lauren scheduling → Heather notifies accounting → Kyle does walk-through and key pickup. |
| 8 | Onboarding documents | Signed contract, signed Scope of Work, keys, billing document. |
| 9 | Onboarding friction | None — currently manual; would be cool to automate. |
| 10 | Auto-sent communications | Welcome email, first-clean recap. |
| 11 | Hiring/onboarding owner + tools | Heather. Indeed → group Zoom interview → phone call → working interview → training. |
| 12 | Employee onboarding docs | Handbook, I-9, W-4, SOPs, training videos, FAQ. ("All of the above, I believe we have all of those.") |
| 13 | Cleaner-app surfaces | Schedule, messages, hours worked this week, keys checked out, time-off requests, pay stubs link, FAQ. ("Those are perfect!") |
| 14 | Time-off / call-out flow | Today: requested via Lauren or Heather. Wants: handled in a "channel" in the dashboard. |
| 15 | Key inventory | Current software is broken. Wants all keys in one platform; toggle keys between office and a cleaner. |
| 16 | Phone numbers | Both customer + employee lines on GHL. OK with main staying on GHL temporarily while employee line migrates first. |
| 17 | Top dashboard metrics | Labor-focused: missed cleans, labor report, client complaints. |
| 18 | Financial dashboard metrics | Revenue, open receivables, $ collected, outstanding quotes. |
| 19 | Operational metrics | (no explicit answer beyond Q17) |
| 20 | Per-role dashboards | Same visibility for now (Kyle / Steve / Heather / office admin). |
| 21 | Invoicing location | Revisit later — leave invoicing in QuickBooks for now. |
| 22 | QuickBooks data on dashboard | AR, P&L, unpaid invoices — all 3 would be great. |
| 23 | Stack to merge | GoHighLevel, Swept, Key software, Gusto, QuickBooks. |
| 24 | Permission levels | Three tiers: Super Admin (everything) / Admin (everything but financials) / Staff (cleaners — pertinent info/channels only). |
| 25 | Self-service exclusions | None — everyone can self-serve. |
| 26 | Compliance requirements | None. |
| 27 | Anything else | "This is a great starting point!" |

---

## 2. Mapping: requests → packages

### A) Covered by Core (in the $1,000 — ship in the Rainier clone)

| Request | Where it lives | Notes |
|---|---|---|
| Lead sources visible on contacts (Q1) | `seed.js` — set `leadSource` enum / tag on contacts during data load. | No code change; data config. |
| Pipeline buckets, manual drop-in (Q2, Q3) | `Pipeline.jsx` — already drag-drop; just seed the GHL stages (Hot, Drip, etc.). | Stage names land in seed config. |
| Quote-accepted handoffs by notification (Q6, partial) | Messaging + Activity log — manually logged for now. No automation unless they buy a workflow add-on. | "Schedule walk-through" can be a Schedule entry; "notify accounting" is a Messaging thread. |
| Welcome email + first-clean recap auto-send (Q10) | Reminder templates — `seed.js` `reminderTemplates` already supports `booking_confirmation`, `post_service`. Add `welcome_email` template; wire trigger on contact lifecycle change to "client". | Engine already exists. Add 1 template + 1 trigger. |
| Cleaner-app surfaces (Q13: schedule, messages, hours, time-off requests, pay stubs link, FAQ) | The shell already shows schedule (own jobs) + messages + per-user perms. **Hours worked / pay stubs / FAQ: links out — not built modules.** Time-off is a Messaging "channel" per Q14. | Anything beyond schedule + messages is a link-out, not a build, in Core. |
| Time-off requests as a channel (Q14) | Create a Messaging conversation labelled `Time Off` or `Office HR`, pinned for the office staff. | Seed config. No code. |
| Phone porting staged: employee line first, customer stays on GHL (Q16) | Ops task during deployment — register one Twilio number for employees first. Customer line stays on GHL until later port. | Operational, not code. |
| Dashboard metrics (Q17, Q18) — **labor-focused subset** | `Dashboard.jsx` — add labor-focused cards: missed cleans, labor report, client complaints, revenue, open receivables, $ collected, outstanding quotes. | Per-client cards live in Rainier repo; backed by data in store. |
| Same dashboard for all roles for now (Q20) | No code change — current implementation already shows the same cards for all roles (gated by permission, not role). | |
| Permission levels (Q24) | `roles.js` defaults — currently Super Admin / Admin / Crew. **Tweak: revoke `invoices.*` and `reminders.*` from Admin so Admin doesn't see financials per Q24.** | One file edit + storage version bump; happens in the Rainier clone, not shell. |
| No self-service exclusions (Q25) | No change — defaults already let every active user log in. | |

### B) Add-on territory — NOT in Core (flag with client before any work)

| Request | Add-on that covers it | Status |
|---|---|---|
| Quotes / estimates (Q5) | Future Sales Automation add-on (not yet sold). | Push back if requested — gut-call quoting today, no formula. |
| 7-day sales sequence automation (Q2) | Future Sales Automation add-on. | Pipeline stages exist; *automated* timed touches do not. |
| Department-handoff onboarding workflow (Q6, Q7) | Future workflow add-on. | Manual logging only in Core. |
| Employee onboarding docs (Q12) — handbook, I-9, W-4, SOPs, training videos | **EMS — $800 (not sold).** | If requested: confirm sale before building. |
| Hours worked, pay stubs link, time-off as workflow (Q13, Q14) | **EMS — $800 (not sold).** | Time-off-as-channel above is the Core stand-in. Pay stubs / hours are link-outs. |
| Invoicing / payments / Stripe / recurring billing | **IPR — $400 (not sold).** | Core has logging-only invoices. |
| AR aging / P&L / unpaid invoice sync from QB (Q21, Q22) | **QuickBooks — $300 (not sold; explicitly deferred per Rainier).** | Per Q21 they're keeping invoicing in QB for now. The dashboard widgets they asked for live behind this add-on. **Don't build.** |
| Field ops (checklists, before/after photos, GPS) | **Field Ops — $600 (not sold).** | |
| Stack consolidation: replace Swept, Gusto, GHL outright (Q23) | Multiple add-ons would be required. | Core can ingest contacts via CSV but doesn't replace the platforms. |

### C) Out of scope — explicitly excluded

- **Key inventory / key toggle (Q15).** Tabled as a future extra feature; not in this engagement.

---

## 3. What the Rainier repo owns (per-client config)

All of this happens *after* the clone, in `RainierFacilitySolutions/app`, never in the shell:

1. **Theme tokens** — apply PolishPoint Blue theme (`theme-polishpoint-blue.css` baseline; canonical token vocabulary at `C:\Users\dtucc\OneDrive\Documents\PolishPoint\theme_polishpoint_blue_swatchboard.html`).
2. **Company seed** — Rainier Facility Solutions, address, branding, logo (`Rainier-Facilities_logo.PNG`).
3. **User seed** — Kyle (Super Admin), Steve (Super Admin), Heather (Admin), Lauren (Admin), cleaner roster (Crew).
4. **Permission tweak** — revoke `invoices.view`, `invoices.edit`, `invoices.recordPayment`, `reminders.view`, `reminders.edit` from `admin` defaults in `lib/roles.js`. Bump `INITIAL_STATE.version` and `STORAGE_KEY` in lockstep. (Per Q24: Admin = "everything but financials".)
5. **Service catalog** — residential / commercial / specialized services, with frequency presets used by Rainier today.
6. **Pipeline stages** — seed Hot bucket + Drip campaign stages (per Q3) plus any others mirroring their current GHL pipeline.
7. **Reminder templates** — `welcome_email` and update `post_service` body to be a "first-clean recap" per Q10.
8. **Messaging channels (seed conversations)** — pinned `Time Off` thread for HR (Q14); pinned office channel for accounting handoffs (Q6).
9. **Dashboard cards** — labor-focused: missed cleans, labor report, client complaints (Q17). Plus revenue, open receivables, $ collected, outstanding quotes (Q18).
10. **Contact migration** — CSV import from GoHighLevel (separate $200 add-on; uses shell's existing CSV import wizard).
11. **Twilio + A2P** — employee line provisioned/ported first per Q16; customer line stays on GHL until later port.

---

## 4. Clone runbook

```bash
# 1. Tag the shell baseline
git -C C:\Users\dtucc\OneDrive\Documents\Claude\shell-build tag -a v1.0-core -m "Core complete; baseline for client clones"
git -C C:\Users\dtucc\OneDrive\Documents\Claude\shell-build push origin v1.0-core

# 2. Clone shell into the Rainier client app directory
git clone https://github.com/Kronelius/shell-build.git \
  "C:\Users\dtucc\OneDrive\Documents\Claude\SaaSassins\Clients\Rainier Facility Solutions\app"

# 3. From inside the cloned dir, point origin at Rainier's GitHub repo (once created)
#    git remote set-url origin https://github.com/RainierFacilitySolutions/app.git
#    git push -u origin main
#    Then: add Kronelius as collaborator with admin/write access.
```

### After clone, in the Rainier repo, in this order:

1. Apply PolishPoint Blue theme (`theme.css` token swap from swatchboard).
2. Replace `seed.js` company / users / services / pipeline-stages / reminder-templates / messaging-channels.
3. Apply Q24 admin-permission-revoke + version bump.
4. Add labor-focused dashboard cards.
5. Place logo (`Rainier-Facilities_logo.PNG`) in `app/public/` and wire into header.
6. CSV-import existing GHL contacts (paid migration — billed separately).
7. Provision employee Twilio number; leave GHL customer line for later.

---

## 5. Out-of-scope guardrails (when to push back)

If the client asks for something during build, check this list before coding:

- **"Can we add quotes / estimates?"** → Sales Automation add-on, not sold. Confirm sale.
- **"Can the dashboard pull from QuickBooks?"** → QB add-on ($300), not sold. Per Q21 they explicitly chose to keep invoicing in QB for now; tell them the in-app dashboard widgets for AR/P&L/unpaid invoices need that integration sold first.
- **"Can cleaners track hours / see pay stubs in-app?"** → EMS add-on ($800), not sold. Pay-stub link can be a link-out to Gusto in the meantime; hours tracking is not Core.
- **"Can we automate the 7-day sales sequence?"** → Sales Automation add-on, not sold. Manual pipeline-card moves only in Core.
- **"Can we add the key toggle?"** → Explicitly tabled for later (not in this engagement). Reaffirm before committing time.
- **"Can we add checklists / before-after photos?"** → Field Ops add-on ($600), not sold.
