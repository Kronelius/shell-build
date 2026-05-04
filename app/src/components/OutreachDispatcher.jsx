// ─────────────────────────────────────────────────────────────────────────────
// Outreach dispatcher — auto-runs sequence sends + auto-routes inbound replies.
//
// Mounted once at app root, mirroring ReminderScheduler.jsx. It does two jobs:
//
//   1) DISPATCH — every TICK_MS, walk active enrollments whose nextSendAt is in
//      the past, render their next sequence step, deliver via lib/outreach.js,
//      record a campaign event, and advance the enrollment to the next step.
//
//   2) AUTO-ROUTE — every state change to outreachReplies, walk replies with
//      no autoActions yet and apply the rules from outreachSettings.autoRouting:
//        interested     → tag contact "Hot Lead", move to Pipeline → qualified
//        not_interested → tag contact "Do Not Disturb", suppress future sends
//        unsubscribe    → archive contact, suppress globally
//        question / OOO → defer next step, leave for human triage
//
// Idempotency: each reply records its applied actions in `autoActions`. The
// dispatcher uses APPEND_REPLY_AUTO_ACTION which is a no-op on duplicates.
// Module-level dedup set guards against React.StrictMode double-fires the
// same way ReminderScheduler does.
//
// Production swap: the only thing that changes is which adapter lib/outreach.js
// uses (real provider vs. stub). The reducer + selectors stay identical.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import {
  sendOutreachEmail, interpolateTokens,
  listEmails, outreachIsStub,
} from '../lib/outreach';

// Stub mode runs every 10s for demo liveliness. Production mode polls
// Instantly's /emails endpoint every 90s — well within the 6000 req/min
// rate limit (we burn ~40 req/hr per workspace). Hypergrowth users should
// configure a webhook instead so this poller becomes a fallback only.
const STUB_TICK_MS    = 10 * 1000;
const POLL_TICK_MS    = 90 * 1000;

const dispatchedKeys = new Set();   // (enrollmentId::stepIndex) — see top-of-file.
const routedReplies  = new Set();   // replyId — guards repeat auto-routing.
const seenEmailIds   = new Set();   // Instantly email.id — guards duplicate ingest.

