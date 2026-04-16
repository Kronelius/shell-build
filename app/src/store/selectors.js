// Selectors — read-only helpers over state. Kept pure; callers can memoize if hot.

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

// ---------- Lookups ----------
export const selectClientById = (s, id) => s.clients.find((c) => c.id === id) || null;
export const selectSiteById   = (s, id) => s.sites.find((x) => x.id === id) || null;
export const selectServiceById = (s, id) => s.services.find((x) => x.id === id) || null;
export const selectUserById    = (s, id) => s.users.find((x) => x.id === id) || null;
export const selectJobById     = (s, id) => s.jobs.find((x) => x.id === id) || null;
export const selectInvoiceById = (s, id) => s.invoices.find((x) => x.id === id) || null;
export const selectConversationById = (s, id) => s.conversations.find((x) => x.id === id) || null;

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
