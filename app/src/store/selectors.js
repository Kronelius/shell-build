// Selectors — read-only helpers over state. Kept pure; callers can memoize if hot.

import { effectivePermissions } from '../lib/roles';

export const selectCompany = (s) => s.company;
export const selectUsers = (s) => s.users;
export const selectActiveUsers = (s) => s.users.filter((u) => u.status === 'active');
export const selectCurrentUser = (s) => s.users.find((u) => u.id === s.currentUserId) || null;
export const selectServices = (s) => s.services;
export const selectFrequencies = (s) => s.frequencies;
export const selectClients = (s) => s.clients;
export const selectActiveClients = (s) => s.clients.filter((c) => c.status === 'active');
export const selectSites = (s) => s.sites;
export const selectJobs = (s) => s.jobs;
export const selectInvoices = (s) => s.invoices;
export const selectConversations = (s) => s.conversations;
export const selectMessages = (s) => s.messages;
export const selectReminderTemplates = (s) => s.reminderTemplates;
export const selectReminderEvents = (s) => s.reminderEvents;
export const selectPermissions = (s) => s.permissions;

// v2 additions
export const selectContacts = (s) => s.contacts || [];
export const selectTags = (s) => s.tags || [];
export const selectContactActivities = (s) => s.contactActivities || [];
export const selectUserPermissionOverrides = (s) => s.userPermissionOverrides || [];

// v3 additions — messaging snippets
export const selectSnippets = (s) => s.snippets || [];
export const selectSnippetFolders = (s) => s.snippetFolders || [];
export const selectSnippetById = (s, id) => (s.snippets || []).find((x) => x.id === id) || null;
export const selectSnippetFolderById = (s, id) => (s.snippetFolders || []).find((f) => f.id === id) || null;
export const selectSnippetsForFolder = (s, folderId) =>
  (s.snippets || []).filter((x) => x.folderId === folderId);
// Snippets that apply to a given channel. Snippets with channel='all' always match;
// snippets pinned to a specific channel only match that channel.
export const selectSnippetsForChannel = (s, channel) =>
  (s.snippets || []).filter((x) => x.channel === 'all' || x.channel === channel);

// ---------- Lookups ----------
export const selectClientById = (s, id) => s.clients.find((c) => c.id === id) || null;
export const selectSiteById   = (s, id) => s.sites.find((x) => x.id === id) || null;
export const selectServiceById = (s, id) => s.services.find((x) => x.id === id) || null;
export const selectUserById    = (s, id) => s.users.find((x) => x.id === id) || null;
export const selectJobById     = (s, id) => s.jobs.find((x) => x.id === id) || null;
export const selectInvoiceById = (s, id) => s.invoices.find((x) => x.id === id) || null;
export const selectConversationById = (s, id) => s.conversations.find((x) => x.id === id) || null;
export const selectContactById = (s, id) => (s.contacts || []).find((c) => c.id === id) || null;
export const selectContactByEmail = (s, email) => {
  if (!email) return null;
  const lower = email.trim().toLowerCase();
  return (s.contacts || []).find((c) => (c.email || '').toLowerCase() === lower) || null;
};
export const selectTagById = (s, id) => (s.tags || []).find((t) => t.id === id) || null;

// ---------- Relationship reads ----------
export const selectSitesForClient = (s, clientId) =>
  s.sites.filter((x) => x.clientId === clientId);

export const selectJobsForClient = (s, clientId) =>
  s.jobs.filter((j) => j.clientId === clientId).sort((a, b) => (a.startAt < b.startAt ? 1 : -1));

export const selectInvoicesForClient = (s, clientId) =>
  s.invoices.filter((inv) => inv.clientId === clientId).sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));

export const selectMessagesForConversation = (s, convId) =>
  s.messages.filter((m) => m.conversationId === convId).sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1));

export const selectConversationForClient = (s, clientId) =>
  s.conversations.find((c) => c.clientId === clientId) || null;

export const selectJobsForUser = (s, userId) =>
  s.jobs.filter((j) => j.crewIds?.includes(userId));

export const selectContactsForClient = (s, clientId) =>
  (s.contacts || []).filter((c) => c.companyId === clientId && c.lifecycle !== 'archived');

export const selectInvoicesForContact = (s, contactId) =>
  (s.invoices || []).filter((inv) => inv.billingContactId === contactId);

export const selectConversationsForContact = (s, contactId) =>
  (s.conversations || []).filter((c) => c.contactId === contactId);