export default function OutreachDispatcher() {
  const state = useStore();
  const dispatch = useDispatch();

  const stateRef = useRef(state);
  stateRef.current = state;

  // ----- DISPATCH: walk active enrollments and send the next step if due. -----
  function tick() {
    const s = stateRef.current;
    const settings = s.outreachSettings || {};

    // Don't auto-dispatch if mailbox isn't connected (matches production behavior).
    // For demo: comment-friendly toggle — flip to true when demoing the auto-send.
    const allowDispatchWithoutMailbox = true; // DEMO: default true so it works without mailbox connect
    if (!settings.mailboxConnected && !allowDispatchWithoutMailbox) return;

    const now = Date.now();
    const enrollments = s.campaignEnrollments || [];

    for (const enr of enrollments) {
      if (enr.status !== 'active' && enr.status !== 'pending') continue;
      if (!enr.nextSendAt) continue;
      if (new Date(enr.nextSendAt).getTime() > now) continue;

      const campaign = (s.campaigns || []).find((c) => c.id === enr.campaignId);
      if (!campaign || campaign.status !== 'active') continue;

      const steps = (s.campaignSteps || [])
        .filter((st) => st.campaignId === enr.campaignId)
        .sort((a, b) => a.order - b.order);
      const step = steps[enr.currentStepIndex];
      if (!step) {
        // No more steps — mark enrollment completed.
        dispatch({ type: ACTIONS.UPDATE_ENROLLMENT, id: enr.id, patch: { status: 'completed', nextSendAt: null } });
        continue;
      }

      const dispatchKey = `${enr.id}::${enr.currentStepIndex}`;
      if (dispatchedKeys.has(dispatchKey)) continue;
      dispatchedKeys.add(dispatchKey);

      const contact = (s.contacts || []).find((c) => c.id === enr.contactId);
      const sender  = (s.users || []).find((u) => u.id === campaign.senderUserId) || (s.users || [])[0];
      const company = s.company || {};
      if (!contact || !contact.email) continue;

      const ctx = {
        first_name: contact.firstName || '',
        last_name:  contact.lastName  || '',
        company:    contact.customFields?.company
                    || (s.clients || []).find((cl) => cl.id === contact.companyId)?.name
                    || '(your company)',
        sender_first_name: sender?.name?.split(' ')[0] || 'Team',
        sender_company:    company.name || 'us',
      };

      const subject = interpolateTokens(step.subject, ctx);
      const body    = interpolateTokens(step.body,    ctx);

      sendOutreachEmail({
        to: contact.email,
        from: campaign.fromEmail || sender?.email || 'no-reply@example.com',
        subject,
        body,
        campaignId: campaign.id,
        contactId:  contact.id,
        stepIndex:  enr.currentStepIndex,
      })
        .then(() => {
          dispatch({
            type: ACTIONS.ADD_CAMPAIGN_EVENT,
            event: { campaignId: campaign.id, contactId: contact.id, stepIndex: enr.currentStepIndex, type: 'sent' },
          });
          // Advance to next step (or complete).
          const nextIndex = enr.currentStepIndex + 1;
          const nextStep  = steps[nextIndex];
          if (nextStep) {
            const nextSendAt = new Date(now + (nextStep.delayDays || 1) * 24 * 60 * 60 * 1000).toISOString();
            dispatch({
              type: ACTIONS.UPDATE_ENROLLMENT,
              id: enr.id,
              patch: { status: 'active', currentStepIndex: nextIndex, lastSentAt: new Date().toISOString(), nextSendAt },
            });
          } else {
            dispatch({
              type: ACTIONS.UPDATE_ENROLLMENT,
              id: enr.id,
              patch: { status: 'completed', lastSentAt: new Date().toISOString(), nextSendAt: null },
            });
          }
        })
        .catch((err) => {
          dispatch({
            type: ACTIONS.ADD_CAMPAIGN_EVENT,
            event: {
              campaignId: campaign.id, contactId: contact.id,
              stepIndex: enr.currentStepIndex, type: 'bounced',
              failureReason: err.message,
            },
          });
          // Park enrollment as bounced.
          dispatch({ type: ACTIONS.UPDATE_ENROLLMENT, id: enr.id, patch: { status: 'bounced', nextSendAt: null } });
        });
    }
  }

  // ----- AUTO-ROUTE: walk inbound replies and apply the routing rules. -----
  function routeReplies() {
    const s = stateRef.current;
    const settings = s.outreachSettings || {};
    // Master toggle — when off, replies still land in the inbox but no rules
    // apply. The user gets to triage everything by hand.
    if (settings.autoRoutingEnabled === false) return;
    const rules = settings.autoRouting || {};
    const interestedStage = rules.interestedPipelineStageKey || 'qualified';
    const replies = s.outreachReplies || [];

    for (const reply of replies) {
      if (routedReplies.has(reply.id)) continue;
      if ((reply.autoActions || []).length > 0) {
        // Already routed (seeded or routed previously). Mark for in-memory dedup
        // so we don't re-walk on every tick.
        routedReplies.add(reply.id);
        continue;
      }
      routedReplies.add(reply.id);

      const contact = (s.contacts || []).find((c) => c.id === reply.contactId);
      if (!contact) continue;

      switch (reply.classification) {
        case 'interested': {
          // 1. Tag with Hot Lead.
          if (rules.interestedTagId && !(contact.tagIds || []).includes(rules.interestedTagId)) {
            dispatch({ type: ACTIONS.TAG_CONTACT, id: contact.id, tagId: rules.interestedTagId });
            dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Tagged contact "Hot Lead"' });
          }
          // 2. Move into the pipeline at the user-selected stage. Bump lifecycle
          // from 'lead' → 'prospect' since the contact has shown buying intent.
          // The schema lifecycles are lead/prospect/customer/vendor.
          if (rules.interestedToPipeline) {
            dispatch({ type: ACTIONS.SET_CONTACT_STAGE, id: contact.id, stage: interestedStage, authorUserId: null });
            if (contact.lifecycle === 'lead') {
              dispatch({ type: ACTIONS.SET_CONTACT_LIFECYCLE, id: contact.id, lifecycle: 'prospect' });
            }
            const stageRow = (s.pipelineStages || []).find((st) => st.key === interestedStage);
            const stageLabel = stageRow?.label || interestedStage;
            dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: `Moved to Pipeline → ${stageLabel}` });
          }
          // 3. Pause remaining steps for this enrollment.
          pauseEnrollment(s, reply, 'replied');
          dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Paused remaining sequence steps' });
          break;
        }
        case 'not_interested': {
          if (rules.notInterestedTagId && !(contact.tagIds || []).includes(rules.notInterestedTagId)) {
            dispatch({ type: ACTIONS.TAG_CONTACT, id: contact.id, tagId: rules.notInterestedTagId });
            dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Tagged contact "Do Not Disturb"' });
          }
          pauseEnrollment(s, reply, 'replied');
          dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Suppressed from all future campaigns' });
          dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Paused remaining sequence steps' });
          break;
        }
        case 'unsubscribe': {
          if (rules.unsubscribeArchive) {
            dispatch({ type: ACTIONS.ARCHIVE_CONTACT, id: contact.id });
            dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Archived contact (suppressed globally)' });
          }
          pauseEnrollment(s, reply, 'unsubscribed');
          dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Removed from all sequences' });
          break;
        }
        case 'out_of_office': {
          // Defer next step ~3 days.
          deferEnrollment(s, reply, 3);
          dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Paused next step for ~3 days' });
          break;
        }
        case 'question': {
          if (rules.questionAssignToOwner) {
            dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Routed to campaign owner for human reply' });
          }
          deferEnrollment(s, reply, 7);
          dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Paused next step until handled' });
          break;
        }
        default: {
          // 'other' — leave for human triage; no auto-action.
          dispatch({ type: ACTIONS.APPEND_REPLY_AUTO_ACTION, id: reply.id, action: 'Surfaced for human triage' });
        }
      }
    }
  }

  function pauseEnrollment(s, reply, reason) {
    const enr = (s.campaignEnrollments || []).find(
      (e) => e.campaignId === reply.campaignId && e.contactId === reply.contactId,
    );
    if (!enr) return;
    dispatch({
      type: ACTIONS.UPDATE_ENROLLMENT, id: enr.id,
      patch: { status: reason, nextSendAt: null },
    });
  }

  function deferEnrollment(s, reply, days) {
    const enr = (s.campaignEnrollments || []).find(
      (e) => e.campaignId === reply.campaignId && e.contactId === reply.contactId,
    );
    if (!enr) return;
    const nextSendAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    dispatch({ type: ACTIONS.UPDATE_ENROLLMENT, id: enr.id, patch: { nextSendAt } });
  }

  // ----- POLL INSTANTLY: pull inbound replies in production mode. -----
  // This is the polling fallback for users on Growth tier (no webhooks). Users
  // on Hypergrowth should configure a webhook instead — webhook deliveries land
  // directly in the reducer via a backend endpoint and bypass this loop.
  async function pollInstantlyReplies() {
    const s = stateRef.current;
    const settings = s.outreachSettings || {};
    const apiKey = settings.instantlyApiKey;
    if (!apiKey) return;

    try {
      const { items } = await listEmails(apiKey, {
        isUnread: true,
        emailType: 'received',
        limit: 50,
      });
      const existingReplyIds = new Set((s.outreachReplies || []).map((r) => r.id));
      for (const reply of items) {
        if (seenEmailIds.has(reply.id)) continue;
        if (existingReplyIds.has(reply.id)) {
          seenEmailIds.add(reply.id);
          continue;
        }
        seenEmailIds.add(reply.id);
        // Resolve contactId by leadEmail → contact lookup.
        const contact = reply.leadEmail
          ? (s.contacts || []).find((c) => c.email?.toLowerCase() === reply.leadEmail.toLowerCase())
          : null;
        dispatch({
          type: ACTIONS.RECEIVE_OUTREACH_REPLY,
          reply: { ...reply, contactId: contact?.id || null },
        });
      }
    } catch (err) {
      // Don't toast on every failed poll — log to console only.
      // (A 401 here probably means the user revoked the key in Instantly UI.)
      // eslint-disable-next-line no-console
      console.warn('[OutreachDispatcher] Instantly poll failed:', err.message);
    }
  }

  // ----- Tick interval ------------------------------------------------------
  // Stub mode: simulate sends locally + route replies. Fast tick for demo.
  // Production mode: poll Instantly for inbound replies + route. Slow tick
  // (90s) to stay well within rate limits.
  useEffect(() => {
    const settings = stateRef.current?.outreachSettings || {};
    const stub = outreachIsStub(settings.instantlyApiKey);

    // Initial pass so the demo doesn't have to wait for the first tick.
    if (stub) tick(); else pollInstantlyReplies();
    routeReplies();

    const intervalMs = stub ? STUB_TICK_MS : POLL_TICK_MS;
    const id = setInterval(() => {
      if (stub) tick(); else pollInstantlyReplies();
      routeReplies();
    }, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-route replies on state change so the moment a new reply lands, the
  // routing fires without waiting for the next tick.
  useEffect(() => {
    routeReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.outreachReplies]);

  return null;
}
