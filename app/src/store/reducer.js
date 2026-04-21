// Single reducer for the whole app. Actions are flat and explicit.
// Prefer small, named actions over a generic "update entity" action — easier to trace.

import { newId } from '../lib/ids';
import { nowIso } from '../lib/dates';
import { INITIAL_STATE } from '../data/seed';

export const ACTIONS = {
  RESET: 'RESET',
  HYDRATE: 'HYDRATE',

  SET_CURRENT_USER: 'SET_CURRENT_USER',

  // Company
  UPDATE_COMPANY: 'UPDATE_COMPANY',

  // Services / frequencies
  ADD_SERVICE: 'ADD_SERVICE',
  UPDATE_SERVICE: 'UPDATE_SERVICE',
  DELETE_SERVICE: 'DELETE_SERVICE',
  ADD_FREQUENCY: 'ADD_FREQUENCY',
  UPDATE_FREQUENCY: 'UPDATE_FREQUENCY',
  DELETE_FREQUENCY: 'DELETE_FREQUENCY',

  // Team (users)
  ADD_USER: 'ADD_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',

  // Clients
  ADD_CLIENT: 'ADD_CLIENT',
  UPDATE_CLIENT: 'UPDATE_CLIENT',
  ARCHIVE_CLIENT: 'ARCHIVE_CLIENT',
  UNARCHIVE_CLIENT: 'UNARCHIVE_CLIENT',
  APPEND_CLIENT_NOTE: 'APPEND_CLIENT_NOTE',

  // Contacts (CRM)
  ADD_CONTACT: 'ADD_CONTACT',
  UPDATE_CONTACT: 'UPDATE_CONTACT',
  DELETE_CONTACT: 'DELETE_CONTACT',
  ARCHIVE_CONTACT: 'ARCHIVE_CONTACT',
  TAG_CONTACT: 'TAG_CONTACT',
  UNTAG_CONTACT: 'UNTAG_CONTACT',
  ASSIGN_CONTACT_OWNER: 'ASSIGN_CONTACT_OWNER',
  SET_CONTACT_VISIBILITY: 'SET_CONTACT_VISIBILITY',
  SET_CONTACT_STAGE: 'SET_CONTACT_STAGE',
  SET_CONTACT_LIFECYCLE: 'SET_CONTACT_LIFECYCLE',
  APPEND_CONTACT_NOTE: 'APPEND_CONTACT_NOTE',

  // Tags
  ADD_TAG: 'ADD_TAG',
  UPDATE_TAG: 'UPDATE_TAG',
  DELETE_TAG: 'DELETE_TAG',

  // Contact activities
  ADD_CONTACT_ACTIVITY: 'ADD_CONTACT_ACTIVITY',

  // Per-user permission overrides
  SET_USER_PERMISSION_OVERRIDE: 'SET_USER_PERMISSION_OVERRIDE',

  // Sites
  ADD_SITE: 'ADD_SITE',
  UPDATE_SITE: 'UPDATE_SITE',
  DELETE_SITE: 'DELETE_SITE',

  // Jobs
  ADD_JOB: 'ADD_JOB',
  UPDATE_JOB: 'UPDATE_JOB',
  SET_JOB_STATUS: 'SET_JOB_STATUS',
  DELETE_JOB: 'DELETE_JOB',

  // Invoices
  ADD_INVOICE: 'ADD_INVOICE',
  UPDATE_INVOICE: 'UPDATE_INVOICE',
  ADD_INVOICE_PAYMENT: 'ADD_INVOICE_PAYMENT',
  REMOVE_INVOICE_PAYMENT: 'REMOVE_INVOICE_PAYMENT',
  SET_INVOICE_STATUS: 'SET_INVOICE_STATUS',
  DELETE_INVOICE: 'DELETE_INVOICE',

  // Conversations / messages
  ADD_CONVERSATION: 'ADD_CONVERSATION',
  UPDATE_CONVERSATION: 'UPDATE_CONVERSATION',
  ADD_MESSAGE: 'ADD_MESSAGE',
  MARK_CONVERSATION_READ: 'MARK_CONVERSATION_READ',
  ARCHIVE_CONVERSATION: 'ARCHIVE_CONVERSATION',
  UNARCHIVE_CONVERSATION: 'UNARCHIVE_CONVERSATION',

  // Reminders
  UPDATE_REMINDER_TEMPLATE: 'UPDATE_REMINDER_TEMPLATE',
  ADD_REMINDER_EVENT: 'ADD_REMINDER_EVENT',

  // Permissions
  UPDATE_PERMISSION: 'UPDATE_PERMISSION',
};