// ---------- Dashboard follow-ups ----------
// Stale leads — contacts in lead/prospect lifecycle with no recent update. `updatedAt` is
// our proxy for activity: gets bumped whenever the contact is edited, tagged, assigned,
// staged, or a note is appended. When ownerUserId is provided, restrict to that owner
// (crew members only see their own follow-ups).
export function selectStaleLeads(s, { daysStale = 7, ownerUserId = null } = {}) {
  const cutoff = Date.now() - daysStale * 24 * 60 * 60 * 1000;
  return (s.contacts || [])
    .filter((c) => c.lifecycle === 'lead' || c.lifecycle === 'prospect')
    .filter((c) => !ownerUserId || c.ownerUserId === ownerUserId)
    .filter((c) => {
      const ref = c.updatedAt || c.createdAt;
      return !ref || new Date(ref).getTime() < cutoff;
    })
    .sort((a, b) => {
      const aT = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bT = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return aT - bT; // oldest (most stale) first
    });
}

// Unanswered threads — external conversations with status=open where the most recent
// message is inbound and older than `hoursStale`. When assigneeUserId is provided,
// restrict to threads assigned to that user (plus their unassigned ones when asked).
export function selectUnansweredThreads(s, { hoursStale = 24, assigneeUserId = null, includeUnassigned = false } = {}) {
  const cutoff = Date.now() - hoursStale * 60 * 60 * 1000;
  const msgsByConv = new Map();
  (s.messages || []).forEach((m) => {
    const arr = msgsByConv.get(m.conversationId);
    if (!arr) msgsByConv.set(m.conversationId, [m]);
    else arr.push(m);
  });
  return (s.conversations || [])
    .filter((c) => c.channel !== 'internal' && !c.archived && c.status === 'open')
    .filter((c) => {
      if (!assigneeUserId) return true;
      if (c.assignedUserId === assigneeUserId) return true;
      return includeUnassigned && !c.assignedUserId;
    })
    .map((c) => {
      const msgs = msgsByConv.get(c.id) || [];
      const last = msgs.reduce(
        (acc, m) => (!acc || new Date(m.sentAt) > new Date(acc.sentAt) ? m : acc),
        null
      );
      return { conv: c, last };
    })
    .filter(({ last }) => last && last.direction === 'in' && new Date(last.sentAt).getTime() < cutoff)
    .sort((a, b) => new Date(a.last.sentAt) - new Date(b.last.sentAt))
    .map(({ conv, last }) => ({ ...conv, lastInboundAt: last.sentAt, lastPreview: last.text }));
}

export const selectActivitiesForContact = (s, contactId) =>
  (s.contactActivities || [])
    .filter((a) => a.contactId === contactId)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

// Merge explicit contact activities with synthesized events from related records (invoices, jobs, messages).
// Used by the ContactDetail Activity timeline.
export function selectSynthesizedActivityForContact(s, contactId) {
  const contact = selectContactById(s, contactId);
  if (!contact) return [];
  const explicit = selectActivitiesForContact(s, contactId).map((a) => ({
    ...a,
    _source: 'activity',
  }));
  const invoices = (s.invoices || [])
    .filter((inv) => inv.billingContactId === contactId)
    .map((inv) => ({
      id: `syn-inv-${inv.id}`,
      kind: 'invoice',
      contactId,
      body: `Invoice ${inv.id} issued · ${inv.status}`,
      occurredAt: inv.issueDate,
      authorUserId: null,
      _source: 'invoice',
      _ref: inv.id,
    }));
  const jobs = contact.companyId
    ? (s.jobs || [])
        .filter((j) => j.clientId === contact.companyId)
        .map((j) => ({
          id: `syn-job-${j.id}`,
          kind: 'meeting',
          contactId,
          body: `Job scheduled · ${j.status}`,
          occurredAt: j.startAt,
          authorUserId: null,
          _source: 'job',
          _ref: j.id,
        }))
    : [];
  const convoIds = new Set((s.conversations || []).filter((cv) => cv.contactId === contactId).map((cv) => cv.id));
  const msgs = (s.messages || [])
    .filter((m) => convoIds.has(m.conversationId))
    .map((m) => ({
      id: `syn-msg-${m.id}`,
      kind: m.direction === 'in' ? 'email' : 'email',
      contactId,
      body: `${m.direction === 'in' ? 'Received' : 'Sent'}: ${m.text}`,
      occurredAt: m.sentAt,
      authorUserId: m.authorUserId,
      _source: 'message',
      _ref: m.id,
    }));
  return [...explicit, ...invoices, ...jobs, ...msgs].sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
}

