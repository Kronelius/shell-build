# Shell UI Rules

> Cosmetic and interaction rules for the shell build. These are *additive* to `app/src/STYLING.md` (which governs design tokens / aliases / recipes) and govern *how UI is composed and behaves*. Both files travel together when porting the shell to a new client.

This file is the source of truth for layout/interaction conventions. When you add a new page or component, follow these rules. When you change one, update this file in the same commit.

---

## 1. Container hygiene — no pointless nesting

**Rule.** A container only earns its existence if it adds visual grouping that isn't already provided by an inner element. If the inner element (table, card, list) already has a border + radius + shadow, do not wrap it in a `.card` for "extra padding."

**Where it applies.**
- List pages with a single table: `Clients`, `Invoices`, `Reminders`, `Team`, `ClientDetail` tab tables. The `<table>` lives directly inside `<div class="table-wrap">` — no surrounding `<div class="card">`.
- Dashboard KPI clusters: `Operational Performance`, `Financial Snapshot`. The `<div class="stat-grid">` with its `StatCard` children sits directly under the page; the section heading uses `.dash-section-title` (no card border).
- Detail-page section cards that wrap (header + table + optional inline form): `InvoiceDetail` Line Items / Payments, `ContactDetail` Related-tab Invoices / Jobs / Conversations. The header persists outside (Rule 2), the `.table-wrap` stands alone with its own border, and any inline editing form fields/actions sit directly below the table — no `.card.detail-card` wrapper around the whole section.
- Settings cards with a single form/card child: handled structurally — see Rule 5.

**How to apply.** When you'd otherwise write
```jsx
<div className="card"><div className="table-wrap">…</div></div>
```
write
```jsx
<div className="table-wrap">…</div>
```
The `.table-wrap` recipe carries its own background/shadow/margin so it stands alone. Same for `StatCard`s — they have their own border/shadow.

For section cards that wrap a header + table-wrap + sometimes an inline form (the `InvoiceDetail` / `ContactDetail` pattern), drop the outer `.card.detail-card` and let each child stand on its own:

```jsx
{/* before */}
<div className="card detail-card">
  <div className="section-head"><h3>…</h3>{button}</div>
  <div className="table-wrap">…</div>
  {editing && <div className="form-row">…</div>}
  {editing && <div className="modal-actions">…</div>}
</div>

{/* after */}
<div>
  <div className="section-head"><h3>…</h3>{button}</div>
  <div className="table-wrap">…</div>
  {editing && <div className="form-row">…</div>}
  {editing && <div className="modal-actions">…</div>}
</div>
```
Keep the wrapping `<div>` so the section is one grid cell / one block. Drop the visual `card detail-card` chrome.

**Don't apply** to true *primary-content* cards that have their own dense, structured body (e.g. the `InvoiceDetail` "Summary" card with its `<dl>`, the `ContactDetail` Overview profile card). Those legitimately are the page's main content surface and earn their `.card.detail-card`. The test: if dropping the outer card would leave a heading + a single visually-bordered child (table-wrap, stat-grid, list), drop it. If the body is a definition list / stacked fields / mixed prose, keep it.

---

## 2. Section titles persist outside containers

**Rule.** When a "larger container" is dropped per Rule 1 but had a heading inside, the heading persists as a standalone element above the content. Use `.dash-section-title` (smaller, muted, uppercased) for KPI-style cluster headings.

**Where it applies.** Dashboard KPI clusters. The section heading sits between the dashboard hero and the stat-grid, with no card around it.

**Don't apply** to detail-page section titles inside `.card.detail-card` — those keep their in-card heading style (`.dash-card-title` / `.section-title`).

---

## 3. Bulk-action bars persist — no layout shift on selection

**Rule.** Any UI element that appears/disappears based on selection state must instead **always be rendered**. When nothing is selected, show neutral placeholder copy and disable the action controls. The result: selecting an item never pushes the content below it down.

**Where it applies.**
- `Clients` (Contacts tab): bulk-bar with tag/owner/archive actions
- `Invoices`: bulk-bar with mark-paid/export/clear
- `Pipeline`: bulk-bar with move-to-stage/owner/archive

**How to apply.**

1. JSX: render unconditionally with an `is-empty` modifier when count is 0.
   ```jsx
   <div className={`bulk-bar ${selection.size === 0 ? 'is-empty' : ''}`}>
     <span>
       {selection.size > 0
         ? `${selection.size} selected`
         : 'Select <items> for bulk actions'}
     </span>
     {/* ...controls with disabled={selection.size === 0}... */}
   </div>
   ```
2. CSS: `.bulk-bar.is-empty` softens the visual (transparent bg, dashed border, muted text) and dims disabled controls. See `index.css` near `.bulk-bar`.

**Generalizes to:** any "context bar" tied to selection or transient state (filter chips, batch toolbars). If it would CLS on appearance, render it always.

---

## 4. Click-target ergonomics — checkboxes ≥ 18px

**Rule.** Native checkboxes are ~13px in most browsers and require a precise click. The shell sets a global rule that bumps every `input[type="checkbox"]` to **18×18px** (≈ 50% larger linear hit area) with `cursor: pointer` and `accent-color: var(--primary)`.

**Where it applies.** Every checkbox in the app. Already enforced via global CSS in `index.css` (`input[type="checkbox"] { width: 18px; height: 18px; ... }`).

**How to extend.** When a checkbox needs an even larger hit area (cards, mobile lists), wrap it in a `<label>` — the global rule sets `cursor: pointer` on `label:has(> input[type="checkbox"])`, and the label area transfers clicks to the input natively.

