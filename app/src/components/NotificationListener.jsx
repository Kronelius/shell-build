// NotificationListener — watches state for events the current user cares about
// and routes them to (a) the persistent in-app inbox (the bell), (b) a transient
// toast, and (c) the browser tab title.
//
// Runs once at app root inside <StoreProvider> + <ToastProvider>. Dispatches
// ADD_NOTIFICATION but never mutates anything else.
//
// Sources of truth:
//   - lib/notifications.js for the catalog (which toggles exist + their gates).
//   - user.notificationPrefs for the current user's per-event opt-ins.
//   - conversation.mutedByUserIds for per-thread silence.
//
// First-render guard: the listener seeds its "seen" sets from initial state on
// mount so we don't fire a flood of notifications for everything that existed
// before the user opened the page. Only items added after mount fire.

import { useEffect, useRef } from 'react';
import { useStore, useDispatch } from '../store';
import { ACTIONS } from '../store/reducer';
import { useToast } from './Toast';
import { setUnreadCount } from '../lib/documentTitle';
import { isNotificationVisibleForUser } from '../lib/notifications';
import { selectUnreadNotificationCount } from '../store/selectors';

function isMutedForUser(conv, userId) {
  return Array.isArray(conv?.mutedByUserIds) && conv.mutedByUserIds.includes(userId);
}

// Decide which notification key (if any) a new message maps to.
// Returns null if the current user shouldn't be pinged for this message.
function resolveMessageEvent(message, conv, currentUserId) {
  if (!conv) return null;
  if (isMutedForUser(conv, currentUserId)) return null;

  if (conv.channel === 'dm') {
    if (!(conv.participantUserIds || []).includes(currentUserId)) return null;
    if (!message.authorUserId || message.authorUserId === currentUserId) return null;
    return 'newDM';
  }

  if (conv.channel === 'internal') {
    if (!(conv.participantUserIds || []).includes(currentUserId)) return null;
    if (message.authorUserId === currentUserId) return null;
    return 'newInternalMessage';
  }

  // External (sms / email) — only inbound from the customer counts.
  if (message.direction !== 'in') return null;
  return 'newCustomerMessage';
}

function previewBody(text) {
  const flat = (text || '').replace(/\s+/g, ' ').trim();
  return flat.length > 90 ? flat.slice(0, 87) + '…' : flat;
}

export default function NotificationListener() {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const seedRef = useRef(null);

  // Tab title — driven by the persistent notification-inbox unread count for
  // the current user. Same source the bell badge uses, so they always agree.
  const totalUnread = selectUnreadNotificationCount(state, state.currentUserId);
  useEffect(() => { setUnreadCount(totalUnread); }, [totalUnread]);

  useEffect(() => {
    const currentUser = state.users.find((u) => u.id === state.currentUserId);
    if (!currentUser) return;
    const prefs = currentUser.notificationPrefs || {};

    // First mount — seed prior state so we don't toast for pre-existing items.
    if (!seedRef.current) {
      seedRef.current = {
        msgIds: new Set(state.messages.map((m) => m.id)),
        jobs: new Map(state.jobs.map((j) => [j.id, { startAt: j.startAt, status: j.status }])),
        invoices: new Map(state.invoices.map((i) => [i.id, i.status])),
      };
      return;
    }

    const convById = new Map(state.conversations.map((c) => [c.id, c]));

    const fire = (eventKey, { title, body, url }) => {
      if (prefs[eventKey] !== true) return;
      if (!isNotificationVisibleForUser(eventKey, currentUser, state.permissions, state.userPermissionOverrides)) return;
      dispatch({
        type: ACTIONS.ADD_NOTIFICATION,
        notification: { userId: currentUser.id, eventKey, title, body, url },
      });
      toast.info(body ? `${title}: ${body}` : title);
    };

    // ----- Messages -----
    for (const m of state.messages) {
      if (seedRef.current.msgIds.has(m.id)) continue;
      seedRef.current.msgIds.add(m.id);
      const conv = convById.get(m.conversationId);
      const eventKey = resolveMessageEvent(m, conv, currentUser.id);
      if (!eventKey) continue;
      let title = 'New message';
      if (eventKey === 'newCustomerMessage') {
        title = `New ${conv?.channel === 'email' ? 'email' : 'message'} from ${conv?.title || 'a customer'}`;
      } else if (eventKey === 'newDM') {
        const author = state.users.find((u) => u.id === m.authorUserId);
        title = `DM from ${author?.name || 'a teammate'}`;
      } else if (eventKey === 'newInternalMessage') {
        title = `New message in ${conv?.title || 'an internal thread'}`;
      }
      fire(eventKey, { title, body: previewBody(m.body || m.text), url: `/messaging/${m.conversationId}` });
    }

    // ----- Jobs -----
    const seenJobs = seedRef.current.jobs;
    for (const j of state.jobs) {
      const prior = seenJobs.get(j.id);
      seenJobs.set(j.id, { startAt: j.startAt, status: j.status });
      if (!(j.crewIds || []).includes(currentUser.id)) continue;

      if (!prior) {
        fire('jobCreatedOrRescheduled', {
          title: 'New job assigned to you',
          body: j.startAt ? new Date(j.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '',
          url: `/schedule/${j.id}`,
        });
        continue;
      }
      if (prior.startAt !== j.startAt) {
        fire('jobCreatedOrRescheduled', {
          title: 'Job rescheduled',
          body: `Now ${new Date(j.startAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
          url: `/schedule/${j.id}`,
        });
      }
      if (prior.status !== j.status && j.status === 'cancelled') {
        fire('jobCancelled', { title: 'A job you were on was cancelled', body: '', url: `/schedule/${j.id}` });
      }
    }

    // ----- Invoices -----
    const seenInv = seedRef.current.invoices;
    for (const inv of state.invoices) {
      const priorStatus = seenInv.get(inv.id);
      seenInv.set(inv.id, inv.status);
      if (priorStatus === inv.status) continue;
      if (priorStatus === undefined) continue;
      const label = inv.number || inv.id;
      if (inv.status === 'paid') fire('invoicePaid', { title: `Invoice ${label} paid`, body: '', url: `/invoices/${inv.id}` });
      if (inv.status === 'overdue') fire('invoiceOverdue', { title: `Invoice ${label} is overdue`, body: '', url: `/invoices/${inv.id}` });
    }
  }, [state, toast, dispatch]);

  return null;
}