// Visibility + permission resolution for contacts.
// Applies both the role-based view permission and the per-contact visibility flag.
export function selectVisibleContactsFor(s, user, permissions) {
  if (!user) return [];
  const contacts = s.contacts || [];
  const viewAll = (permissions || []).find((p) => p.id === 'contacts.view.all')?.roles.includes(user.role);
  return contacts.filter((c) => {
    if (c.lifecycle === 'archived') return false;
    // Visibility gate
    if (c.visibility === 'private') {
      if (user.role === 'owner') return true;
      return c.ownerUserId === user.id;
    }
    if (c.visibility === 'team') {
      if (user.role === 'owner' || user.role === 'admin') return true;
      return viewAll || c.ownerUserId === user.id;
    }
    // 'org' — visible to anyone with contacts.view (checked upstream)
    if (!viewAll && user.role === 'crew') {
      // Crew who doesn't have view.all only sees contacts they own or unassigned org contacts
      return c.ownerUserId === user.id || !c.ownerUserId;
    }
    return true;
  });
}

// Pipeline — contacts in lead/prospect lifecycles with a stage set.
export function selectPipelineContacts(s) {
  return (s.contacts || []).filter(
    (c) => c.lifecycle !== 'archived' && c.stage && (c.lifecycle === 'lead' || c.lifecycle === 'prospect')
  );
}

// Effective permissions for a specific user (for the overrides UI).
export function selectEffectivePermissionsForUser(s, userId) {
  const user = selectUserById(s, userId);
  return effectivePermissions(user, s.permissions, s.userPermissionOverrides || []);
}

// ---------- Derived ----------
export function invoiceTotal(invoice) {
  const sub = (invoice.lineItems || []).reduce((a, li) => a + (Number(li.qty) || 0) * (Number(li.unitPrice) || 0), 0);
  const tax = sub * ((Number(invoice.taxRate) || 0) / 100);
  return Math.round((sub + tax) * 100) / 100;
}

export function invoicePaid(invoice) {
  return (invoice.payments || []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
}

export function invoiceBalance(invoice) {
  return Math.round((invoiceTotal(invoice) - invoicePaid(invoice)) * 100) / 100;
}

export function deriveInvoiceStatus(invoice, now = new Date()) {
  // Keep manual statuses ('draft', 'void', 'paid') authoritative; otherwise derive.
  if (invoice.status === 'draft' || invoice.status === 'void') return invoice.status;
  const balance = invoiceBalance(invoice);
  if (balance <= 0 && invoiceTotal(invoice) > 0) return 'paid';
  if (invoice.dueDate && new Date(invoice.dueDate) < now && balance > 0) return 'overdue';
  return 'pending';
}

// Dashboard summary stats
export function selectDashboardStats(s) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

  const jobsToday = s.jobs.filter((j) => new Date(j.startAt) >= today && new Date(j.startAt) < tomorrow);
  const invoicesThisWeek = s.invoices.filter((inv) => {
    const d = new Date(inv.issueDate);
    return d >= today && d < weekEnd;
  });

  const collected = s.invoices.reduce((a, inv) => a + invoicePaid(inv), 0);
  const outstanding = s.invoices.reduce((a, inv) => {
    const st = deriveInvoiceStatus(inv);
    return st === 'pending' ? a + invoiceBalance(inv) : a;
  }, 0);
  const overdue = s.invoices.reduce((a, inv) => {
    const st = deriveInvoiceStatus(inv);
    return st === 'overdue' ? a + invoiceBalance(inv) : a;
  }, 0);
  const overdueCount = s.invoices.filter((inv) => deriveInvoiceStatus(inv) === 'overdue').length;
  const outstandingCount = s.invoices.filter((inv) => deriveInvoiceStatus(inv) === 'pending').length;

  const activeClients = s.clients.filter((c) => c.status === 'active').length;

  const unreadMessages = s.messages.filter((m) => m.direction === 'in' && !m.readAt).length;

  return {
    jobsToday: jobsToday.length,
    invoicesThisWeek: invoicesThisWeek.length,
    collected,
    outstanding,
    outstandingCount,
    overdue,
    overdueCount,
    activeClients,
    unreadMessages,
    totalInvoices: s.invoices.length,
    weekRevenue: collected, // simplified — expanded in Phase 4
  };
}

