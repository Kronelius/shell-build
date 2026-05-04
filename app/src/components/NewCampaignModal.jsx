// 3-step wizard: name + sender + schedule → audience → sequence template.
//
// Two execution modes:
//   - PRODUCTION (an Instantly API key is configured): submit POSTs the
//     campaign to Instantly, bulk-uploads the selected contacts as leads,
//     and stores a local mirror so the rest of the UI can drive off it.
//   - STUB (no API key): submit only dispatches local actions — same as the
//     old behavior, lets the demo keep working without a real Instantly tenant.
//
// On submit (production):
//   1. createCampaign(apiKey, body)               → POST /api/v2/campaigns
//   2. addLeads(apiKey, { campaignId, leads })    → POST /api/v2/leads/add
//   3. ADD_CAMPAIGN, ADD_CAMPAIGN_STEP × N, ENROLL_CONTACTS dispatched
//      with the Instantly-returned campaign id so local KPIs can hydrate.
//
// On submit (stub): same dispatches, but the campaign id is locally minted.
// Either way, navigates to /outreach/campaigns/:id for review + activation.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import FormField from './FormField';
import Icon from './Icon';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import {
  selectContacts, selectActiveUsers, selectTags, selectOutreachSettings,
  selectClientById,
} from '../store/selectors';
import { useToast } from './Toast';
import { newId } from '../lib/ids';
import {
  createCampaign, addLeads, contactToLead, buildCampaignBody, outreachIsStub,
} from '../lib/outreach';

const STARTER_TEMPLATES = [
  {
    key: 'cold-4touch',
    label: '4-touch cold outbound',
    desc: 'Initial pitch + 3 follow-ups over ~12 days. Best general-purpose start.',
    steps: [
      { delayDays: 0, subject: 'Quick question about {company}', body: 'Hi {first_name},\n\n[1-sentence relevance] — curious if [specific problem your service solves] is on your radar at {company}.\n\nWorth a 15-min look?\n\n— {sender_first_name}' },
      { delayDays: 3, subject: 'Re: Quick question about {company}', body: '{first_name} — bumping this. [Reframe the value in one line].\n\nOpen to a quick chat?\n\n— {sender_first_name}' },
      { delayDays: 4, subject: 'Thought you might find this useful, {first_name}', body: 'Quick case study from a similar [customer type] — [outcome].\n\nHappy to share.\n\n— {sender_first_name}' },
      { delayDays: 5, subject: 'Closing the loop', body: '{first_name} — last note. If timing is wrong, totally understand. Will circle back next quarter.\n\n— {sender_first_name}' },
    ],
  },
  {
    key: 'warm-3touch',
    label: '3-touch warm intro',
    desc: 'Shorter cadence for referrals or warm leads (~10 days).',
    steps: [
      { delayDays: 0, subject: 'Intro from [referrer], {first_name}', body: 'Hi {first_name},\n\n[Referrer] suggested I reach out about [topic]. We help [persona] with [outcome].\n\nWorth a quick chat?\n\n— {sender_first_name}' },
      { delayDays: 4, subject: 'Following up', body: '{first_name} — wanted to make sure my note didn\'t get buried.\n\n— {sender_first_name}' },
      { delayDays: 6, subject: 'One last note', body: '{first_name} — closing the loop. If timing changes, you know where to find me.\n\n— {sender_first_name}' },
    ],
  },
  {
    key: 'single-touch',
    label: 'Single-touch warm intro',
    desc: 'One thoughtful email, no follow-ups. Best for high-value targets.',
    steps: [
      { delayDays: 0, subject: 'Quick intro, {first_name}', body: 'Hi {first_name},\n\n[Single high-value pitch, ~3 sentences].\n\nWorth a 10-min call?\n\n— {sender_first_name}' },
    ],
  },
];

