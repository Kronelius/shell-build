// Single reducer for the whole app. Actions are flat and explicit.
// Prefer small, named actions over a generic "update entity" action — easier to trace.

import { newId } from '../lib/ids';
import { nowIso } from '../lib/dates';
import { expandRecurrence } from '../lib/recurrence';
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
  DELETE_CLIENT: 'DELETE_CLIENT',
  APPEND_CLIENT_NOTE: 'APPEND_CLIENT_NOTE',
  ADD_CLIENT_ACTIVITY: 'ADD_CLIENT_ACTIVITY',
  UPDATE_CLIENT_ACTIVITY: 'UPDATE_CLIENT_ACTIVITY',
  DELETE_CLIENT_ACTIVITY: 'DELETE_CLIENT_ACTIVITY',

  // Contacts (CRM)
  ADD_CONTACT: 'ADD_CONTACT',
  UPDATE_CONTACT: 'UPDATE_CONTACT',
  DELETE_CONTACT: 'DELETE_CONTACT',
  TAG_CONTACT: 'TAG_CONTACT',
  UNTAG_CONTACT: 'UNTAG_CONTACT',
  ASSIGN_CONTACT_OWNER: 'ASSIGN_CONTACT_OWNER',
  SET_CONTACT_STAGE: 'SET_CONTACT_STAGE',
  APPEND_CONTACT_NOTE: 'APPEND_CONTACT_NOTE',

  // Tags
  ADD_TAG: 'ADD_TAG',
  UPDATE_TAG: 'UPDATE_TAG',
  DELETE_TAG: 'DELETE_TAG',

  // Contact activities
  ADD_CONTACT_ACTIVITY: 'ADD_CONTACT_ACTIVITY',
  UPDATE_CONTACT_ACTIVITY: 'UPDATE_CONTACT_ACTIVITY',
  DELETE_CONTACT_ACTIVITY: 'DELETE_CONTACT_ACTIVITY',

  // Per-user permission overrides
  SET_USER_PERMISSION_OVERRIDE: 'SET_USER_PERMISSION_OVERRIDE',

  // Sites
  ADD_SITE: 'ADD_SITE',
  UPDATE_SITE: 'UPDATE_SITE',
  DELETE_SITE: 'DELETE_SITE',

  // Jobs
  ADD_JOB: 'ADD_JOB',
  ADD_JOB_SERIES: 'ADD_JOB_SERIES',
  UPDATE_JOB: 'UPDATE_JOB',
  UPDATE_JOB_SERIES: 'UPDATE_JOB_SERIES',
  SET_JOB_STATUS: 'SET_JOB_STATUS',
  DELETE_JOB: 'DELETE_JOB',
  DELETE_JOB_SERIES: 'DELETE_JOB_SERIES',

  // Invoices
  ADD_INVOICE: 'ADD_INVOICE',
  UPDATE_INVOICE: 'UPDATE_INVOICE',
  ADD_INVOICE_PAYMENT: 'ADD_INVOICE_PAYMENT',
  REMOVE_INVOICE_PAYMENT: 'REMOVE_INVOICE_PAYMENT',
  SET_INVOICE_STATUS: 'SET_INVOICE_STATUS',
  DELETE_INVOICE: 'DELETE_INVOICE',

  // Conversations / messages
  ADD_CONVERSATION: 'ADD_CONVERSATION',
  ADD_DM_CONVERSATION: 'ADD_DM_CONVERSATION',
  ADD_INTERNAL_CONVERSATION: 'ADD_INTERNAL_CONVERSATION',
  UPDATE_CONVERSATION: 'UPDATE_CONVERSATION',
  ADD_MESSAGE: 'ADD_MESSAGE',
  MARK_CONVERSATION_READ: 'MARK_CONVERSATION_READ',
  MARK_CONVERSATION_UNREAD: 'MARK_CONVERSATION_UNREAD',
  DELETE_CONVERSATION: 'DELETE_CONVERSATION',

  // Snippets (Messaging Phase 2a)
  ADD_SNIPPET: 'ADD_SNIPPET',
  UPDATE_SNIPPET: 'UPDATE_SNIPPET',
  DELETE_SNIPPET: 'DELETE_SNIPPET',
  ADD_SNIPPET_FOLDER: 'ADD_SNIPPET_FOLDER',
  DELETE_SNIPPET_FOLDER: 'DELETE_SNIPPET_FOLDER',

  // Messaging Phase 2b — assignment / status / starring / following / folders / bulk
  ASSIGN_CONVERSATION: 'ASSIGN_CONVERSATION',
  SET_CONVERSATION_STATUS: 'SET_CONVERSATION_STATUS',
  SNOOZE_CONVERSATION: 'SNOOZE_CONVERSATION',
  UNSNOOZE_CONVERSATION: 'UNSNOOZE_CONVERSATION',
  TOGGLE_CONVERSATION_STAR: 'TOGGLE_CONVERSATION_STAR',
  TOGGLE_CONVERSATION_FOLLOW: 'TOGGLE_CONVERSATION_FOLLOW',
  BULK_MARK_CONVERSATIONS_READ: 'BULK_MARK_CONVERSATIONS_READ',
  BULK_MARK_CONVERSATIONS_UNREAD: 'BULK_MARK_CONVERSATIONS_UNREAD',
  BULK_DELETE_CONVERSATIONS: 'BULK_DELETE_CONVERSATIONS',
  BULK_ASSIGN_CONVERSATIONS: 'BULK_ASSIGN_CONVERSATIONS',

  // Reminders
  UPDATE_REMINDER_TEMPLATE: 'UPDATE_REMINDER_TEMPLATE',
  ADD_REMINDER_EVENT: 'ADD_REMINDER_EVENT',
  UPDATE_REMINDER_EVENT: 'UPDATE_REMINDER_EVENT',
  MARK_REMINDER_EVENT_READ: 'MARK_REMINDER_EVENT_READ',
  MARK_REMINDER_EVENT_UNREAD: 'MARK_REMINDER_EVENT_UNREAD',
  RETRY_REMINDER_EVENT: 'RETRY_REMINDER_EVENT',

  // Permissions
  UPDATE_PERMISSION: 'UPDATE_PERMISSION',

  // Pipelines (v15)
  ADD_PIPELINE: 'ADD_PIPELINE',
  UPDATE_PIPELINE: 'UPDATE_PIPELINE',
  DELETE_PIPELINE: 'DELETE_PIPELINE',
  SET_ACTIVE_PIPELINE: 'SET_ACTIVE_PIPELINE',
  ADD_PIPELINE_STAGE: 'ADD_PIPELINE_STAGE',
  UPDATE_PIPELINE_STAGE: 'UPDATE_PIPELINE_STAGE',
  DELETE_PIPELINE_STAGE: 'DELETE_PIPELINE_STAGE',
  REORDER_PIPELINE_STAGES: 'REORDER_PIPELINE_STAGES',

  // Invitations
  SEND_INVITATION: 'SEND_INVITATION',
  RESEND_INVITATION: 'RESEND_INVITATION',
  REVOKE_INVITATION: 'REVOKE_INVITATION',

  // Integrations / Twilio (v8)
  CONNECT_TWILIO: 'CONNECT_TWILIO',
  DISCONNECT_TWILIO: 'DISCONNECT_TWILIO',
  UPDATE_TWILIO_NUMBER: 'UPDATE_TWILIO_NUMBER',
  UPDATE_TWILIO_WEBHOOK: 'UPDATE_TWILIO_WEBHOOK',
  UPDATE_TWILIO_ERROR: 'UPDATE_TWILIO_ERROR',
  SUBMIT_A2P: 'SUBMIT_A2P',
  UPDATE_A2P_STATUS: 'UPDATE_A2P_STATUS',
  RESET_A2P: 'RESET_A2P',
  // Inbound/outbound SMS plumbing — adds delivery state to messages and routes inbound to threads.
  RECEIVE_SMS: 'RECEIVE_SMS',
  SET_MESSAGE_DELIVERY: 'SET_MESSAGE_DELIVERY',
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
    case ACTIONS.DELETE_SERVICE: {
      const id = action.id;
      return {
        ...state,
        services: removeById(state.services, id),
        clients: state.clients.map((c) => (c.serviceId === id ? { ...c, serviceId: null } : c)),
        jobs: state.jobs.map((j) => (j.serviceId === id ? { ...j, serviceId: null } : j)),
      };
    }

    case ACTIONS.ADD_FREQUENCY:
      return { ...state, frequencies: [...state.frequencies, { id: newId('frq'), ...action.frequency }] };
    case ACTIONS.UPDATE_FREQUENCY:
      return { ...state, frequencies: replaceById(state.frequencies, action.id, action.patch) };
    case ACTIONS.DELETE_FREQUENCY: {
      const id = action.id;
      return {
        ...state,
        frequencies: removeById(state.frequencies, id),
        clients: state.clients.map((c) => (c.frequencyId === id ? { ...c, frequencyId: null } : c)),
      };
    }

    // ---------- Users ----------
    case ACTIONS.ADD_USER: {
      const base = { id: newId('u'), status: 'invited', role: 'crew', createdAt: nowIso(), avatar: ((state.users.length % 5) + 1), initials: '' };
      return { ...state, users: [...state.users, { ...base, ...action.user }] };
    }
    case ACTIONS.UPDATE_USER:
      return { ...state, users: replaceById(state.users, action.id, action.patch) };
    case ACTIONS.DELETE_USER: {
      const id = action.id;
      return {
        ...state,
        users: removeById(state.users, id),
        userPermissionOverrides: (state.userPermissionOverrides || []).filter((o) => o.userId !== id),
        contacts: (state.contacts || []).map((c) => (c.ownerUserId === id ? { ...c, ownerUserId: null } : c)),
        jobs: state.jobs.map((j) => (
          (j.crewIds || []).includes(id) ? { ...j, crewIds: j.crewIds.filter((u) => u !== id) } : j
        )),
        conversations: state.conversations.map((cv) => {
          const next = { ...cv };
          if (next.assignedUserId === id) next.assignedUserId = null;
          if ((next.followedUserIds || []).includes(id)) next.followedUserIds = next.followedUserIds.filter((u) => u !== id);
          return next;
        }),
        messages: state.messages.map((m) => (m.authorUserId === id ? { ...m, authorUserId: null } : m)),
        contactActivities: (state.contactActivities || []).map((a) => (a.authorUserId === id ? { ...a, authorUserId: null } : a)),
      };
    }

    // ---------- Clients ----------
    case ACTIONS.ADD_CLIENT: {
      const base = { id: newId('cl'), status: 'active', revenue: 0, notes: '', createdAt: nowIso(), lastServiceAt: null, primaryContactId: null };
      return { ...state, clients: [...state.clients, { ...base, ...action.client }] };
    }
    case ACTIONS.UPDATE_CLIENT:
      return { ...state, clients: replaceById(state.clients, action.id, action.patch) };
    case ACTIONS.DELETE_CLIENT: {
      // Cascade-delete: an account takes its contacts, sites, jobs, invoices, and activities with it.
      // Conversations attached to deleted contacts have their contactId/clientId nulled (the message
      // history is preserved as "Unlinked" — only the entity rows are gone).
      const id = action.id;
      const contactsToDelete = new Set(
        (state.contacts || []).filter((c) => c.companyId === id).map((c) => c.id)
      );
      return {
        ...state,
        clients: (state.clients || []).filter((c) => c.id !== id),
        contacts: (state.contacts || []).filter((c) => !contactsToDelete.has(c.id)),
        sites: (state.sites || []).filter((s) => s.clientId !== id),
        jobs: (state.jobs || []).filter((j) => j.clientId !== id),
        invoices: (state.invoices || []).filter((inv) => inv.clientId !== id),
        clientActivities: (state.clientActivities || []).filter((a) => a.clientId !== id),
        contactActivities: (state.contactActivities || []).filter((a) => !contactsToDelete.has(a.contactId)),
        conversations: (state.conversations || []).map((cv) => {
          const next = { ...cv };
          if (contactsToDelete.has(cv.contactId)) next.contactId = null;
          if (cv.clientId === id) next.clientId = null;
          return next;
        }),
      };
    }
    case ACTIONS.APPEND_CLIENT_NOTE: {
      const now = nowIso();
      const stamp = new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
      const authorUserId = action.authorUserId || state.currentUserId;
      const activity = {
        id: newId('clact'),
        clientId: action.id,
        kind: 'note',
        authorUserId,
        body: action.text,
        occurredAt: now,
        createdAt: now,
      };
      return {
        ...state,
        clients: state.clients.map((c) => {
          if (c.id !== action.id) return c;
          const entry = `[${stamp}] ${action.author ? action.author + ': ' : ''}${action.text}`;
          const next = c.notes ? `${entry}\n\n${c.notes}` : entry;
          return { ...c, notes: next };
        }),
        clientActivities: [...(state.clientActivities || []), activity],
      };
    }
    case ACTIONS.ADD_CLIENT_ACTIVITY: {
      const base = { id: newId('clact'), occurredAt: nowIso(), createdAt: nowIso(), authorUserId: state.currentUserId };
      return { ...state, clientActivities: [...(state.clientActivities || []), { ...base, ...action.activity }] };
    }
    case ACTIONS.UPDATE_CLIENT_ACTIVITY: {
      return {
        ...state,
        clientActivities: (state.clientActivities || []).map((a) =>
          a.id === action.id ? { ...a, ...action.patch } : a
        ),
      };
    }
    case ACTIONS.DELETE_CLIENT_ACTIVITY: {
      return {
        ...state,
        clientActivities: (state.clientActivities || []).filter((a) => a.id !== action.id),
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
    case ACTIONS.SET_CONTACT_STAGE: {
      const now = nowIso();
      const all = state.contacts || [];
      const prev = all.find((c) => c.id === action.id);
      if (!prev) return state;
      const stageChanged = prev.stage !== action.stage;
      const pipelineId = action.pipelineId || prev.pipelineId || state.activePipelineId;
      const patched = {
        ...prev,
        stage: action.stage,
        pipelineId: action.stage ? pipelineId : null,
        stageChangedAt: stageChanged ? now : prev.stageChangedAt,
        updatedAt: now,
        lifecycle: action.stage === 'won' ? 'customer' : prev.lifecycle,
      };
      // Optional reorder: `insertBeforeId` places the moved contact immediately before that contact in the
      // global contacts array. If null/absent, append after the last contact currently in the target stage.
      const without = all.filter((c) => c.id !== action.id);
      let nextContacts;
      if (action.insertBeforeId) {
        const i = without.findIndex((c) => c.id === action.insertBeforeId);
        nextContacts = i >= 0
          ? [...without.slice(0, i), patched, ...without.slice(i)]
          : [...without, patched];
      } else {
        // Append after the last contact in the target stage to keep intra-stage order natural.
        let lastIdx = -1;
        for (let i = 0; i < without.length; i++) {
          if (without[i].stage === action.stage) lastIdx = i;
        }
        nextContacts = lastIdx >= 0
          ? [...without.slice(0, lastIdx + 1), patched, ...without.slice(lastIdx + 1)]
          : [...without, patched];
      }
      // Only log activity when the stage actually changed (pure reorders are silent).
      const activity = stageChanged ? [{
        id: newId('act'),
        contactId: action.id,
        kind: 'stage_change',
        authorUserId: action.authorUserId || state.currentUserId,
        body: `Stage: ${prev.stage || '—'} → ${action.stage}`,
        occurredAt: now,
      }] : [];
      return {
        ...state,
        contacts: nextContacts,
        contactActivities: [...(state.contactActivities || []), ...activity],
      };
    }
    case ACTIONS.APPEND_CONTACT_NOTE: {
      const now = nowIso();
      const authorUserId = action.authorUserId || state.currentUserId;
      const author = state.users.find((u) => u.id === authorUserId);
      const authorName = author?.name || 'Someone';
      const activity = {
        id: newId('act'),
        contactId: action.id,
        kind: 'note',
        authorUserId,
        body: action.text,
        occurredAt: now,
      };
      return {
        ...state,
        contacts: (state.contacts || []).map((c) => {
          if (c.id !== action.id) return c;
          const stamp = new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
          const entry = `[${stamp}] ${authorName}: ${action.text}`;
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
      const base = { id: newId('act'), occurredAt: nowIso(), createdAt: nowIso(), authorUserId: state.currentUserId };
      return { ...state, contactActivities: [...(state.contactActivities || []), { ...base, ...action.activity }] };
    }
    case ACTIONS.UPDATE_CONTACT_ACTIVITY: {
      return {
        ...state,
        contactActivities: (state.contactActivities || []).map((a) =>
          a.id === action.id ? { ...a, ...action.patch } : a
        ),
      };
    }
    case ACTIONS.DELETE_CONTACT_ACTIVITY: {
      return {
        ...state,
        contactActivities: (state.contactActivities || []).filter((a) => a.id !== action.id),
      };
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
    case ACTIONS.DELETE_SITE: {
      const id = action.id;
      return {
        ...state,
        sites: removeById(state.sites, id),
        jobs: state.jobs.map((j) => (j.siteId === id ? { ...j, siteId: null } : j)),
        invoices: state.invoices.map((inv) => (inv.siteId === id ? { ...inv, siteId: null } : inv)),
      };
    }

    // ---------- Jobs ----------
    case ACTIONS.ADD_JOB: {
      const base = { id: newId('j'), status: 'upcoming', crewIds: [], notes: '', seriesId: null, recurrence: null, createdAt: nowIso() };
      return { ...state, jobs: [...state.jobs, { ...base, ...action.job }] };
    }
    case ACTIONS.ADD_JOB_SERIES: {
      const seriesId = newId('ser');
      const ts = nowIso();
      const master = { id: newId('j'), status: 'upcoming', crewIds: [], notes: '', ...action.baseJob, seriesId, recurrence: action.recurrence, createdAt: ts };
      const instances = expandRecurrence({ startAt: master.startAt, endAt: master.endAt, recurrence: action.recurrence });
      const children = instances.map((inst) => ({
        ...master, ...inst, id: newId('j'), recurrence: null, createdAt: ts,
      }));
      return { ...state, jobs: [...state.jobs, master, ...children] };
    }
    case ACTIONS.UPDATE_JOB:
      return { ...state, jobs: replaceById(state.jobs, action.id, action.patch) };
    case ACTIONS.UPDATE_JOB_SERIES: {
      return {
        ...state,
        jobs: state.jobs.map((j) => {
          if (j.seriesId !== action.seriesId) return j;
          if (j.status !== 'upcoming') return j;
          if (action.fromDate && j.startAt < action.fromDate) return j;
          return { ...j, ...action.patch };
        }),
      };
    }
    case ACTIONS.SET_JOB_STATUS:
      return { ...state, jobs: replaceById(state.jobs, action.id, { status: action.status }) };
    case ACTIONS.DELETE_JOB: {
      const id = action.id;
      return {
        ...state,
        jobs: removeById(state.jobs, id),
        invoices: state.invoices.map((inv) => (
          (inv.jobIds || []).includes(id) ? { ...inv, jobIds: inv.jobIds.filter((j) => j !== id) } : inv
        )),
        reminderEvents: (state.reminderEvents || []).filter((e) => e.jobId !== id),
      };
    }
    case ACTIONS.DELETE_JOB_SERIES: {
      const removedIds = new Set(
        state.jobs
          .filter((j) => {
            if (j.seriesId !== action.seriesId) return false;
            if (j.status !== 'upcoming') return false;
            if (action.fromDate && j.startAt < action.fromDate) return false;
            return true;
          })
          .map((j) => j.id)
      );
      return {
        ...state,
        jobs: state.jobs.filter((j) => !removedIds.has(j.id)),
        invoices: state.invoices.map((inv) => {
          const ids = (inv.jobIds || []).filter((id) => !removedIds.has(id));
          return ids.length === (inv.jobIds || []).length ? inv : { ...inv, jobIds: ids };
        }),
        reminderEvents: (state.reminderEvents || []).filter((e) => !removedIds.has(e.jobId)),
      };
    }

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
      const now = nowIso();
      const base = {
        id: newId('cv'), channel: 'sms',
        createdAt: now, lastMessageAt: now,
        contactId: null, clientId: null, title: null,
        // Phase 2b fields — sensible defaults so old/new convos stay comparable.
        assignedUserId: null,
        status: 'open',
        snoozedUntil: null,
        starred: false,
        followedUserIds: [],
      };
      return { ...state, conversations: [...state.conversations, { ...base, ...action.conversation }] };
    }
    case ACTIONS.ADD_DM_CONVERSATION: {
      const pair = Array.isArray(action.participantUserIds) ? [...action.participantUserIds] : [];
      if (pair.length !== 2) return state;
      if (pair[0] === pair[1]) return state; // self-DM guard
      const sorted = [...pair].sort();
      // Dedupe: if a DM between the same pair exists, don't create another.
      const existing = state.conversations.find((c) => {
        if (c.channel !== 'dm') return false;
        const p = (c.participantUserIds || []).slice().sort();
        return p.length === 2 && p[0] === sorted[0] && p[1] === sorted[1];
      });
      if (existing) return state;
      const now = nowIso();
      const conversation = {
        id: action.id || newId('cv'),
        channel: 'dm',
        participantUserIds: sorted,
        clientId: null,
        contactId: null,
        title: null,
        createdAt: now,
        lastMessageAt: now,
        assignedUserId: null,
        status: 'open',
        snoozedUntil: null,
        starred: false,
        followedUserIds: [],
      };
      return { ...state, conversations: [...state.conversations, conversation] };
    }
    case ACTIONS.ADD_INTERNAL_CONVERSATION: {
      // Public team thread — visible to all staff. Permission gate (messaging.startInternalThread)
      // is enforced at the call site, not here. Caller may pass an optional firstMessage to seed
      // the thread non-empty, and an optional id for deterministic navigation.
      const title = (action.title || '').trim();
      if (!title) return state;
      const id = action.id || newId('cv');
      const now = nowIso();
      const conversation = {
        id,
        channel: 'internal',
        contactId: null,
        clientId: null,
        title,
        createdAt: now,
        lastMessageAt: now,
        assignedUserId: null,
        status: 'open',
        snoozedUntil: null,
        starred: false,
        followedUserIds: [],
      };
      const firstBody = (action.firstMessage || '').trim();
      const messages = firstBody
        ? [
            ...state.messages,
            {
              id: newId('m'),
              conversationId: id,
              direction: 'internal',
              text: firstBody,
              authorUserId: action.authorUserId || state.currentUserId || null,
              snippetId: null,
              sentAt: now,
              readAt: null,
            },
          ]
        : state.messages;
      return {
        ...state,
        conversations: [...(state.conversations || []), conversation],
        messages,
      };
    }
    case ACTIONS.UPDATE_CONVERSATION:
      return { ...state, conversations: replaceById(state.conversations, action.id, action.patch) };
    case ACTIONS.ADD_MESSAGE: {
      const base = {
        id: newId('m'), direction: 'out', sentAt: nowIso(),
        readAt: null, authorUserId: null, snippetId: null,
      };
      const msg = { ...base, ...action.message };
      return {
        ...state,
        messages: [...state.messages, msg],
        // Keep conversation.lastMessageAt in sync so thread list sorts correctly.
        conversations: replaceById(state.conversations, msg.conversationId, { lastMessageAt: msg.sentAt }),
      };
    }
    case ACTIONS.MARK_CONVERSATION_READ: {
      const t = nowIso();
      const conv = state.conversations.find((c) => c.id === action.id);
      const uid = action.currentUserId || state.currentUserId;
      const isDm = conv?.channel === 'dm';
      return {
        ...state,
        messages: state.messages.map((m) => {
          if (m.conversationId !== action.id || m.readAt) return m;
          if (isDm) {
            return m.authorUserId && m.authorUserId !== uid ? { ...m, readAt: t } : m;
          }
          return m.direction === 'in' ? { ...m, readAt: t } : m;
        }),
      };
    }
    case ACTIONS.MARK_CONVERSATION_UNREAD: {
      // Unset readAt on the most recent inbound (or DM-from-other) message so the thread surfaces again.
      const conv = state.conversations.find((c) => c.id === action.id);
      const uid = action.currentUserId || state.currentUserId;
      const isDm = conv?.channel === 'dm';
      const candidates = state.messages
        .filter((m) => {
          if (m.conversationId !== action.id) return false;
          if (isDm) return m.authorUserId && m.authorUserId !== uid;
          return m.direction === 'in';
        })
        .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
      const target = candidates[0];
      if (!target) return state;
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === target.id ? { ...m, readAt: null } : m)),
      };
    }
    case ACTIONS.DELETE_CONVERSATION: {
      const id = action.id;
      return {
        ...state,
        conversations: (state.conversations || []).filter((c) => c.id !== id),
        messages: (state.messages || []).filter((m) => m.conversationId !== id),
      };
    }

    // ---------- Snippets ----------
    case ACTIONS.ADD_SNIPPET: {
      const base = { id: newId('sn'), label: '', body: '', channel: 'all', folderId: null };
      return { ...state, snippets: [...(state.snippets || []), { ...base, ...action.snippet }] };
    }
    case ACTIONS.UPDATE_SNIPPET:
      return { ...state, snippets: replaceById(state.snippets || [], action.id, action.patch) };
    case ACTIONS.DELETE_SNIPPET:
      return { ...state, snippets: (state.snippets || []).filter((s) => s.id !== action.id) };
    case ACTIONS.ADD_SNIPPET_FOLDER: {
      const base = { id: newId('snf'), label: '' };
      return { ...state, snippetFolders: [...(state.snippetFolders || []), { ...base, ...action.folder }] };
    }
    case ACTIONS.DELETE_SNIPPET_FOLDER:
      return {
        ...state,
        snippetFolders: (state.snippetFolders || []).filter((f) => f.id !== action.id),
        // Orphan snippets are kept but moved to "no folder" so they stay reachable.
        snippets: (state.snippets || []).map((s) => (s.folderId === action.id ? { ...s, folderId: null } : s)),
      };

    // ---------- Messaging Phase 2b ----------
    case ACTIONS.ASSIGN_CONVERSATION:
      return { ...state, conversations: replaceById(state.conversations, action.id, { assignedUserId: action.userId || null }) };

    case ACTIONS.SET_CONVERSATION_STATUS: {
      const patch = { status: action.status };
      // Opening an existing convo clears any stale snooze timer.
      if (action.status === 'open') patch.snoozedUntil = null;
      return { ...state, conversations: replaceById(state.conversations, action.id, patch) };
    }
    case ACTIONS.SNOOZE_CONVERSATION:
      return { ...state, conversations: replaceById(state.conversations, action.id, { status: 'snoozed', snoozedUntil: action.until }) };
    case ACTIONS.UNSNOOZE_CONVERSATION:
      return { ...state, conversations: replaceById(state.conversations, action.id, { status: 'open', snoozedUntil: null }) };

    case ACTIONS.TOGGLE_CONVERSATION_STAR: {
      const existing = state.conversations.find((c) => c.id === action.id);
      if (!existing) return state;
      return { ...state, conversations: replaceById(state.conversations, action.id, { starred: !existing.starred }) };
    }
    case ACTIONS.TOGGLE_CONVERSATION_FOLLOW: {
      const existing = state.conversations.find((c) => c.id === action.id);
      if (!existing) return state;
      const current = existing.followedUserIds || [];
      const next = current.includes(action.userId)
        ? current.filter((uid) => uid !== action.userId)
        : [...current, action.userId];
      return { ...state, conversations: replaceById(state.conversations, action.id, { followedUserIds: next }) };
    }

    case ACTIONS.BULK_MARK_CONVERSATIONS_READ: {
      const set = new Set(action.ids || []);
      if (set.size === 0) return state;
      const t = nowIso();
      const uid = action.currentUserId || state.currentUserId;
      const dmIds = new Set(
        state.conversations.filter((c) => set.has(c.id) && c.channel === 'dm').map((c) => c.id)
      );
      return {
        ...state,
        messages: state.messages.map((m) => {
          if (!set.has(m.conversationId) || m.readAt) return m;
          if (dmIds.has(m.conversationId)) {
            return m.authorUserId && m.authorUserId !== uid ? { ...m, readAt: t } : m;
          }
          return m.direction === 'in' ? { ...m, readAt: t } : m;
        }),
      };
    }
    case ACTIONS.BULK_MARK_CONVERSATIONS_UNREAD: {
      const set = new Set(action.ids || []);
      if (set.size === 0) return state;
      const uid = action.currentUserId || state.currentUserId;
      const dmIds = new Set(
        state.conversations.filter((c) => set.has(c.id) && c.channel === 'dm').map((c) => c.id)
      );
      // Clear readAt on each conversation's most recent inbound (or DM-from-other) message.
      const targets = new Set();
      set.forEach((convId) => {
        const isDm = dmIds.has(convId);
        const candidates = state.messages
          .filter((m) => {
            if (m.conversationId !== convId) return false;
            if (isDm) return m.authorUserId && m.authorUserId !== uid;
            return m.direction === 'in';
          })
          .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
        if (candidates[0]) targets.add(candidates[0].id);
      });
      return {
        ...state,
        messages: state.messages.map((m) => (targets.has(m.id) ? { ...m, readAt: null } : m)),
      };
    }
    case ACTIONS.BULK_DELETE_CONVERSATIONS: {
      const set = new Set(action.ids || []);
      if (set.size === 0) return state;
      return {
        ...state,
        conversations: (state.conversations || []).filter((c) => !set.has(c.id)),
        messages: (state.messages || []).filter((m) => !set.has(m.conversationId)),
      };
    }
    case ACTIONS.BULK_ASSIGN_CONVERSATIONS: {
      const set = new Set(action.ids || []);
      if (set.size === 0) return state;
      const userId = action.userId || null;
      return {
        ...state,
        conversations: state.conversations.map((c) => (set.has(c.id) ? { ...c, assignedUserId: userId } : c)),
      };
    }

    // ---------- Reminders ----------
    case ACTIONS.UPDATE_REMINDER_TEMPLATE:
      return { ...state, reminderTemplates: replaceById(state.reminderTemplates, action.id, action.patch) };
    case ACTIONS.ADD_REMINDER_EVENT: {
      const base = { id: newId('re'), channel: 'sms', status: 'sent', sentAt: nowIso(), readAt: null };
      return { ...state, reminderEvents: [...state.reminderEvents, { ...base, ...action.event }] };
    }
    case ACTIONS.UPDATE_REMINDER_EVENT:
      // Used by the scheduler to patch delivery status (pending → sent / failed)
      // and add failureReason / providerMessageId after the adapter resolves.
      return { ...state, reminderEvents: replaceById(state.reminderEvents, action.id, action.patch || {}) };
    case ACTIONS.MARK_REMINDER_EVENT_READ:
      return { ...state, reminderEvents: replaceById(state.reminderEvents, action.id, { readAt: nowIso() }) };
    case ACTIONS.MARK_REMINDER_EVENT_UNREAD:
      return { ...state, reminderEvents: replaceById(state.reminderEvents, action.id, { readAt: null }) };
    case ACTIONS.RETRY_REMINDER_EVENT:
      // In-place retry: flip status back to 'sent' and bump the timestamp so the
      // row rises to the top of the inbox. The original failure is considered
      // resolved; history is not preserved (by design — see D scope choice A).
      return { ...state, reminderEvents: replaceById(state.reminderEvents, action.id, { status: 'sent', sentAt: nowIso() }) };

    // ---------- Invitations ----------
    case ACTIONS.SEND_INVITATION: {
      const base = {
        id: newId('inv'),
        userId: action.userId,
        email: action.email,
        role: action.role || 'crew',
        invitedBy: action.invitedBy || state.currentUserId,
        token: `tok_${Math.random().toString(36).slice(2, 14)}`,
        status: 'pending',
        sentAt: nowIso(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastResentAt: null,
        resendCount: 0,
      };
      return { ...state, invitations: [...(state.invitations || []), base] };
    }
    case ACTIONS.RESEND_INVITATION: {
      const now = nowIso();
      return {
        ...state,
        invitations: (state.invitations || []).map((inv) =>
          inv.id === action.id
            ? {
                ...inv,
                lastResentAt: now,
                resendCount: (inv.resendCount || 0) + 1,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              }
            : inv
        ),
      };
    }
    case ACTIONS.REVOKE_INVITATION: {
      const inv = (state.invitations || []).find((i) => i.id === action.id);
      if (!inv) return state;
      return {
        ...state,
        invitations: (state.invitations || []).map((i) =>
          i.id === action.id ? { ...i, status: 'revoked', revokedAt: nowIso() } : i
        ),
        users: state.users.map((u) =>
          u.id === inv.userId ? { ...u, status: 'inactive' } : u
        ),
      };
    }

    // ---------- Permissions ----------
    case ACTIONS.UPDATE_PERMISSION:
      return { ...state, permissions: replaceById(state.permissions, action.id, action.patch) };

    // ---------- Pipelines ----------
    case ACTIONS.ADD_PIPELINE: {
      const label = (action.label || '').trim();
      if (!label) return state;
      const id = newId('pl');
      const pipeline = { id, label, createdAt: nowIso(), stages: [] };
      return { ...state, pipelines: [...(state.pipelines || []), pipeline], activePipelineId: id };
    }
    case ACTIONS.UPDATE_PIPELINE: {
      const label = (action.patch?.label || '').trim();
      if (!label) return state;
      const pipelines = (state.pipelines || []).map((p) =>
        p.id === action.id ? { ...p, label } : p
      );
      return { ...state, pipelines };
    }
    case ACTIONS.DELETE_PIPELINE: {
      const pipelines = state.pipelines || [];
      const target = pipelines.find((p) => p.id === action.id);
      if (!target) return state;
      if ((state.contacts || []).some((c) => c.pipelineId === action.id)) return state;
      const next = pipelines.filter((p) => p.id !== action.id);
      const activePipelineId = state.activePipelineId === action.id
        ? (next[0]?.id || null)
        : state.activePipelineId;
      return { ...state, pipelines: next, activePipelineId };
    }
    case ACTIONS.SET_ACTIVE_PIPELINE:
      return { ...state, activePipelineId: action.id };

    // ---------- Pipeline stages (scoped to pipeline) ----------
    case ACTIONS.ADD_PIPELINE_STAGE: {
      const pipelineId = action.pipelineId || state.activePipelineId;
      const label = (action.label || '').trim();
      if (!label) return state;
      const pipelines = (state.pipelines || []).map((p) => {
        if (p.id !== pipelineId) return p;
        const existing = p.stages || [];
        const baseKey = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'stage';
        let key = baseKey;
        let n = 2;
        while (existing.some((s) => s.key === key)) { key = `${baseKey}-${n++}`; }
        return { ...p, stages: [...existing, { id: newId('ps'), key, label }] };
      });
      return { ...state, pipelines };
    }
    case ACTIONS.UPDATE_PIPELINE_STAGE: {
      const pipelineId = action.pipelineId || state.activePipelineId;
      const label = (action.patch?.label || '').trim();
      if (!label) return state;
      const pipelines = (state.pipelines || []).map((p) => {
        if (p.id !== pipelineId) return p;
        return { ...p, stages: replaceById(p.stages || [], action.id, { label }) };
      });
      return { ...state, pipelines };
    }
    case ACTIONS.DELETE_PIPELINE_STAGE: {
      const pipelineId = action.pipelineId || state.activePipelineId;
      const pipeline = (state.pipelines || []).find((p) => p.id === pipelineId);
      if (!pipeline) return state;
      const target = (pipeline.stages || []).find((s) => s.id === action.id);
      if (!target) return state;
      const inUse = (state.contacts || []).some((c) => c.pipelineId === pipelineId && c.stage === target.key);
      if (inUse) return state;
      const pipelines = (state.pipelines || []).map((p) => {
        if (p.id !== pipelineId) return p;
        return { ...p, stages: (p.stages || []).filter((s) => s.id !== action.id) };
      });
      return { ...state, pipelines };
    }
    case ACTIONS.REORDER_PIPELINE_STAGES: {
      const pipelineId = action.pipelineId || state.activePipelineId;
      const ids = Array.isArray(action.ids) ? action.ids : [];
      const pipelines = (state.pipelines || []).map((p) => {
        if (p.id !== pipelineId) return p;
        const existing = p.stages || [];
        const map = Object.fromEntries(existing.map((s) => [s.id, s]));
        const ordered = ids.map((id) => map[id]).filter(Boolean);
        const leftover = existing.filter((s) => !ids.includes(s.id));
        return { ...p, stages: [...ordered, ...leftover] };
      });
      return { ...state, pipelines };
    }

    // ---------- Integrations / Twilio ----------
    case ACTIONS.CONNECT_TWILIO: {
      const tw = state.company.integrations?.twilio || {};
      const next = {
        ...tw,
        connected: true,
        accountSidLast4: action.accountSidLast4 || null,
        phoneNumber: action.phoneNumber || null,
        phoneNumberFriendlyName: action.phoneNumberFriendlyName || null,
        connectedAt: nowIso(),
        lastError: null,
      };
      return {
        ...state,
        company: {
          ...state.company,
          integrations: { ...(state.company.integrations || {}), twilio: next },
        },
      };
    }
    case ACTIONS.DISCONNECT_TWILIO: {
      const tw = state.company.integrations?.twilio || {};
      const next = {
        ...tw,
        connected: false,
        accountSidLast4: null,
        phoneNumber: null,
        phoneNumberFriendlyName: null,
        connectedAt: null,
        lastError: null,
      };
      return {
        ...state,
        company: {
          ...state.company,
          integrations: { ...(state.company.integrations || {}), twilio: next },
        },
      };
    }
    case ACTIONS.UPDATE_TWILIO_NUMBER: {
      const tw = state.company.integrations?.twilio || {};
      const next = {
        ...tw,
        phoneNumber: action.phoneNumber || null,
        phoneNumberFriendlyName: action.friendlyName || null,
      };
      return {
        ...state,
        company: {
          ...state.company,
          integrations: { ...(state.company.integrations || {}), twilio: next },
        },
      };
    }
    case ACTIONS.UPDATE_TWILIO_WEBHOOK: {
      const tw = state.company.integrations?.twilio || {};
      const next = { ...tw, inboundWebhookUrl: action.url || null };
      return {
        ...state,
        company: {
          ...state.company,
          integrations: { ...(state.company.integrations || {}), twilio: next },
        },
      };
    }
    case ACTIONS.UPDATE_TWILIO_ERROR: {
      const tw = state.company.integrations?.twilio || {};
      const next = { ...tw, lastError: action.error || null };
      return {
        ...state,
        company: {
          ...state.company,
          integrations: { ...(state.company.integrations || {}), twilio: next },
        },
      };
    }
    case ACTIONS.SUBMIT_A2P: {
      const tw = state.company.integrations?.twilio || {};
      const a2p = tw.a2p || {};
      const next = {
        ...tw,
        a2p: {
          ...a2p,
          ...action.patch,
          status: 'pending',
          submittedAt: nowIso(),
          rejectionReason: null,
        },
      };
      return {
        ...state,
        company: {
          ...state.company,
          integrations: { ...(state.company.integrations || {}), twilio: next },
        },
      };
    }
    case ACTIONS.UPDATE_A2P_STATUS: {
      const tw = state.company.integrations?.twilio || {};
      const a2p = tw.a2p || {};
      const patch = { status: action.status };
      if (action.status === 'approved') {
        patch.approvedAt = nowIso();
        patch.rejectionReason = null;
      }
      if (action.status === 'rejected') {
        patch.rejectionReason = action.rejectionReason || 'Not specified';
      }
      const next = { ...tw, a2p: { ...a2p, ...patch } };
      return {
        ...state,
        company: {
          ...state.company,
          integrations: { ...(state.company.integrations || {}), twilio: next },
        },
      };
    }
    case ACTIONS.RESET_A2P: {
      const tw = state.company.integrations?.twilio || {};
      const next = {
        ...tw,
        a2p: {
          status: 'not_started',
          brandName: null,
          ein: null,
          businessAddress: null,
          useCase: null,
          sampleMessages: [],
          submittedAt: null,
          approvedAt: null,
          rejectionReason: null,
          notes: '',
        },
      };
      return {
        ...state,
        company: {
          ...state.company,
          integrations: { ...(state.company.integrations || {}), twilio: next },
        },
      };
    }

    // ---------- Inbound SMS routing ----------
    // Inbound SMS arrives via the deployment webhook. We try to match the from-number
    // to an existing contact's phone field; if no match, the conversation is created
    // unlinked (contactId: null) and surfaces as "needs linkage" in the inbox.
    case ACTIONS.RECEIVE_SMS: {
      const now = nowIso();
      const fromPhone = (action.fromPhone || '').trim();
      if (!fromPhone) return state;

      // Find existing contact by phone match (loose normalize: strip non-digits, compare last 10).
      const normalize = (p) => (p || '').replace(/\D+/g, '').slice(-10);
      const fromNorm = normalize(fromPhone);
      const matchContact = fromNorm
        ? (state.contacts || []).find((c) => normalize(c.phone) === fromNorm)
        : null;

      // Find existing open SMS conversation for this contact OR by phone-only thread title.
      const existing = state.conversations.find((c) => {
        if (c.channel !== 'sms') return false;
        if (matchContact && c.contactId === matchContact.id) return true;
        if (!matchContact && c.title === fromPhone) return true;
        return false;
      });

      let convId;
      let conversations;
      if (existing) {
        convId = existing.id;
        conversations = replaceById(state.conversations, existing.id, { lastMessageAt: now });
      } else {
        convId = newId('cv');
        const newConv = {
          id: convId,
          channel: 'sms',
          createdAt: now,
          lastMessageAt: now,
          contactId: matchContact?.id || null,
          clientId: matchContact?.companyId || null,
          title: matchContact ? null : fromPhone, // unlinked threads carry the raw number as title
          assignedUserId: null,
          status: 'open',
          snoozedUntil: null,
          starred: false,
          followedUserIds: [],
        };
        conversations = [...state.conversations, newConv];
      }

      const message = {
        id: newId('m'),
        conversationId: convId,
        direction: 'in',
        text: action.body || '',
        sentAt: now,
        readAt: null,
        authorUserId: null,
        snippetId: null,
        deliveryStatus: 'received',
        twilioMessageSid: action.messageSid || null,
        fromPhone,
        toPhone: action.toPhone || null,
      };

      return {
        ...state,
        conversations,
        messages: [...state.messages, message],
      };
    }

    case ACTIONS.SET_MESSAGE_DELIVERY: {
      // Update delivery status on an outbound message after the adapter resolves
      // (queued → sent → delivered / failed).
      const patch = { deliveryStatus: action.status };
      if (action.twilioMessageSid) patch.twilioMessageSid = action.twilioMessageSid;
      if (action.failureReason) patch.failureReason = action.failureReason;
      return { ...state, messages: replaceById(state.messages, action.id, patch) };
    }

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