// Reminder stats (computed from events)
export function selectReminderStats(s) {
  const start = new Date(); start.setDate(start.getDate() - 30);
  const recent = s.reminderEvents.filter((e) => new Date(e.sentAt) >= start);
  const sent = recent.filter((e) => e.status === 'sent').length;
  const failed = recent.filter((e) => e.status === 'failed').length;
  const total = sent + failed;
  const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 100;
  return {
    sentThisMonth: sent,
    deliveryRate,
    noShowsPrevented: Math.round(sent * 0.06), // synthetic heuristic for prototype
  };
}

// Unread messages count per conversation
export function selectUnreadForConversation(s, conversationId) {
  return s.messages.filter((m) => m.conversationId === conversationId && m.direction === 'in' && !m.readAt).length;
}

// ---------- Messaging inbox helpers (Phase 2a) ----------

// Sort conversations newest-first using denormalized lastMessageAt (falls back to createdAt).
export function sortConversationsByRecency(list) {
  return [...list].sort((a, b) => {
    const aT = a.lastMessageAt || a.createdAt || '';
    const bT = b.lastMessageAt || b.createdAt || '';
    return aT < bT ? 1 : aT > bT ? -1 : 0;
  });
}

// Compute the live status of a conversation, auto-un-snoozing past-due timers.
// Pure read — never mutates state. UIs that care about 'open vs snoozed' should
// call this rather than reading conv.status directly.
export function selectEffectiveStatus(conv, now = Date.now()) {
  if (!conv) return 'open';
  if (conv.status === 'snoozed' && conv.snoozedUntil) {
    if (new Date(conv.snoozedUntil).getTime() <= now) return 'open';
  }
  return conv.status || 'open';
}

// Crew visibility gate — enforced on Team/My for crew role only.
// Crew only see threads they're assigned to, follow, own, or authored into.
function crewCanSee(conv, s, currentUser) {
  const uid = currentUser?.id;
  if (!uid) return false;
  if (conv.assignedUserId === uid) return true;
  if ((conv.followedUserIds || []).includes(uid)) return true;
  const contact = conv.contactId ? (s.contacts || []).find((x) => x.id === conv.contactId) : null;
  if (contact && contact.ownerUserId === uid) return true;
  return (s.messages || []).some((m) => m.conversationId === conv.id && m.authorUserId === uid);
}

// Returns conversations scoped to a given inbox bucket.
//   'my'       — external (sms/email) linked to a contact the current user owns,
//                or where the current user authored a message in the thread,
//                or the thread is explicitly assigned to them.
//   'team'     — all external (sms/email) conversations, regardless of owner.
//                Crew users only see threads they're assigned to, follow, own, or authored into.
//   'internal' — internal-only team chats (channel === 'internal').
//                Crew users only see internal threads they follow or authored into.
export function selectConversationsForInbox(s, inbox, currentUser) {
  // Archived threads drop out of every inbox bucket — they're only reachable via
  // the thread's own permalink or a future "Archived" filter.
  const convos = (s.conversations || []).filter((c) => !c.archived);
  const isCrew = currentUser?.role === 'crew';

  if (inbox === 'internal') {
    let list = convos.filter((c) => c.channel === 'internal');
    if (isCrew) list = list.filter((c) => crewCanSee(c, s, currentUser));
    return sortConversationsByRecency(list);
  }

  const external = convos.filter((c) => c.channel === 'sms' || c.channel === 'email');

  if (inbox === 'team') {
    let list = external;
    if (isCrew) list = list.filter((c) => crewCanSee(c, s, currentUser));
    return sortConversationsByRecency(list);
  }

  // 'my' — owner of linked contact OR participant author OR explicit assignee.
  const userId = currentUser?.id;
  const mine = external.filter((c) => {
    if (!userId) return false;
    if (c.assignedUserId === userId) return true;
    const contact = c.contactId ? (s.contacts || []).find((x) => x.id === c.contactId) : null;
    if (contact && contact.ownerUserId === userId) return true;
    return (s.messages || []).some((m) => m.conversationId === c.id && m.authorUserId === userId);
  });
  return sortConversationsByRecency(mine);
}

// Unread count for a whole inbox bucket (used by the rail badges).
export function selectUnreadCountForInbox(s, inbox, currentUser) {
  const convos = selectConversationsForInbox(s, inbox, currentUser);
  return convos.reduce((acc, c) => acc + selectUnreadForConversation(s, c.id), 0);
}
