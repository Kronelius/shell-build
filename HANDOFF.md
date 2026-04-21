# PolishPoint — Session Handoff

**Last session end:** all Phase 2 items from the audit are complete plus a lot of messaging/pipeline/contact polish. Work is **uncommitted** on `main` (23 files changed, +1453/-661 lines, 1 new file, 1 deleted). Build is clean; HMR works. Pickup point: a pending **"What next?"** decision (see bottom).

---

## Session start checklist (first thing, every session)

Per `CLAUDE.md`:
1. `git rev-parse --is-inside-work-tree && git remote -v` — verify clone + origin.
2. `git fetch` — compare local HEAD vs `origin/main`. Report sync status.
3. If behind + clean → offer fast-forward. If diverged → flag; don't auto-merge.
4. Dev server: `npm --prefix app run dev` → http://localhost:5173. **Storage key was bumped `v4 → v5`** — if the app shows stale data, hard reload (Ctrl+Shift+R) to force a fresh reseed.

---

## What shipped this session

### Phase 2 completion (4/4)
1. **Invoices — billing-contact picker** (`CreateInvoiceModal.jsx`, `InvoiceDetail.jsx`). Auto-fills from client's `primaryContactId`; scoped to account contacts; link to `/contacts/:id` on the Summary card.
2. **Jobs — site-contact display** (`AddSiteModal.jsx`, `ClientDetail.jsx`, `JobDetail.jsx`). `siteContactId` edited on the **site record** (source of truth), **displayed** on JobDetail (read-only, derived) and on the site cards under ClientDetail → Sites.
3. **Messaging — contact linkage** (`ConversationContextPanel.jsx`, `Messaging.jsx`, `NewConversationModal.jsx`). Unlinked threads get a prominent picker; `UPDATE_CONVERSATION` dispatches contactId changes. NewConversationModal dedupes: if contact already has an active thread → "Open existing thread" button instead of spawning a duplicate.
4. **Dashboard — Follow-ups card** (`Dashboard.jsx` + new selectors `selectStaleLeads` + `selectUnansweredThreads`). Top of right column. Merges stale leads (7d threshold) + unanswered open threads (24h), oldest-first, capped at 5. Scoped: crew see own-only; admins see org-wide + unassigned queue.

### Messaging polish (user-driven, mid-session)
- **Thread-row redesign**: right-rail with three dedicated slots (star / timestamp / status+unread). Fixes the overlap where `position:absolute` star fought the flex timestamp.
- **Pinned section**: starred threads pull to top under a PINNED header with count chip. "Starred only" filter → "Pinned only"; star aria-label → Pin/Unpin.
- **Removed from rows**: channel chips (SMS/Email) and assignee avatars. Channel now lives in middle-panel header only; assignee in the context panel only.
- **Context panel Details card — inline editing**: every field (email/phone/title/dept/address/assigned-user/visibility/stage/deal-value/close-date) edits in place with transparent-until-focused inputs. Dirty-tracking triggers a Save/Discard row. Client-side email-uniqueness check with error toast. `key={contact.id}` on the card for remount-based form reset (avoids `setState-in-effect`).
- **Context panel tabs**: `Contact | History | Activities | Notes` (keys: `contact / history / activities / notes`). "History" = synthesized timeline (was "Activities"). "Activities" = invoices + jobs (was "Related"). Notes tab is new: compose box with ⌘+Enter to append; history rendered below.
- **Context head overflow menu** (kebab + expand): Change contact / Unlink conversation moved from Details-card footer into a small popover menu at top-right of the context panel. Rationale: these are conversation-scoped actions, not contact-scoped.
- **Contact focus modal** (`ContactFocusModal.jsx` — NEW file): expand button opens ContactDetail in a backdrop-blurred modal at ~66vw, Esc/click-out to close. `ContactDetail.jsx` was refactored to accept `contactId` prop + `embedded` flag for this.
- **"Message" button in contact profile** now dedupes — navigates to existing thread if one exists instead of always opening NewConversationModal.

### Pipeline polish
- **Uniform card footprint** (`height: 124px`, ellipsis on overflow, always-rendered slots for tag / value / owner / close-date).
- **Drop-slot indicator** (animated accent bar) that snaps between cards based on mouse-Y vs card midpoint.
- **Reorder-within-stage**: `SET_CONTACT_STAGE` extended with optional `insertBeforeId`; stage-change activity only logs when stage actually changed.

### Removed: message folders
User call — "get rid of Folders." Full removal: deleted `FolderManager.jsx`, dropped `FoldersCard` / `FolderDots`, removed 4 reducer actions, 3 selectors, `folderIds` on conversations, `messageFolders` collection, `messaging.manageFolders` permission, ~130 lines of CSS. Seed version bumped `4 → 5`. **Snippet folders kept** — different feature (template grouping).

### Misc
- `"Owner"` label in the context panel Details card → renamed **"Assigned user"** (scoped to messaging surface only — `Clients.jsx` / `ContactDetail.jsx` still say "Owner").

---

## Patterns to preserve (copy these for future work)

