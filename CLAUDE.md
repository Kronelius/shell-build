# PolishPoint App Shell — Handoff

## Pickup Prompt
> Read CLAUDE.md and shell.html. The shell is a plain wireframe mockup with 6 screens, neutral gray defaults, and CSS custom properties that match the PolishPoint swatchboard naming. To skin it: link a theme CSS file that redefines the same `:root` vars. To build a client deliverable: replace placeholder content and link a theme.

## Files

| File | Purpose |
|---|---|
| `shell.html` | Plain wireframe. 6 screens, all `var()` tokens, neutral gray defaults. ~400 lines. |
| `theme-polishpoint-blue.css` | PolishPoint Blue theme tokens. Link this to skin the shell blue. |
| `rainier-facility-solutions.html` | Legacy — original Rainier mockup with hardcoded blue styling. |

## Shell Screens (6)
1. **Dashboard** — Hero greeting, today's schedule, weekly revenue chart, team status, Overview/Metrics switcher
2. **Schedule** — Timeline view, Day/Week/Month tabs
3. **Clients** — Table with search, service/frequency/revenue/status columns
4. **Invoices** — Stat cards + table with status badges (Paid/Pending/Overdue)
5. **Reminders** — 3-step drip flow, delivery stats, toggle settings
6. **Messaging** (Add-on) — SMS/Email tabs, conversation sidebar, live chat

## CSS Variable Names (match swatchboard)
`--primary`, `--primary-light`, `--primary-hover`, `--primary-deep`, `--primary-soft`, `--primary-bg`, `--text-primary`, `--text-body`, `--text-muted`, `--text-faint`, `--page-bg`, `--card-bg`, `--card-border`, `--border-light`, `--border-mid`, `--inset-bg`, `--card-radius`, `--btn-radius`, `--input-radius`, `--badge-radius`, `--success`, `--warning`, `--danger`, `--sidebar-bg`, `--sidebar-border`, `--avatar-1` through `--avatar-5`

## To Skin the Shell
1. Link a theme CSS file in `<head>` (after the Google Fonts link)
2. The theme redefines `:root` vars — shell picks them up automatically
3. Example: `<link rel="stylesheet" href="theme-polishpoint-blue.css">`

## To Build a Client Deliverable
1. Copy `shell.html`
2. Link a theme OR inline theme `:root` in a `<style>` tag
3. Replace placeholders: company name, owner name, logo initials, client data, team members, invoices, schedule

## Design System Source
- Swatchboard: `C:\Users\danie\Documents\PolishPoint\Blue\theme_polishpoint_blue_swatchboard.html`
- Reference mockup: `C:\Users\danie\Documents\PolishPoint\Blue\blue-theme-mockup.html`

## Rainier Facility Solutions (Example Client Data)
- **Owner**: Kyle Boyden | **Logo**: RF | **Invoice prefix**: RFS-
- **Services**: Janitorial, Floor Care, Window Cleaning, Post-Construction, Pressure Washing, Restroom Sanitation
- **Clients**: Puget Sound Medical Center, Cascade Office Park, Summit Warehouse Group, Emerald Heights HOA, Pacific Ridge Corporate, Mount Baker Industrial, Redmond Tech Campus, Lakeview Senior Living
- **Team**: Kyle B. (Owner), Marcus T., Jenny L., David R., Ana S.

## How to Preview
```bash
npx serve -l 3456 .
# http://localhost:3456/shell.html
```