// IANA zones we surface in the dropdown — covers the US business map well.
// (Instantly accepts any IANA value; users can paste a custom one if needed.)
const COMMON_TIMEZONES = [
  'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Berlin', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function NewCampaignModal({ open, onClose }) {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const contacts = selectContacts(state);
  const users = selectActiveUsers(state);
  const tags = selectTags(state);
  const settings = selectOutreachSettings(state);

  const apiKey = settings.instantlyApiKey;
  const stubMode = outreachIsStub(apiKey);
  const realMailboxes = settings.instantlyMailboxes || [];
  // Mailbox options for the sender dropdown. Production: real list from Instantly.
  // Stub: synthesize from internal users so the picker isn't empty.
  const mailboxOptions = useMemo(() => {
    if (!stubMode) {
      return realMailboxes.map((m) => ({ value: m.email, label: `${m.email}${m.provider ? ` · ${m.provider}` : ''}` }));
    }
    return users
      .filter((u) => u.email)
      .map((u) => ({ value: u.email, label: `${u.name} · ${u.email}` }));
  }, [stubMode, realMailboxes, users]);

  // ---- Wizard state ----
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [templateKey, setTemplateKey] = useState('cold-4touch');
  // Per-campaign schedule (defaults from outreachSettings; user can override).
  const [dailyCap, setDailyCap] = useState(50);
  const [hoursStart, setHoursStart] = useState(9);
  const [hoursEnd, setHoursEnd] = useState(17);
  // days as a 7-bool array, [Sun, Mon, ..., Sat]. Default Mon–Fri.
  const [days, setDays] = useState([false, true, true, true, true, true, false]);
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [submitting, setSubmitting] = useState(false);

  // Reset wizard when reopened.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName('');
    setTagFilter('');
    setSearchQuery('');
    setSelectedContactIds([]);
    setTemplateKey('cold-4touch');
    setDailyCap(settings.dailyCap ?? 50);
    setHoursStart(settings.sendingHoursStart ?? 9);
    setHoursEnd(settings.sendingHoursEnd ?? 17);
    setTimezone(settings.defaultTimezone || 'America/Los_Angeles');
    // Default sender: first connected mailbox in production, current user's email in stub.
    if (mailboxOptions.length > 0) {
      setSenderEmail(mailboxOptions[0].value);
    } else {
      const me = state.users.find((u) => u.id === state.currentUserId);
      setSenderEmail(me?.email || '');
    }
    setSubmitting(false);
  }, [open]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered contacts for the audience picker.
  const filteredContacts = useMemo(() => {
    let list = contacts.filter((c) => c.lifecycle !== 'archived' && c.email);
    if (tagFilter) list = list.filter((c) => (c.tagIds || []).includes(tagFilter));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) =>
        (c.firstName || '').toLowerCase().includes(q)
        || (c.lastName  || '').toLowerCase().includes(q)
        || (c.email     || '').toLowerCase().includes(q)
        || (c.title     || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [contacts, tagFilter, searchQuery]);

  const toggleContact = (id) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const selectAllVisible = () => {
    const ids = filteredContacts.map((c) => c.id);
    setSelectedContactIds([...new Set([...selectedContactIds, ...ids])]);
  };

  const clearSelection = () => setSelectedContactIds([]);

  const goNext = () => {
    if (step === 1) {
      if (!name.trim()) { toast.error('Campaign needs a name.'); return; }
      if (!senderEmail) {
        toast.error(stubMode
          ? 'Pick a sender — connect a real mailbox via Settings → Outreach for production sends.'
          : 'Pick a connected mailbox to send from.');
        return;
      }
      if (hoursStart >= hoursEnd) { toast.error('Sending start hour must be before end hour.'); return; }
      if (!days.some(Boolean)) { toast.error('Pick at least one sending day.'); return; }
    }
    if (step === 2 && selectedContactIds.length === 0) {
      toast.error('Pick at least one contact for the audience.');
      return;
    }
    setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  // ----- Submit -----
  const submit = async () => {
    const tpl = STARTER_TEMPLATES.find((t) => t.key === templateKey);
    if (!tpl) return;
    setSubmitting(true);

    const localSteps = tpl.steps.map((s, i) => ({
      order: i + 1,
      delayDays: s.delayDays,
      channel: 'email',
      subject: s.subject,
      body: s.body,
    }));

    // Resolve sender display info for {{senderFirstName}} / {{senderCompany}} custom vars.
    const senderUser = state.users.find((u) => u.email === senderEmail) || state.users.find((u) => u.id === state.currentUserId);
    const company = state.company?.name || 'us';
    const senderCtx = {
      firstName:   senderUser?.name?.split(' ')[0] || 'Team',
      companyName: company,
    };

    // Build the payload of leads we'll send to Instantly (or just enroll locally in stub).
    const selectedContacts = selectedContactIds
      .map((id) => contacts.find((c) => c.id === id))
      .filter(Boolean);
    const leadPayloads = selectedContacts.map((c) => {
      const account = c.companyId ? selectClientById(state, c.companyId) : null;
      return contactToLead(c, account?.name, senderCtx);
    });

    // ---- PRODUCTION path ----
    if (!stubMode) {
      try {
        const body = buildCampaignBody({
          localCampaign: { name: name.trim() },
          localSteps,
          schedule: { dailyLimit: dailyCap, hoursStart, hoursEnd, days, timezone },
          mailboxEmails: [senderEmail],
        });
        const created = await createCampaign(apiKey, body);
        const campaignId = created?.id;
        if (!campaignId) throw new Error('Instantly returned no campaign id');

        // Bulk add leads (skip duplicates within campaign).
        let addedCount = 0;
        if (leadPayloads.length > 0) {
          try {
            const addResult = await addLeads(apiKey, { campaignId, leads: leadPayloads });
            addedCount = addResult?.leads_uploaded || addResult?.total_sent || leadPayloads.length;
          } catch (err) {
            toast.error(`Campaign created, but lead upload failed — ${err.message}. Add them again from the Audience tab.`);
          }
        }

        // Mirror into local store for UI.
        dispatch({
          type: ACTIONS.ADD_CAMPAIGN,
          campaign: {
            id: campaignId,
            name: name.trim(),
            status: 'draft',
            senderUserId: senderUser?.id || state.currentUserId,
            fromEmail: senderEmail,
            description: '',
            instantlyCampaignId: campaignId,
            schedule: { dailyCap, hoursStart, hoursEnd, days, timezone },
          },
        });
        localSteps.forEach((s) => {
          dispatch({ type: ACTIONS.ADD_CAMPAIGN_STEP, step: { ...s, campaignId } });
        });
        if (selectedContactIds.length > 0) {
          dispatch({ type: ACTIONS.ENROLL_CONTACTS, campaignId, contactIds: selectedContactIds });
        }
        toast.success(`Campaign "${name}" created in Instantly${addedCount > 0 ? ` with ${addedCount} lead${addedCount === 1 ? '' : 's'}` : ''}. Activate when ready.`);
        onClose();
        navigate(`/outreach/campaigns/${campaignId}`);
        return;
      } catch (err) {
        toast.error(err.message || 'Instantly create-campaign failed');
        setSubmitting(false);
        return;
      }
    }

    // ---- STUB path (no Instantly key configured) ----
    const campaignId = newId('cmp');
    dispatch({
      type: ACTIONS.ADD_CAMPAIGN,
      campaign: {
        id: campaignId,
        name: name.trim(),
        status: 'draft',
        senderUserId: senderUser?.id || state.currentUserId,
        fromEmail: senderEmail,
        description: '',
        schedule: { dailyCap, hoursStart, hoursEnd, days, timezone },
      },
    });
    localSteps.forEach((s) => {
      dispatch({ type: ACTIONS.ADD_CAMPAIGN_STEP, step: { ...s, campaignId } });
    });
    if (selectedContactIds.length > 0) {
      dispatch({ type: ACTIONS.ENROLL_CONTACTS, campaignId, contactIds: selectedContactIds });
    }
    toast.success(`Campaign "${name}" created. Activate when ready.`);
    onClose();
    navigate(`/outreach/campaigns/${campaignId}`);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={`New Campaign — Step ${step} of 3`} size="lg">
      <div className="campaign-wizard-progress">
        {[
          { n: 1, label: 'Basics' },
          { n: 2, label: 'Audience' },
          { n: 3, label: 'Sequence' },
        ].map((s) => (
          <div key={s.n} className={`wizard-step ${step >= s.n ? 'active' : ''} ${step === s.n ? 'current' : ''}`}>
            <div className="wizard-step-num">{s.n}</div>
            <div className="wizard-step-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="campaign-wizard-body">
        {step === 1 && (
          <div>
            <FormField
              label="Campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q2 Multi-Site Operations Leaders"
              required
              help="Internal label only — recipients don't see this."
            />

            <FormField
              label="Send from mailbox"
              as="select"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              options={mailboxOptions.length === 0
                ? [{ value: '', label: '— No mailboxes available —' }]
                : mailboxOptions}
              required
              help={stubMode
                ? 'No Instantly key configured — sending is simulated locally for now. Connect Instantly in Settings → Outreach to send for real.'
                : 'These are the mailboxes connected to your Instantly workspace. Manage them in Settings → Outreach.'}
            />

            {/* Per-campaign schedule */}
            <div className="form-row">
              <FormField
                label="Daily send cap"
                type="number"
                value={dailyCap}
                onChange={(e) => setDailyCap(Number(e.target.value))}
                min="1" max="500"
                help="Max emails per day for this campaign. Safe range: 30–80."
              />
              <FormField
                label="Timezone"
                as="select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                options={COMMON_TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
              />
            </div>

            <div className="form-row">
              <FormField
                label="Sending hours — start (24h)"
                type="number"
                value={hoursStart}
                onChange={(e) => setHoursStart(Number(e.target.value))}
                min="0" max="23"
              />
              <FormField
                label="Sending hours — end (24h)"
                type="number"
                value={hoursEnd}
                onChange={(e) => setHoursEnd(Number(e.target.value))}
                min="0" max="23"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sending days</label>
              <div className="days-picker">
                {DAY_LABELS.map((d, i) => (
                  <label key={d} className={`days-picker-day ${days[i] ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={days[i]}
                      onChange={(e) => {
                        const next = [...days];
                        next[i] = e.target.checked;
                        setDays(next);
                      }}
                    />
                    <span>{d}</span>
                  </label>
                ))}
              </div>
              <div className="form-help">Most outbound runs Mon–Fri. Weekends boost reply rates for some industries.</div>
            </div>

            {stubMode && (
              <div className="info-banner" style={{ marginTop: 12, marginBottom: 0 }}>
                <Icon name="warning" size={20} />
                <div>
                  <strong>No Instantly key configured.</strong> The campaign will be created in this app's local store only — no real emails will send. Connect Instantly in Settings → Outreach to enable production sends.
                </div>
              </div>
            )}
            {!stubMode && mailboxOptions.length === 0 && (
              <div className="info-banner" style={{ marginTop: 12, marginBottom: 0 }}>
                <Icon name="warning" size={20} />
                <div>
                  <strong>No mailboxes connected to your Instantly workspace.</strong> You can build the campaign now, but you'll need to connect a Google or Microsoft mailbox in Settings → Outreach before you can activate it.
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="audience-toolbar">
              <input
                className="input"
                placeholder="Search by name, email, or title…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                className="input"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                style={{ maxWidth: 180 }}
              >
                <option value="">— All tags —</option>
                {tags.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="audience-summary">
              <span><strong>{selectedContactIds.length}</strong> selected of {filteredContacts.length} shown</span>
              <div className="flex-row">
                <button type="button" className="btn btn-outline btn-sm" onClick={selectAllVisible}>Select visible</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={clearSelection}>Clear</button>
              </div>
            </div>
            <div className="audience-list">
              {filteredContacts.map((c) => {
                const checked = selectedContactIds.includes(c.id);
                return (
                  <label key={c.id} className={`audience-row ${checked ? 'checked' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleContact(c.id)} />
                    <div className="audience-row-body">
                      <div className="audience-row-name">{c.firstName} {c.lastName}</div>
                      <div className="audience-row-meta">{c.title || 'No title'} · {c.email}</div>
                    </div>
                    <div className="audience-row-tags">
                      {(c.tagIds || []).slice(0, 2).map((tid) => {
                        const t = tags.find((x) => x.id === tid);
                        return t ? <span key={tid} className={`badge ${t.color}`} style={{ minWidth: 0, padding: '2px 8px' }}>{t.label}</span> : null;
                      })}
                    </div>
                  </label>
                );
              })}
              {filteredContacts.length === 0 && (
                <div className="empty-state-inline">No contacts match these filters.</div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
              Pick a starter template — every step is fully editable on the campaign detail page after creation.
            </p>
            <div className="template-grid">
              {STARTER_TEMPLATES.map((t) => (
                <label key={t.key} className={`template-card ${templateKey === t.key ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="template"
                    value={t.key}
                    checked={templateKey === t.key}
                    onChange={(e) => setTemplateKey(e.target.value)}
                  />
                  <div className="template-card-body">
                    <div className="template-card-head">
                      <strong>{t.label}</strong>
                      <span className="text-xs text-muted">{t.steps.length} step{t.steps.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="template-card-desc">{t.desc}</div>
                    <div className="template-card-flow">
                      {t.steps.map((s, i) => (
                        <span key={i} className="template-step-chip">
                          {i === 0 ? 'Day 0' : `+${s.delayDays}d`}
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {!stubMode && (
              <div className="info-banner" style={{ marginTop: 12, marginBottom: 0 }}>
                <Icon name="bell" size={20} />
                <div>
                  <strong>On submit:</strong> we POST the campaign + sequence steps to Instantly, bulk-upload your {selectedContactIds.length} selected contact{selectedContactIds.length === 1 ? '' : 's'} as leads, and mirror everything into this app's local cache. The campaign starts as a draft — review and activate from the next page.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="modal-actions">
        {step > 1 && <button type="button" className="btn btn-outline" onClick={goBack} disabled={submitting}>Back</button>}
        <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
        {step < 3 && <button type="button" className="btn btn-primary" onClick={goNext} disabled={submitting}>Next →</button>}
        {step === 3 && (
          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Creating…' : (stubMode ? 'Create campaign (stub)' : 'Create campaign in Instantly')}
          </button>
        )}
      </div>
    </Modal>
  );
}