- **Inline editable cards with dirty-track Save bar**: `buildForm(entity)` snapshot → compare against form state → Save row renders only when dirty. Save dispatches per-field with the correct action (not blanket UPDATE_X). Reference: `ContactLinkCard` in `ConversationContextPanel.jsx`.
- **Per-field dispatch on save**: `UPDATE_CONTACT` for generic patches; `ASSIGN_CONTACT_OWNER` for owner (matches existing flows); `SET_CONTACT_STAGE` for stage (preserves activity log). Same shape should apply to any future inline-edit card.
- **Client-side uniqueness check before dispatch**: the reducer silently drops dup emails. Check with a selector, show toast, return early. Apply anywhere the reducer silently rejects.
- **`key={entity.id}` for form reset**: avoids `setState-in-effect`. Caller mounts the card with entity-id as key; switching entities remounts with a fresh form — no `useEffect` needed.
- **Storage-key bump on seed-shape change**: bump both `INITIAL_STATE.version` in `seed.js` AND `STORAGE_KEY` in `persist.js` in lockstep whenever the reducer/seed shape changes. Current values: v5 / `'pp.store.v5'`.
- **Permission gating**: `canEditAll || entity.ownerUserId === currentUser?.id` — "edit all OR own." Matches existing `contacts.edit` pattern.
- **Dedupe before create**: any "new X" flow targeting an identity (contact, thread-with-a-contact, etc.) should check for existing active records first. Precedent: `NewConversationModal` + ContactDetail's Message button.
- **Embeddable page components**: add `contactId` prop + `embedded` boolean so page components can render inside modals without router chrome. Precedent: `ContactDetail.jsx`.
- **Design tokens**: no hardcoded colors. Token → alias → recipe. See `app/src/STYLING.md`. The few `rgba(...)` I used this session are soft-tint backgrounds for icon badges — acceptable but prefer tokens where possible.

---

## Gotchas / known issues

- **Pre-existing lint errors** (NOT from this session — don't fix unless asked):
  - `ContactDetail.jsx`: hooks-after-early-return (`useMemo` called after `if (!contact) return`). React compiler flags it; runtime is fine.
  - `Messaging.jsx`: three `setState-in-effect` warnings in URL/inbox sync effects.
  - `MessagingHeader.jsx` + `PipelineBoard.jsx`: Fast-refresh warnings for non-component exports (`EMPTY_FILTERS`, `PIPELINE_STAGES`). Design-intentional.
- **Contact owner vs conversation assignee**: different fields (`contact.ownerUserId` vs `conversation.assignedUserId`) but the messaging context panel labels both "Assigned user". User is aware; **don't conflate them in the data model.**
- **Snippet folders ≠ message folders**: snippets still use `selectSnippetFolders` and `folderId` (singular). That's intentional. Don't rip this out when touching folder references.
- **`messaging.manageFolders` permission was deleted** — when building the Roles editor, confirm the catalog still renders correctly without it (if the UI reads permissions dynamically, it will).
- **LF/CRLF noise**: Windows machine, git converts line endings on commit. Harmless.

---

## Remaining punch list

### Phase 2 (DONE)
- ✅ Invoices billing-contact picker
- ✅ Jobs site-contact display
- ✅ Messaging contact linkage + focus modal
- ✅ Dashboard Follow-ups card

### Beyond Phase 2 (not started)
- **A. Team → Add User modal** — `Settings/Team.jsx` has no add-user flow. **User-recommended next step.** Small scope.
- **B. Roles editor** — `/settings/roles` is likely a read-only matrix. Should be editable inline; `state.permissions` already supports it. Medium.
- **C. Pipeline bulk actions + stage CRUD** — no multi-select, no reassign/archive across cards, stages hardcoded in `PIPELINE_STAGES`. Medium.
- **D. Reminders delivery inbox** — per-event read/unread + retry + delivery dashboard. Medium.

### Deferred (not yet scoped)
Quoting/Estimates, Time tracking, Files/Documents, Reports & Analytics, Payment gateway UI, real Email/SMS integration shape.

---

## Uncommitted files (23 total)

```
M  app/src/components/AddSiteModal.jsx
M  app/src/components/ConversationContextPanel.jsx   ← biggest diff
M  app/src/components/ConversationThreadList.jsx
M  app/src/components/CreateInvoiceModal.jsx
D  app/src/components/FolderManager.jsx              ← deleted
M  app/src/components/Icon.jsx                       (+ expand icon)
M  app/src/components/MessagingHeader.jsx
M  app/src/components/NewConversationModal.jsx
M  app/src/components/PipelineBoard.jsx
M  app/src/components/PipelineCard.jsx
M  app/src/data/seed.js                              (version: 4 → 5)
M  app/src/index.css                                 (+~340 net)
M  app/src/lib/roles.js                              (-messaging.manageFolders)
M  app/src/pages/ClientDetail.jsx
M  app/src/pages/ContactDetail.jsx                   (+ embedded/contactId props)
M  app/src/pages/Dashboard.jsx                       (+ Follow-ups card)
M  app/src/pages/InvoiceDetail.jsx
M  app/src/pages/JobDetail.jsx
M  app/src/pages/Messaging.jsx
M  app/src/store/persist.js                          (STORAGE_KEY: v4 → v5)
M  app/src/store/reducer.js                          (-4 folder actions, +insertBeforeId)
M  app/src/store/selectors.js                        (+2 follow-up selectors)
?? app/src/components/ContactFocusModal.jsx          ← new file
```

**No commits yet.** If you want to commit in logical chunks:
1. Phase 2 four items
2. Messaging UI rework (thread rows + context panel + notes tab + pinned section + focus modal)
3. Pipeline polish (uniform cards + drop indicator + reorder)
4. Folders removal
5. Dashboard follow-ups

(Or one big commit — whatever the user prefers.)

---

## Suggested next-session opener

> "Continue the PolishPoint build. Read `HANDOFF.md` at the repo root for context. Start with item **A (Team → Add User modal)**."

Alternative if commits come first:

> "Read `HANDOFF.md`. Before anything else, review the uncommitted work and commit it in logical chunks."

That's it. `CLAUDE.md` + memory files still apply — this doc is only session continuity.