function replaceById(list, id, patch) {
  return list.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

function removeById(list, id) {
  return list.filter((x) => x.id !== id);
}

export function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.RESET:
      return INITIAL_STATE;

    case ACTIONS.HYDRATE:
      return action.payload;

    case ACTIONS.SET_CURRENT_USER:
      return { ...state, currentUserId: action.id };

    // ---------- Company ----------
    case ACTIONS.UPDATE_COMPANY:
      return { ...state, company: { ...state.company, ...action.patch } };

    // ---------- Services ----------
    case ACTIONS.ADD_SERVICE:
      return { ...state, services: [...state.services, { id: newId('svc'), defaultDurationMins: 60, ...action.service }] };
    case ACTIONS.UPDATE_SERVICE:
      return { ...state, services: replaceById(state.services, action.id, action.patch) };
    case ACTIONS.DELETE_SERVICE:
      return { ...state, services: removeById(state.services, action.id) };

    case ACTIONS.ADD_FREQUENCY:
      return { ...state, frequencies: [...state.frequencies, { id: newId('frq'), ...action.frequency }] };
    case ACTIONS.UPDATE_FREQUENCY:
      return { ...state, frequencies: replaceById(state.frequencies, action.id, action.patch) };
    case ACTIONS.DELETE_FREQUENCY:
      return { ...state, frequencies: removeById(state.frequencies, action.id) };

    // ---------- Users ----------
    case ACTIONS.ADD_USER: {
      const base = { id: newId('u'), status: 'invited', role: 'crew', createdAt: nowIso(), avatar: ((state.users.length % 5) + 1), initials: '' };
      return { ...state, users: [...state.users, { ...base, ...action.user }] };
    }
    case ACTIONS.UPDATE_USER:
      return { ...state, users: replaceById(state.users, action.id, action.patch) };
    case ACTIONS.DELETE_USER:
      return {
        ...state,
        users: removeById(state.users, action.id),
        userPermissionOverrides: (state.userPermissionOverrides || []).filter((o) => o.userId !== action.id),
      };

    // ---------- Clients ----------
    case ACTIONS.ADD_CLIENT: {
      const base = { id: newId('cl'), status: 'active', revenue: 0, notes: '', createdAt: nowIso(), lastServiceAt: null, primaryContactId: null };
      return { ...state, clients: [...state.clients, { ...base, ...action.client }] };
    }
    case ACTIONS.UPDATE_CLIENT:
      return { ...state, clients: replaceById(state.clients, action.id, action.patch) };
    case ACTIONS.ARCHIVE_CLIENT:
      return { ...state, clients: replaceById(state.clients, action.id, { status: 'inactive', archivedAt: nowIso() }) };
    case ACTIONS.UNARCHIVE_CLIENT:
      return { ...state, clients: replaceById(state.clients, action.id, { status: 'active', archivedAt: null }) };
    case ACTIONS.APPEND_CLIENT_NOTE: {
      const stamp = new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
      return {
        ...state,
        clients: state.clients.map((c) => {
          if (c.id !== action.id) return c;
          const entry = `[${stamp}] ${action.author ? action.author + ': ' : ''}${action.text}`;
          const next = c.notes ? `${entry}\n\n${c.notes}` : entry;
          return { ...c, notes: next };
        }),
      };
    }

    // ---------- Contacts ----------
    case ACTIONS.ADD_CONTACT: {
      const email = (action.contact?.email || '').trim().toLowerCase();
      if (!email) return state; // email is required
      // Uniqueness guard — reject if email is already used.
      const exists = (state.contacts || []).some((c) => (c.email || '').toLowerCase() === email);
      if (exists) return state;
      const base = {
        id: newId('ct'),
        email,
        firstName: '', lastName: '', title: '', phone: '',
        companyId: null, ownerUserId: null,
        tagIds: [],
        visibility: 'org',
        lifecycle: 'lead',
        stage: null, dealValue: null, expectedCloseDate: null, stageChangedAt: nowIso(),
        notes: '', customFields: {},
        createdAt: nowIso(), updatedAt: nowIso(),
      };
      return {
        ...state,
        contacts: [...(state.contacts || []), { ...base, ...action.contact, email }],
      };
    }
    case ACTIONS.UPDATE_CONTACT: {
      const patch = { ...action.patch, updatedAt: nowIso() };
      if (patch.email) {
        const lower = patch.email.trim().toLowerCase();
        const dup = (state.contacts || []).some((c) => c.id !== action.id && (c.email || '').toLowerCase() === lower);
        if (dup) return state; // email must stay unique
        patch.email = lower;
      }
      return { ...state, contacts: replaceById(state.contacts || [], action.id, patch) };
    }
    case ACTIONS.DELETE_CONTACT: {
      // Remove the contact + unwire any FK references so the app doesn't render dangling ids.
      const id = action.id;
      return {
        ...state,
        contacts: (state.contacts || []).filter((c) => c.id !== id),
        clients: state.clients.map((cl) => (cl.primaryContactId === id ? { ...cl, primaryContactId: null } : cl)),
        invoices: state.invoices.map((inv) => (inv.billingContactId === id ? { ...inv, billingContactId: null } : inv)),
        sites: state.sites.map((st) => (st.siteContactId === id ? { ...st, siteContactId: null } : st)),
        conversations: state.conversations.map((cv) => (cv.contactId === id ? { ...cv, contactId: null } : cv)),
        contactActivities: (state.contactActivities || []).filter((a) => a.contactId !== id),
      };
    }
    case ACTIONS.ARCHIVE_CONTACT:
      return { ...state, contacts: replaceById(state.contacts || [], action.id, { lifecycle: 'archived', archivedAt: nowIso(), updatedAt: nowIso() }) };
    case ACTIONS.TAG_CONTACT:
      return {
        ...state,
        contacts: (state.contacts || []).map((c) => {
          if (c.id !== action.id) return c;
          const tagIds = c.tagIds || [];
          if (tagIds.includes(action.tagId)) return c;
          return { ...c, tagIds: [...tagIds, action.tagId], updatedAt: nowIso() };
        }),
      };
    case ACTIONS.UNTAG_CONTACT:
      return {
        ...state,
        contacts: (state.contacts || []).map((c) => {
          if (c.id !== action.id) return c;
          return { ...c, tagIds: (c.tagIds || []).filter((t) => t !== action.tagId), updatedAt: nowIso() };
        }),
      };
    case ACTIONS.ASSIGN_CONTACT_OWNER:
      return { ...state, contacts: replaceById(state.contacts || [], action.id, { ownerUserId: action.userId, updatedAt: nowIso() }) };
    case ACTIONS.SET_CONTACT_VISIBILITY:
      return { ...state, contacts: replaceById(state.contacts || [], action.id, { visibility: action.visibility, updatedAt: nowIso() }) };
    case ACTIONS.SET_CONTACT_STAGE: {
      const now = nowIso();
      const prev = (state.contacts || []).find((c) => c.id === action.id);
      if (!prev) return state;
      const activity = {
        id: newId('act'),
        contactId: action.id,
        kind: 'stage_change',
        authorUserId: action.authorUserId || state.currentUserId,
        body: `Stage: ${prev.stage || '—'} → ${action.stage}`,
        occurredAt: now,
      };
      return {
        ...state,
        contacts: replaceById(state.contacts || [], action.id, {
          stage: action.stage,
          stageChangedAt: now,
          updatedAt: now,
          // Move to 'customer' lifecycle automatically on 'won'; 'archived' on 'lost' stays lead unless caller sets lifecycle.
          lifecycle: action.stage === 'won' ? 'customer' : prev.lifecycle,
        }),
        contactActivities: [...(state.contactActivities || []), activity],
      };
    }
    case ACTIONS.SET_CONTACT_LIFECYCLE:
      return { ...state, contacts: replaceById(state.contacts || [], action.id, { lifecycle: action.lifecycle, updatedAt: nowIso() }) };
    case ACTIONS.APPEND_CONTACT_NOTE: {
      const now = nowIso();
      const activity = {
        id: newId('act'),
        contactId: action.id,
        kind: 'note',
        authorUserId: action.authorUserId || state.currentUserId,
        body: action.text,
        occurredAt: now,
      };
      return {
        ...state,
        contacts: (state.contacts || []).map((c) => {
          if (c.id !== action.id) return c;
          const stamp = new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
          const entry = `[${stamp}] ${action.text}`;
          const next = c.notes ? `${entry}\n\n${c.notes}` : entry;
          return { ...c, notes: next, updatedAt: now };
        }),
        contactActivities: [...(state.contactActivities || []), activity],
      };
    }

    // ---------- Tags ----------
    case ACTIONS.ADD_TAG: {
      const base = { id: newId('tg'), color: 'slate', scope: 'contact' };
      return { ...state, tags: [...(state.tags || []), { ...base, ...action.tag }] };
    }
    case ACTIONS.UPDATE_TAG:
      return { ...state, tags: replaceById(state.tags || [], action.id, action.patch) };
    case ACTIONS.DELETE_TAG:
      return {
        ...state,
        tags: (state.tags || []).filter((t) => t.id !== action.id),
        contacts: (state.contacts || []).map((c) => ({
          ...c,
          tagIds: (c.tagIds || []).filter((tid) => tid !== action.id),
        })),
      };

    // ---------- Contact activities ----------
    case ACTIONS.ADD_CONTACT_ACTIVITY: {
      const base = { id: newId('act'), occurredAt: nowIso(), authorUserId: state.currentUserId };
      return { ...state, contactActivities: [...(state.contactActivities || []), { ...base, ...action.activity }] };
    }

    // ---------- Per-user permission overrides ----------
    case ACTIONS.SET_USER_PERMISSION_OVERRIDE: {
      const { userId, grants = [], revokes = [] } = action;
      const existing = (state.userPermissionOverrides || []).find((o) => o.userId === userId);
      const isEmpty = grants.length === 0 && revokes.length === 0;
      let next = state.userPermissionOverrides || [];
      if (isEmpty) {
        next = next.filter((o) => o.userId !== userId);
      } else if (existing) {
        next = next.map((o) => (o.userId === userId ? { userId, grants, revokes } : o));
      } else {
        next = [...next, { userId, grants, revokes }];
      }
      return { ...state, userPermissionOverrides: next };
    }

    // ---------- Sites ----------
    case ACTIONS.ADD_SITE: {
      const base = { id: newId('st'), accessNotes: '', createdAt: nowIso(), siteContactId: null };
      return { ...state, sites: [...state.sites, { ...base, ...action.site }] };
    }
    case ACTIONS.UPDATE_SITE:
      return { ...state, sites: replaceById(state.sites, action.id, action.patch) };
    case ACTIONS.DELETE_SITE:
      return { ...state, sites: removeById(state.sites, action.id) };

    // ---------- Jobs ----------
    case ACTIONS.ADD_JOB: {
      const base = { id: newId('j'), status: 'upcoming', crewIds: [], notes: '', createdAt: nowIso() };
      return { ...state, jobs: [...state.jobs, { ...base, ...action.job }] };
    }
    case ACTIONS.UPDATE_JOB:
      return { ...state, jobs: replaceById(state.jobs, action.id, action.patch) };
    case ACTIONS.SET_JOB_STATUS:
      return { ...state, jobs: replaceById(state.jobs, action.id, { status: action.status }) };
    case ACTIONS.DELETE_JOB:
      return { ...state, jobs: removeById(state.jobs, action.id) };

    // ---------- Invoices ----------
    case ACTIONS.ADD_INVOICE: {
      const base = { id: action.invoice?.id || nextInvoiceId(state), jobIds: [], lineItems: [], payments: [], taxRate: state.company.taxRate || 0, status: 'pending', createdAt: nowIso(), billingContactId: null };
      return { ...state, invoices: [...state.invoices, { ...base, ...action.invoice, id: base.id }] };
    }
    case ACTIONS.UPDATE_INVOICE:
      return { ...state, invoices: replaceById(state.invoices, action.id, action.patch) };
    case ACTIONS.ADD_INVOICE_PAYMENT: {
      const pay = { id: newId('pay'), date: action.payment?.date || nowIso(), amount: 0, method: '', note: '', ...action.payment };
      return {
        ...state,
        invoices: state.invoices.map((inv) => (inv.id === action.id ? { ...inv, payments: [...inv.payments, pay] } : inv)),
      };
    }
    case ACTIONS.REMOVE_INVOICE_PAYMENT:
      return {
        ...state,
        invoices: state.invoices.map((inv) => (inv.id === action.id ? { ...inv, payments: inv.payments.filter((p) => p.id !== action.paymentId) } : inv)),
      };
    case ACTIONS.SET_INVOICE_STATUS:
      return { ...state, invoices: replaceById(state.invoices, action.id, { status: action.status }) };
    case ACTIONS.DELETE_INVOICE:
      return { ...state, invoices: removeById(state.invoices, action.id) };

    // ---------- Conversations / messages ----------
    case ACTIONS.ADD_CONVERSATION: {
      const base = { id: newId('cv'), channel: 'sms', archived: false, createdAt: nowIso(), contactId: null };
      return { ...state, conversations: [...state.conversations, { ...base, ...action.conversation }] };
    }
    case ACTIONS.UPDATE_CONVERSATION:
      return { ...state, conversations: replaceById(state.conversations, action.id, action.patch) };
    case ACTIONS.ADD_MESSAGE: {
      const base = { id: newId('m'), direction: 'out', sentAt: nowIso(), readAt: null, authorUserId: null };
      return { ...state, messages: [...state.messages, { ...base, ...action.message }] };
    }
    case ACTIONS.MARK_CONVERSATION_READ: {
      const t = nowIso();
      return {
        ...state,
        messages: state.messages.map((m) => (m.conversationId === action.id && !m.readAt && m.direction === 'in' ? { ...m, readAt: t } : m)),
      };
    }
    case ACTIONS.ARCHIVE_CONVERSATION:
      return { ...state, conversations: replaceById(state.conversations, action.id, { archived: true }) };
    case ACTIONS.UNARCHIVE_CONVERSATION:
      return { ...state, conversations: replaceById(state.conversations, action.id, { archived: false }) };

    // ---------- Reminders ----------
    case ACTIONS.UPDATE_REMINDER_TEMPLATE:
      return { ...state, reminderTemplates: replaceById(state.reminderTemplates, action.id, action.patch) };
    case ACTIONS.ADD_REMINDER_EVENT: {
      const base = { id: newId('re'), channel: 'sms', status: 'sent', sentAt: nowIso() };
      return { ...state, reminderEvents: [...state.reminderEvents, { ...base, ...action.event }] };
    }

    // ---------- Permissions ----------
    case ACTIONS.UPDATE_PERMISSION:
      return { ...state, permissions: replaceById(state.permissions, action.id, action.patch) };

    default:
      return state;
  }
}

function nextInvoiceId(state) {
  const prefix = state.company.invoicePrefix || 'INV';
  const numbers = state.invoices
    .map((inv) => {
      const m = String(inv.id).match(new RegExp(`^${prefix}-(\\d+)$`));
      return m ? Number(m[1]) : 0;
    })
    .filter(Boolean);
  const next = (numbers.length ? Math.max(...numbers) : 1000) + 1;
  return `${prefix}-${next}`;
}