**Why 18px (not 20 / 24).** 18px gives the user-requested ~50% increase without breaking visual rhythm in tight tables. If a future audit shows touch ergonomics still need work on mobile, bump to 20px and keep this file in sync.

---

## 5. Settings layout — sidebar bottom = main card bottom

**Rule.** In a two-column layout where one side is a sub-nav and the other is a primary content card, the bottom edges of the two columns must align. The pattern is:

- Outer grid uses `align-items: stretch` so both columns stretch to the row height.
- The content column uses `display: flex; flex-direction: column;` and the *last* card/form/`table-wrap` inside it uses `flex: 1 1 auto; margin-bottom: 0;` to absorb leftover height.

**Where it applies.** Settings pages (`SettingsLayout` wraps every settings sub-page). The CSS rule that enforces it lives at `.settings-content > * > .card:last-child` (and its `form.card` / `table-wrap` siblings).

**Generalizes to:** any future shell layout that puts a sub-nav alongside a content area. If the bottoms don't line up, the eye reads it as misaligned.

---

## 6. Margin between page-head-text and primary card

**Rule.** In settings pages (and other layouts that use `.page-head-text` directly above a card), the heading block has `margin-bottom: 30px` to its primary card. CSS rule: `.settings-content .page-head-text { margin-bottom: 30px; }`.

**Why.** A tighter margin felt cramped against the card border; 30px gives a clear breath without breaking compact density.

**Generalizes to:** any place a `.page-head-text` sits directly above a primary `.card`. If it appears elsewhere in the app and looks tight, scope the margin rule there too rather than making it global (because the title can also sit above tables, lists, etc., where the gap is different).

---

## 7. Selectors / segmented controls — consistent radii

**Rule.** Any segmented control (a small group of mutually-exclusive toggles) uses the same outer/inner radius pair across the app:

- Outer container: `var(--card-radius)` (20px in default theme)
- Inner buttons: `var(--btn-radius)` (10px in default theme)
- Container padding 3–4px so the active button sits visually inset.

**Where it applies.**
- `.tab-container` + `.tab-btn` (Contacts tabs, Schedule day/week/month, detail-page tabs)
- `.messaging-inbox-toggle` + `.inbox-toggle-btn` (Messaging All/Mine)

**Don't apply** to the dashboard `.dash-sw-btn` (Overview/Metrics) — that is intentionally a pill-shaped switcher, a different visual pattern.

**How to add a new selector.** Use one of the two existing class pairs above; do not invent a third radius scheme. If the design genuinely needs a new pattern, add it here first.

---

## 8. Toasts only confirm save actions

**Rule.** A toast appears **only** after an explicit form/modal save click. Status changes — toggles, mark-as-X, archive, delete, drag/drop, bulk actions on lists — change the data and let the UI reflect it; no toast.

**What still toasts.**
- Add/Edit/Save buttons on any modal (`AddClientModal`, `AddContactModal`, `CreateInvoiceModal`, etc.)
- Save buttons on detail/settings pages (`Account updated`, `Member saved`, `Profile saved`, …)
- Form-shaped submissions: `Note added`, `Payment recorded`, `Stage added`, CSV import completion
- Errors and validation failures (`toast.error(...)`) — these always toast, regardless of the action

**What never toasts.**
- Status changes (mark paid, voided, archived, deleted)
- Toggles (template enabled/disabled, permission grant/revoke)
- Bulk actions on lists
- Drag/drop moves
- Copy-to-clipboard, exports, simulated test sends

**How to apply.** New code: don't reach for `useToast` unless you're confirming a save. If you wired a toast and aren't sure it qualifies, the default is **don't toast** — the UI update is the confirmation.

---

## 9. Sidebar footer — single border above the user chip

**Rule.** The sidebar footer (containing the user-switcher) draws **one** divider above it via `.sidebar-footer`'s `border-top`. Don't add a second `border-top` to the user-switcher itself. CSS rule: `.user-switcher { position: relative; }` (no border).

**Why.** Stacking two borders that overlap with different inset widths creates a "double line" effect that looks like a CSS bug.

**Generalizes to:** any container-inside-container where both want a top divider. Pick one — the outer container's border or an explicit divider element — never both.

---

## 10. New Job entry-point lives on the Schedule page only

**Rule.** Job creation is initiated from the Schedule page. The sidebar does not carry a "+ New Job" CTA.

**Why.** Action affordances for a single feature shouldn't appear in the global chrome (sidebar) AND on the page itself; that's redundant clutter. Schedule already has its own "+ New Job" button + modal.

**Generalizes to:** any feature-specific create CTA. Put it on the page that owns the feature, not in the global sidebar. Sidebar entries should be navigation only.

---

## Adding a new rule

Before merging a UI change that establishes a pattern likely to repeat, add an entry here. Each entry should have:

1. **Rule** — the one-line statement (imperative)
2. **Where it applies** — concrete pages/components today
3. **How to apply** — JSX or CSS sketch the next contributor can copy
4. **Generalizes to / Don't apply** — boundaries, so the rule isn't over-extended

Keep entries terse. If the *why* is non-obvious, add one line; if it's obvious, skip.

---

## Cross-references

- **`app/src/STYLING.md`** — token vocabulary (colors, radii, shadows, spacing, typography). UI rules read from that vocabulary; never invent values that bypass it.
- **`app/CLAUDE.md`** — project context, file map, deployment model.
- **`app/SHELL_ROADMAP.md`** — what's built, what's pending. Cosmetic rules in this file apply to all CORE-section work.
