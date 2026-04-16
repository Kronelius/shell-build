# HANDOFF — Commit to Existing GitHub Repo

## Project location
**`C:\Users\danie\Documents\Saasassins\Mockups`**

## How to start the new session

**Easiest:** Open Claude Code from that folder directly — right-click inside it and pick "Open in Terminal" (or use File Explorer's address bar to type `cmd` / run `claude` there). That way the CWD is already correct.

Then paste the pickup prompt below.

## Pickup prompt (paste as first message)
> The project is at `C:\Users\danie\Documents\Saasassins\Mockups`. If that's not your current working directory, use `mcp__ccd_directory__request_directory` with that path to get access, then read `HANDOFF.md` inside it. The user already created an empty repo on GitHub. Ask for the repo URL, then initialize git in that directory, commit, and push. Do not make code changes — commit as-is.

## What exists now
- **`app/`** — React + Vite interactive prototype (6 working screens: Dashboard, Schedule, Clients, Invoices, Reminders, Messaging). Built in previous session, verified working. Unthemed — uses the shell's neutral gray defaults.
- **`shell.html`** — Original wireframe mockup (unthemed, neutral gray).
- **`theme-polishpoint-blue.css`** — Optional theme file (not applied to the app).
- **`rainier-facility-solutions.html`** — Legacy hardcoded mockup.
- **`CLAUDE.md`** — Project notes.
- **`.gitignore`** — Already configured (excludes `node_modules/`, `dist/`, env files).
- **`.claude/launch.json`** — Preview server config for `app/` on port 5173.

## Not a git repo yet
The working directory has **no** `.git/` directory. The user has already created the repo on GitHub but nothing is pushed.

## Steps

1. **Ask the user for the GitHub repo URL** (e.g., `https://github.com/<user>/<repo>.git` or SSH equivalent).

2. **Initialize git and commit**:
   ```bash
   cd "C:\Users\danie\Documents\Saasassins\Mockups"
   git init
   git branch -M main
   git add .
   git status   # sanity check — confirm no node_modules, no .env
   git commit -m "Initial commit: shell wireframe + React + Vite interactive prototype"
   ```

3. **Add remote and push**:
   ```bash
   git remote add origin <URL_FROM_USER>
   git push -u origin main
   ```

4. **If the remote has commits already** (e.g., a README GitHub auto-created):
   ```bash
   git pull origin main --rebase --allow-unrelated-histories
   git push -u origin main
   ```

## Sanity checks before pushing
- Run `git status` after `git add .` — make sure `app/node_modules/` is NOT listed.
- `.gitignore` at the root already handles this, but double-check.
- No `.env` files or secrets should appear in the diff.

## Auth
- User is on Windows (bash shell). If push fails with auth error, try `gh auth status` — if not logged in, `gh auth login` (browser flow, pick HTTPS + git credential helper).

## Don't
- Don't amend or rewrite commits.
- Don't force-push.
- Don't modify any source files — this handoff is commit-only.
- Don't apply a theme to the app (memory note: the app is intentionally unthemed).
