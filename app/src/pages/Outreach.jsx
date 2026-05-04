// Outreach hub — top-level entry for the cold email module.
// Tabs: Campaigns (default) / Replies / Find Prospects / Settings.
// Replies tab shows the live "AI auto-routing" feed.
// Find Prospects tab simulates Scrap.io scraping + Claude decision-maker enrichment.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import NewCampaignModal from '../components/NewCampaignModal';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../components/Toast';
import {
  selectCampaigns, selectOutreachOverviewKpis, selectOutreachReplies,
  selectContactById, selectCampaignById, selectUserById, selectCampaignKpis,
  selectOutreachSettings, selectContacts, selectPipelineStages, selectTags,
  selectProspectSearches, selectProspectResults, selectResultsForSearch,
  selectActiveDmRunForResult, selectContactByEmail,
} from '../store/selectors';
import { CLASSIFICATION_META, classifyReply } from '../lib/outreachClassifier';
import {
  simulateInboundReply, outreachIsStub, connectMailbox,
  validateInstantlyKey, listMailboxes, initOAuth, pollOAuthSession, getMailboxByEmail,
} from '../lib/outreach';
import { runSearch, scrapioIsStub } from '../lib/scrapio';
import { enrichDecisionMaker } from '../lib/decisionMakerEnricher';
import { newId } from '../lib/ids';
import { fmtRelative } from '../lib/dates';

const TABS = [
  { key: 'campaigns',   label: 'Campaigns' },
  { key: 'replies',     label: 'Replies' },
  { key: 'prospecting', label: 'Find Prospects' },
  { key: 'settings',    label: 'Settings' },
];

const STATUS_BADGE = {
  active:    { color: 'green', label: 'Active' },
  paused:    { color: 'amber', label: 'Paused' },
  draft:     { color: 'slate', label: 'Draft' },
  completed: { color: 'blue',  label: 'Completed' },
};

export default function Outreach() {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const canEdit = usePermission('outreach.edit');

  const campaigns = selectCampaigns(state);
  const overview  = selectOutreachOverviewKpis(state);
  const replies   = selectOutreachReplies(state);
  const settings  = selectOutreachSettings(state);
  const contacts  = selectContacts(state);

  const [tab, setTab] = useState('campaigns');
  const [newOpen, setNewOpen] = useState(false);

  return (
    <>
      <div className="page-head">
        <h1>Outreach</h1>
        <span className="text-sm text-muted">Cold email campaigns + AI-routed replies</span>
        {canEdit && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setNewOpen(true)}>
            <Icon name="plus" size={14} /> New Campaign
          </button>
        )}
      </div>

      {/* Always-visible KPI strip */}
      <div className="metric-strip outreach-kpi-strip">
        <div className="metric-cell">
          <div className="val">{overview.active}</div>
          <div className="lbl">Active campaigns</div>
        </div>
        <div className="metric-cell">
          <div className="val">{overview.sent}</div>
          <div className="lbl">Emails sent</div>
        </div>
        <div className="metric-cell">
          <div className="val">{overview.rates.open}%</div>
          <div className="lbl">Open rate</div>
        </div>
        <div className="metric-cell">
          <div className="val">{overview.rates.reply}%</div>
          <div className="lbl">Reply rate</div>
        </div>
        <div className="metric-cell">
          <div className="val text-success">{overview.interested}</div>
          <div className="lbl">Interested replies</div>
        </div>
      </div>

      {!settings.mailboxConnected && (
        <div className="info-banner">
          <Icon name="warning" size={20} />
          <div>
            <strong>Mailbox not connected.</strong>{' '}
            Campaigns can be drafted, but won't send until you connect a mailbox in Settings.
            <button className="btn btn-outline btn-sm" style={{ marginLeft: 12 }} onClick={() => setTab('settings')}>
              Connect mailbox →
            </button>
          </div>
        </div>
      )}

      <div className="tab-container tab-container-line" style={{ marginBottom: 16 }}>
        {TABS.map((t) => {
          const runningSearches = t.key === 'prospecting'
            ? selectProspectSearches(state).filter((s) => s.status === 'running' || s.status === 'queued').length
            : 0;
          return (
            <button
              key={t.key}
              className={`tab-btn ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === 'replies' && replies.length > 0 && (
                <span className="tab-chip" aria-label={`${replies.length} replies`}>{replies.length}</span>
              )}
              {t.key === 'prospecting' && runningSearches > 0 && (
                <span className="tab-chip" aria-label={`${runningSearches} searches running`}>{runningSearches}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'campaigns' && (
        <CampaignsTab campaigns={campaigns} onNew={() => setNewOpen(true)} canEdit={canEdit} />
      )}
      {tab === 'replies' && (
        <RepliesTab
          replies={replies}
          contacts={contacts}
          dispatch={dispatch}
          toast={toast}
          state={state}
        />
      )}
      {tab === 'prospecting' && (
        <ProspectingTab dispatch={dispatch} toast={toast} state={state} settings={settings} />
      )}
      {tab === 'settings' && (
        <SettingsTab settings={settings} dispatch={dispatch} toast={toast} state={state} />
      )}

      <NewCampaignModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaigns tab
// ─────────────────────────────────────────────────────────────────────────────
function CampaignsTab({ campaigns, onNew, canEdit }) {
  const state = useStore();

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="mail" size={28} />}
        title="No campaigns yet"
        message="Set up your first cold email campaign in under 2 minutes — pick an audience from your contacts, choose a sequence template, and you're ready to send."
        action={canEdit ? <button className="btn btn-primary" onClick={onNew}><Icon name="plus" size={14} /> New Campaign</button> : null}
      />
    );
  }

  return (
    <div className="campaign-grid">
      {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} state={state} />)}
    </div>
  );
}

function CampaignCard({ campaign, state }) {
  const k = selectCampaignKpis(state, campaign.id);
  const sender = selectUserById(state, campaign.senderUserId);
  const meta = STATUS_BADGE[campaign.status] || STATUS_BADGE.draft;

  return (
    <Link to={`/outreach/campaigns/${campaign.id}`} className="campaign-card">
      <div className="campaign-card-head">
        <div>
          <div className="campaign-card-name">{campaign.name}</div>
          <div className="campaign-card-meta">
            {sender ? `Sending as ${sender.name}` : 'No sender'} · {fmtRelative(campaign.createdAt)}
          </div>
        </div>
        <span className={`badge ${meta.color}`}>{meta.label}</span>
      </div>
      <div className="campaign-card-stats">
        <Stat label="Enrolled" value={k.counts.enrolled} />
        <Stat label="Sent"     value={k.counts.sent} />
        <Stat label="Open"     value={`${k.rates.open}%`} />
        <Stat label="Reply"    value={`${k.rates.reply}%`} />
        <Stat label="Interested" value={k.classBreakdown.interested} accent={k.classBreakdown.interested > 0 ? 'success' : null} />
      </div>
      {campaign.description && (
        <div className="campaign-card-desc">{campaign.description}</div>
      )}
    </Link>
  );
}

function Stat({ label, value, accent }) {
  const cls = accent === 'success' ? 'text-success' : '';
  return (
    <div className="campaign-stat">
      <div className={`campaign-stat-val ${cls}`}>{value}</div>
      <div className="campaign-stat-lbl">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Replies tab — the demo's killer feature: AI-classified replies + auto-actions
// ─────────────────────────────────────────────────────────────────────────────
function RepliesTab({ replies, contacts, dispatch, toast, state }) {
  const sorted = useMemo(
    () => [...replies].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
    [replies],
  );

  const simulate = () => {
    // Pick a random un-replied contact from active campaigns and inject a reply.
    const SAMPLE_BODIES = [
      { body: "Yes, let's set up a call. What's your availability this week?", expectedClass: 'interested' },
      { body: "Tell me more. Send a deck if you have one.", expectedClass: 'interested' },
      { body: "Not interested — please remove me.", expectedClass: 'unsubscribe' },
      { body: "We already have a vendor, but thanks.", expectedClass: 'not_interested' },
      { body: "What's the typical pricing? Hard to evaluate without a number.", expectedClass: 'question' },
      { body: "Out of office until Monday. Will reply when back.", expectedClass: 'out_of_office' },
    ];
    const picks = SAMPLE_BODIES[Math.floor(Math.random() * SAMPLE_BODIES.length)];
    // Pick an enrollment that doesn't yet have a reply (so the demo keeps adding new ones).
    const replied = new Set(state.outreachReplies.map((r) => `${r.campaignId}::${r.contactId}`));
    const enrollment = (state.campaignEnrollments || []).find((e) => !replied.has(`${e.campaignId}::${e.contactId}`));
    if (!enrollment) {
      toast.error('No more enrollments to simulate replies for. Activate more contacts first.');
      return;
    }
    const contact = contacts.find((c) => c.id === enrollment.contactId);
    if (!contact) return;

    const result = classifyReply(picks.body);
    const payload = simulateInboundReply({
      campaignId: enrollment.campaignId,
      contactId:  enrollment.contactId,
      stepIndex:  enrollment.currentStepIndex,
      body:       picks.body,
    });
    dispatch({
      type: ACTIONS.RECEIVE_OUTREACH_REPLY,
      reply: {
        ...payload,
        classification: result.classification,
        classificationConfidence: result.confidence,
        classificationReasoning: result.reasoning,
      },
    });
    toast.success(`Inbound reply from ${contact.firstName} ${contact.lastName} — classified as ${CLASSIFICATION_META[result.classification].label}`);
  };

  return (
    <div>
      <div className="info-banner">
        <Icon name="bell" size={20} />
        <div style={{ flex: 1 }}>
          <strong>AI auto-routing is active.</strong>{' '}
          New replies are classified and routed automatically — interested leads land in your Pipeline, unsubscribes are suppressed, and questions get flagged for human reply.
        </div>
        {outreachIsStub() && (
          <button className="btn btn-outline btn-sm" onClick={simulate}>
            <Icon name="bell" size={12} /> Simulate Reply
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Icon name="mail" size={28} />}
          title="No replies yet"
          message="As prospects respond to your campaigns, replies will land here, get classified by AI, and route into your Pipeline + Tags automatically."
        />
      ) : (
        <div className="reply-list">
          {sorted.map((r) => (
            <ReplyCard key={r.id} reply={r} state={state} dispatch={dispatch} toast={toast} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplyCard({ reply, state, dispatch, toast }) {
  const contact = selectContactById(state, reply.contactId);
  const campaign = selectCampaignById(state, reply.campaignId);
  const meta = CLASSIFICATION_META[reply.classification] || CLASSIFICATION_META.other;
  const handled = Boolean(reply.handledAt);

  const markHandled = (e) => {
    e.preventDefault(); e.stopPropagation();
    dispatch({ type: ACTIONS.MARK_REPLY_HANDLED, id: reply.id });
    toast.success('Reply marked as handled');
  };

  return (
    <div className={`reply-card ${handled ? 'handled' : ''}`}>
      <div className="reply-card-head">
        <div className="reply-card-from">
          <strong>{contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown contact'}</strong>
          <span className="text-xs text-muted"> · {contact?.email}</span>
        </div>
        <span className={`badge ${meta.color}`} title={meta.description}>
          {meta.label}
          {reply.classificationConfidence > 0 && (
            <span style={{ opacity: 0.85, marginLeft: 6, fontWeight: 500 }}>
              · {Math.round(reply.classificationConfidence * 100)}%
            </span>
          )}
        </span>
      </div>
      <div className="reply-card-meta">
        Re: <em>{campaign?.name || 'Unknown campaign'}</em> · step {(reply.stepIndex ?? 0) + 1} · {fmtRelative(reply.receivedAt)}
      </div>
      <div className="reply-card-body">
        “{reply.body}”
      </div>
      {reply.classificationReasoning && (
        <div className="reply-card-ai">
          <Icon name="bell" size={14} />
          <div>
            <span className="reply-card-ai-label">AI reasoning:</span> {reply.classificationReasoning}
          </div>
        </div>
      )}
      {(reply.autoActions || []).length > 0 && (
        <div className="reply-card-actions">
          <div className="reply-card-actions-head">
            <Icon name="check" size={14} /> Auto-routing applied
          </div>
          <ul>
            {(reply.autoActions || []).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="reply-card-foot">
        {contact && (
          <Link to={`/contacts/${contact.id}`} className="btn btn-outline btn-sm">
            <Icon name="user" size={12} /> Open contact
          </Link>
        )}
        {!handled && (
          <button className="btn btn-outline btn-sm" onClick={markHandled}>
            <Icon name="check" size={12} /> Mark handled
          </button>
        )}
        {handled && (
          <span className="text-xs text-muted">Handled {fmtRelative(reply.handledAt)}</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings tab — Instantly API key + mailboxes, vendor keys, sending caps,
// AI auto-routing rules with per-rule customization.
// ─────────────────────────────────────────────────────────────────────────────
function SettingsTab({ settings, dispatch, toast, state }) {
  const tags = selectTags(state);
  const stages = selectPipelineStages(state);
  const apiKey = settings.instantlyApiKey;

  // Refresh the cached mailbox list from Instantly. Caller responsible for
  // showing toast on failure (we always show success to keep the flow tight).
  const refreshMailboxes = async (keyOverride) => {
    const key = keyOverride || apiKey;
    if (!key) return;
    try {
      const items = await listMailboxes(key);
      dispatch({
        type: ACTIONS.UPDATE_OUTREACH_SETTINGS,
        patch: { instantlyMailboxes: items, instantlyMailboxesFetchedAt: new Date().toISOString() },
      });
      return items;
    } catch (err) {
      toast.error(`Mailbox refresh failed — ${err.message}`);
      return null;
    }
  };

  // Legacy stub mailbox connect — only used when no Instantly key is configured.
  const connectStub = async (provider) => {
    try {
      const result = await connectMailbox(provider);
      dispatch({ type: ACTIONS.CONNECT_MAILBOX, provider, address: result.address });
      toast.success(`Connected ${result.address}`);
    } catch (err) {
      toast.error(err.message || 'Connect failed');
    }
  };

  const disconnectStub = () => {
    dispatch({ type: ACTIONS.DISCONNECT_MAILBOX });
    toast.success('Mailbox disconnected');
  };

  const updateRule = (key, value) => {
    dispatch({
      type: ACTIONS.UPDATE_OUTREACH_SETTINGS,
      patch: { autoRouting: { ...(settings.autoRouting || {}), [key]: value } },
    });
  };

  return (
    <div className="outreach-settings">
      <InstantlyApiKeyCard
        settings={settings}
        dispatch={dispatch}
        toast={toast}
        onValidated={refreshMailboxes}
      />
      <MailboxCard
        settings={settings}
        dispatch={dispatch}
        toast={toast}
        onRefresh={refreshMailboxes}
        onConnectStub={connectStub}
        onDisconnectStub={disconnectStub}
      />
      <ApiKeyCard
        title="Anthropic API Key"
        description="Your Anthropic API key — Claude reads each inbound reply and classifies the intent so the rules below can act on it. Get a key at console.anthropic.com. The key is stored only in this installation and is sent only to Anthropic."
        keyField="anthropicApiKey"
        validatedField="anthropicKeyValidatedAt"
        keyPrefix="sk-ant-"
        placeholder="sk-ant-api03-…"
        confirmRemoveMsg="Remove the Anthropic API key? Auto-routing will stop classifying replies and decision-maker enrichment will stop working."
        settings={settings} dispatch={dispatch} toast={toast}
      />
      <ApiKeyCard
        title="Scrap.io API Key"
        description="Scrap.io powers the Find Prospects tab — businesses are pulled from Google Maps with phone, website, and address. Get a key at scrap.io. Searches run against your own quota."
        keyField="scrapioApiKey"
        validatedField="scrapioKeyValidatedAt"
        keyPrefix=""
        placeholder="scr_live_…"
        confirmRemoveMsg="Remove the Scrap.io API key? Live prospect searches will stop working — sample results will populate the table instead."
        settings={settings} dispatch={dispatch} toast={toast}
      />
      <ApiKeyCard
        title="Perplexity API Key"
        description="Perplexity Sonar is the fallback when Claude can't find a decision maker on the business website. Optional — add it to enable Layer 2 enrichment."
        keyField="perplexityApiKey"
        validatedField="perplexityKeyValidatedAt"
        keyPrefix="pplx-"
        placeholder="pplx-…"
        confirmRemoveMsg="Remove the Perplexity API key? Layer 2 decision-maker enrichment will be disabled."
        optional
        settings={settings} dispatch={dispatch} toast={toast}
      />
      <SendingCapsCard settings={settings} dispatch={dispatch} />
      <AutoRoutingCard
        settings={settings}
        tags={tags}
        stages={stages}
        dispatch={dispatch}
        updateRule={updateRule}
        toast={toast}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Business profile — anchors decision-maker enrichment to the right buyer.
// Without this, the enricher picks whatever role exists at the prospect
// (Practice Manager at a dental office) instead of the role that buys from you.
// ─────────────────────────────────────────────────────────────────────────────
const BUSINESS_PRESETS = [
  {
    key: 'signage',
    label: 'Signage / Print',
    whatYouSell: 'Commercial signage and installs (storefront, wayfinding, ADA, vehicle)',
    targetRoles: ['Facilities Manager', 'Property Manager', 'Construction Project Manager', 'Operations Director', 'Marketing Director', 'Owner'],
    targetIndustries: ['Property Management', 'Construction / GC', 'Retail Chains', 'Restaurants', 'Healthcare', 'Hotels & Hospitality', 'Auto Dealerships', 'Banks / Credit Unions'],
  },
  {
    key: 'cleaning',
    label: 'Cleaning / Janitorial',
    whatYouSell: 'Janitorial and commercial cleaning services',
    targetRoles: ['Facilities Manager', 'Office Manager', 'Operations Director', 'Practice Manager', 'Owner'],
    targetIndustries: ['Medical / Dental', 'Property Management', 'Office', 'Restaurants'],
  },
  {
    key: 'it',
    label: 'IT Services / MSP',
    whatYouSell: 'Managed IT, cybersecurity, and helpdesk for SMB',
    targetRoles: ['IT Director', 'Operations Director', 'CFO', 'Owner', 'Office Manager'],
    targetIndustries: ['Professional Services', 'Healthcare', 'Manufacturing', 'Financial Services'],
  },
  {
    key: 'marketing',
    label: 'Marketing Agency',
    whatYouSell: 'Marketing services (paid media, content, SEO)',
    targetRoles: ['VP Marketing', 'Marketing Director', 'CEO', 'Founder', 'Head of Growth', 'Owner'],
    targetIndustries: ['SaaS', 'E-commerce', 'Professional Services', 'Healthcare'],
  },
];

const ROLE_SUGGESTIONS = [
  'Facilities Manager', 'Director of Facilities', 'Property Manager', 'Asset Manager',
  'Operations Director', 'Operations Manager', 'COO', 'CEO', 'CFO',
  'Construction Project Manager', "Owner's Representative",
  'Office Manager', 'Practice Manager', 'General Manager',
  'Marketing Director', 'VP Marketing', 'Head of Growth',
  'IT Director', 'CTO', 'Director of Procurement',
  'Founder', 'Owner', 'President',
];

const INDUSTRY_SUGGESTIONS = [
  'Property Management', 'Construction / GC', 'Commercial Real Estate',
  'Retail Chains', 'Restaurants', 'Hotels & Hospitality',
  'Healthcare', 'Medical / Dental', 'Senior Care',
  'Auto Dealerships', 'Banks / Credit Unions', 'Insurance',
  'Office', 'Coworking', 'Manufacturing',
  'SaaS', 'E-commerce', 'Professional Services', 'Financial Services',
  'Schools', 'Universities', 'Municipalities', 'Nonprofits',
];

function BusinessProfileCard({ settings, dispatch, toast }) {
  const profile = settings.businessProfile || {
    whatYouSell: '', targetRoles: [], targetIndustries: [], excludedTitles: [],
  };

  const update = (patch) => {
    dispatch({
      type: ACTIONS.UPDATE_OUTREACH_SETTINGS,
      patch: { businessProfile: { ...profile, ...patch } },
    });
  };

  const applyPreset = (preset) => {
    update({
      whatYouSell: preset.whatYouSell,
      targetRoles: preset.targetRoles,
      targetIndustries: preset.targetIndustries,
      excludedTitles: profile.excludedTitles?.length ? profile.excludedTitles : ['Receptionist', 'Administrative Assistant'],
    });
    toast.success(`Loaded preset: ${preset.label}`);
  };

  return (
    <div className="card dash-card targeting-card">
      <div className="targeting-head">
        <div className="targeting-step">Step 1</div>
        <div>
          <div className="targeting-title">Your targeting</div>
          <div className="text-sm text-muted">
            These three answers drive every prospect search and every decision-maker enrichment below. Edit anything, any time.
          </div>
        </div>
      </div>

      {/* Preset chips */}
      <div className="profile-preset-row">
        <span className="text-xs text-muted">Quick start →</span>
        {BUSINESS_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className="preset-btn"
            onClick={() => applyPreset(p)}
            title={p.whatYouSell}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Three explicit sections, each numbered */}
      <div className="targeting-segment">
        <div className="targeting-segment-num">1</div>
        <div className="targeting-segment-body">
          <label className="form-label">What you sell</label>
          <input
            className="input"
            value={profile.whatYouSell || ''}
            onChange={(e) => update({ whatYouSell: e.target.value })}
            placeholder="e.g. Commercial signage and installs (storefront, ADA, vehicle)"
          />
          <div className="form-help">One sentence on your offering. Used as context for AI-written cold emails.</div>
        </div>
      </div>

      <div className="targeting-segment">
        <div className="targeting-segment-num">2</div>
        <div className="targeting-segment-body">
          <ChipMultiSelect
            label="The roles you sell to"
            help="Priority order matters — at each prospect, role 1 is searched for first, then role 2, etc. The ★ marks the top priority."
            values={profile.targetRoles || []}
            onChange={(next) => update({ targetRoles: next })}
            suggestions={ROLE_SUGGESTIONS}
            placeholder="Add a role and hit Enter…"
          />
        </div>
      </div>

      <div className="targeting-segment">
        <div className="targeting-segment-num">3</div>
        <div className="targeting-segment-body">
          <ChipMultiSelect
            label="The industries those roles work in"
            help="The kinds of businesses you sell into. Suggested as quick-search shortcuts on the search form below."
            values={profile.targetIndustries || []}
            onChange={(next) => update({ targetIndustries: next })}
            suggestions={INDUSTRY_SUGGESTIONS}
            placeholder="Add an industry and hit Enter…"
          />
        </div>
      </div>

      {/* Compact extras — collapsed by default */}
      <details className="targeting-advanced">
        <summary>Advanced — titles to skip</summary>
        <ChipMultiSelect
          label=""
          help="Never return a contact whose title contains any of these words."
          values={profile.excludedTitles || []}
          onChange={(next) => update({ excludedTitles: next })}
          suggestions={['Receptionist', 'Administrative Assistant', 'Intern', 'Coordinator']}
          placeholder="Add title to skip…"
        />
      </details>
    </div>
  );
}

// Reusable chip multi-select — used by all three lists above.
function ChipMultiSelect({ label, help, values, onChange, suggestions, placeholder }) {
  const [draft, setDraft] = useState('');
  const safeValues = Array.isArray(values) ? values : [];

  const add = (val) => {
    const v = val.trim();
    if (!v) return;
    if (safeValues.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    onChange([...safeValues, v]);
    setDraft('');
  };

  const remove = (val) => {
    onChange(safeValues.filter((x) => x !== val));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && draft === '' && safeValues.length > 0) {
      // Quick-delete the last chip when input is empty.
      onChange(safeValues.slice(0, -1));
    }
  };

  // Suggestions = top 8 not already chosen.
  const remainingSuggestions = suggestions.filter((s) => !safeValues.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);

  return (
    <div className="form-group" style={{ marginTop: 14 }}>
      <label className="form-label">{label}</label>
      <div className="chip-multi">
        {safeValues.map((v, i) => (
          <span key={v} className="chip-multi-chip">
            {i === 0 && safeValues.length > 1 && <span className="chip-multi-priority" title="Top priority">★</span>}
            {v}
            <button type="button" className="chip-multi-remove" onClick={() => remove(v)} aria-label={`Remove ${v}`}>×</button>
          </span>
        ))}
        <input
          className="chip-multi-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
      </div>
      {remainingSuggestions.length > 0 && (
        <div className="chip-suggestions">
          {remainingSuggestions.map((s) => (
            <button key={s} type="button" className="chip-suggestion" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
      {help && <div className="form-help">{help}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Instantly API key card — first-class citizen now that the integration is real.
// On validate-and-save we (a) probe GET /accounts?limit=1 to confirm the bearer,
// (b) immediately fetch the full mailbox list, (c) stash both into outreachSettings.
// On Remove we wipe the key + cached mailboxes + cached plan tier.
// ─────────────────────────────────────────────────────────────────────────────
function InstantlyApiKeyCard({ settings, dispatch, toast, onValidated }) {
  const [draft, setDraft] = useState('');
  const [validating, setValidating] = useState(false);
  const currentKey = settings.instantlyApiKey;
  const isConnected = Boolean(currentKey);
  const last4 = currentKey?.slice(-4);
  const validatedAt = settings.instantlyKeyValidatedAt;
  const mailboxCount = (settings.instantlyMailboxes || []).length;

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) { toast.error('Paste your Instantly API key first.'); return; }
    setValidating(true);
    try {
      const result = await validateInstantlyKey(trimmed);
      if (!result.valid) {
        toast.error(result.errorMessage || 'Instantly rejected this key.');
        return;
      }
      dispatch({
        type: ACTIONS.UPDATE_OUTREACH_SETTINGS,
        patch: { instantlyApiKey: trimmed, instantlyKeyValidatedAt: new Date().toISOString() },
      });
      const mailboxes = await onValidated?.(trimmed);
      const count = mailboxes?.length ?? 0;
      toast.success(count > 0
        ? `Connected to Instantly — ${count} mailbox${count === 1 ? '' : 'es'} loaded`
        : 'Connected to Instantly — no mailboxes yet, connect one below');
      setDraft('');
    } catch (err) {
      toast.error(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const remove = () => {
    if (!window.confirm('Disconnect from Instantly? This clears your API key and the cached mailbox list. Existing campaigns continue to run on Instantly’s side, but you lose live status from this app.')) return;
    dispatch({
      type: ACTIONS.UPDATE_OUTREACH_SETTINGS,
      patch: {
        instantlyApiKey: null,
        instantlyKeyValidatedAt: null,
        instantlyMailboxes: [],
        instantlyMailboxesFetchedAt: null,
        instantlyPlanTier: null,
      },
    });
    toast.success('Disconnected from Instantly');
  };

  return (
    <div className="card dash-card">
      <div className="dash-card-title-row">
        <div className="dash-card-title" style={{ margin: 0, padding: 0, border: 'none' }}>
          Instantly.ai
          <span className="text-xs text-muted" style={{ marginLeft: 8, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
            · sending engine
          </span>
        </div>
        {isConnected && <span className="badge green" style={{ minWidth: 0, padding: '2px 10px' }}>Connected</span>}
      </div>
      <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
        Paste your Instantly v2 API key — campaigns created here POST to your Instantly workspace, leads bulk-upload, and sending happens through Instantly's connected mailboxes. Get a key in Instantly → Settings → Integrations → API Keys. The key lives only in this installation and talks directly to Instantly.
      </p>
      {isConnected ? (
        <div className="mailbox-connected">
          <div>
            <strong style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>…{last4}</strong>
            <div className="text-xs text-muted">
              Validated {fmtRelative(validatedAt)} · {mailboxCount} mailbox{mailboxCount === 1 ? '' : 'es'} cached
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={remove}>Disconnect</button>
        </div>
      ) : (
        <div className="flex-row" style={{ gap: 8 }}>
          <input
            className="input"
            type="password"
            placeholder="Paste your Instantly API key…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ flex: 1, fontFamily: 'ui-monospace, Menlo, monospace' }}
          />
          <button className="btn btn-primary" onClick={save} disabled={validating}>
            {validating ? 'Validating…' : 'Connect'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mailbox card — branches on whether an Instantly API key is configured.
//   - With key: shows the cached mailbox list + a real OAuth flow that opens
//     Instantly’s auth_url in a new tab and polls /oauth/session/status until
//     it succeeds, then refreshes the mailbox list.
//   - Without key: falls back to the legacy stub-only single-mailbox UI so
//     dev / demo continues to work end-to-end.
// ─────────────────────────────────────────────────────────────────────────────
function MailboxCard({ settings, dispatch, toast, onRefresh, onConnectStub, onDisconnectStub }) {
  const apiKey = settings.instantlyApiKey;
  const mailboxes = settings.instantlyMailboxes || [];

  // OAuth state — one in-flight session at a time (keeps the UX simple).
  const [oauth, setOauth] = useState(null);  // { provider, sessionId, authUrl, status }
  const pollRef = useRef(null);

  // Cancel any in-flight polling when card unmounts (e.g. navigating away from Settings tab).
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startOAuth = async (provider) => {
    if (!apiKey) {
      toast.error('Connect to Instantly first.');
      return;
    }
    try {
      const session = await initOAuth(apiKey, provider);
      setOauth({ provider, sessionId: session.sessionId, authUrl: session.authUrl, status: 'pending' });
      // Open the auth URL in a new tab — user signs in over there.
      window.open(session.authUrl, '_blank', 'noopener');
      toast.success(`Sign in with ${provider === 'google' ? 'Google' : 'Microsoft'} in the new tab — we’ll auto-detect when it finishes.`);
      // Poll every 2.5s for up to 5 minutes.
      const startedAt = Date.now();
      const timeoutMs = 5 * 60 * 1000;
      pollRef.current = setInterval(async () => {
        if (Date.now() - startedAt > timeoutMs) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setOauth((o) => o ? { ...o, status: 'expired' } : null);
          toast.error('OAuth timed out — try again.');
          return;
        }
        try {
          const status = await pollOAuthSession(apiKey, session.sessionId);
          if (status.status === 'success') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            // Look up full account to confirm + add to cache.
            try { await getMailboxByEmail(apiKey, status.email); } catch { /* still in onboarding */ }
            await onRefresh?.();
            setOauth(null);
            toast.success(`Connected ${status.email}`);
          } else if (status.status === 'error' || status.status === 'expired') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setOauth((o) => o ? { ...o, status: status.status } : null);
            toast.error(status.error_description || status.error || 'OAuth failed');
          }
        } catch (err) {
          // Single failed poll — keep trying. Surface only on hard auth fail.
          if (err.status === 401) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setOauth(null);
            toast.error('Instantly key was rejected mid-flow.');
          }
        }
      }, 2500);
    } catch (err) {
      toast.error(err.message || 'OAuth init failed');
    }
  };

  const cancelOAuth = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setOauth(null);
  };

  // ----- No Instantly key: render the legacy single-mailbox stub UI -----
  if (!apiKey) {
    return (
      <div className="card dash-card">
        <div className="dash-card-title">Mailbox</div>
        <div className="info-banner" style={{ marginBottom: 12 }}>
          <Icon name="warning" size={20} />
          <div>
            <strong>No Instantly key configured.</strong>{' '}
            Connect to Instantly above to manage real Google / Microsoft mailboxes via OAuth. The placeholder mailbox below lets you preview the flow without sending anything live.
          </div>
        </div>
        {settings.mailboxConnected ? (
          <div className="mailbox-connected">
            <div>
              <strong>{settings.mailboxAddress}</strong>
              <div className="text-xs text-muted">
                {settings.mailboxProvider} · connected {fmtRelative(settings.mailboxConnectedAt)}
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={onDisconnectStub}>Disconnect</button>
          </div>
        ) : (
          <div className="flex-row">
            <button className="btn btn-outline" onClick={() => onConnectStub('google')}>
              <Icon name="mail" size={14} /> Connect demo Google
            </button>
            <button className="btn btn-outline" onClick={() => onConnectStub('microsoft')}>
              <Icon name="mail" size={14} /> Connect demo Microsoft
            </button>
          </div>
        )}
      </div>
    );
  }

  // ----- With Instantly key: list real mailboxes + real OAuth for new ones -----
  return (
    <div className="card dash-card">
      <div className="dash-card-title-row">
        <div className="dash-card-title" style={{ margin: 0, padding: 0, border: 'none' }}>
          Sending mailboxes
          <span className="text-xs text-muted" style={{ marginLeft: 8, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
            · {mailboxes.length} connected
          </span>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => onRefresh?.()} title="Refresh from Instantly">
          Refresh
        </button>
      </div>
      <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
        These are the email addresses Instantly will send from. Connect new ones via OAuth — Instantly handles the auth round-trip and we just listen for it to finish.
      </p>

      {mailboxes.length === 0 ? (
        <div className="text-sm text-muted" style={{ padding: 12, background: 'var(--inset-bg)', borderRadius: 6, marginBottom: 12 }}>
          No mailboxes connected yet. Use the buttons below to connect Google or Microsoft.
        </div>
      ) : (
        <div className="mailbox-list">
          {mailboxes.map((m) => (
            <div key={m.id} className="mailbox-row">
              <div className="mailbox-row-main">
                <strong>{m.email}</strong>
                <div className="text-xs text-muted">
                  {m.provider} · {m.status}
                  {typeof m.warmupScore === 'number' && ` · warmup ${m.warmupScore}/100`}
                  {m.dailyLimit && ` · cap ${m.dailyLimit}/day`}
                  {m.setupPending && <span className="badge amber" style={{ marginLeft: 6, minWidth: 0, padding: '1px 8px' }}>Setup pending</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {oauth?.status === 'pending' ? (
        <div className="info-banner" style={{ marginTop: 12, marginBottom: 0 }}>
          <Icon name="bell" size={20} />
          <div style={{ flex: 1 }}>
            <strong>Waiting for {oauth.provider === 'google' ? 'Google' : 'Microsoft'} sign-in…</strong>
            <div className="text-xs text-muted">Complete sign-in in the new tab — we poll every 2.5s and add the mailbox automatically.</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={cancelOAuth}>Cancel</button>
        </div>
      ) : (
        <div className="flex-row" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => startOAuth('google')}>
            <Icon name="mail" size={14} /> Connect Google
          </button>
          <button className="btn btn-outline" onClick={() => startOAuth('microsoft')}>
            <Icon name="mail" size={14} /> Connect Microsoft
          </button>
        </div>
      )}
    </div>
  );
}

function ApiKeyCard({ title, description, keyField, validatedField, keyPrefix, placeholder, confirmRemoveMsg, optional, settings, dispatch, toast }) {
  const [draft, setDraft] = useState('');
  const [validating, setValidating] = useState(false);
  const currentKey = settings[keyField];
  const isConnected = Boolean(currentKey);
  const last4 = currentKey?.slice(-4);
  const validatedAt = settings[validatedField];

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed) { toast.error('Paste a key first.'); return; }
    if (keyPrefix && !trimmed.startsWith(keyPrefix)) {
      toast.error(`Keys start with "${keyPrefix}".`);
      return;
    }
    setValidating(true);
    // Stub validation — production calls the vendor's auth endpoint.
    setTimeout(() => {
      dispatch({
        type: ACTIONS.UPDATE_OUTREACH_SETTINGS,
        patch: { [keyField]: trimmed, [validatedField]: new Date().toISOString() },
      });
      toast.success('Key validated and saved');
      setDraft('');
      setValidating(false);
    }, 700);
  };

  const remove = () => {
    if (!window.confirm(confirmRemoveMsg)) return;
    dispatch({
      type: ACTIONS.UPDATE_OUTREACH_SETTINGS,
      patch: { [keyField]: null, [validatedField]: null },
    });
    toast.success('API key removed');
  };

  return (
    <div className="card dash-card">
      <div className="dash-card-title-row">
        <div className="dash-card-title" style={{ margin: 0, padding: 0, border: 'none' }}>
          {title}
          {optional && <span className="text-xs text-muted" style={{ marginLeft: 8, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· optional</span>}
        </div>
        {isConnected && <span className="badge green" style={{ minWidth: 0, padding: '2px 10px' }}>Connected</span>}
      </div>
      <p className="text-sm text-muted" style={{ marginBottom: 12 }}>{description}</p>
      {isConnected ? (
        <div className="mailbox-connected">
          <div>
            <strong style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
              {keyPrefix ? `${keyPrefix}…${last4}` : `…${last4}`}
            </strong>
            <div className="text-xs text-muted">
              Validated {fmtRelative(validatedAt)}
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={remove}>Remove</button>
        </div>
      ) : (
        <div className="flex-row" style={{ gap: 8 }}>
          <input
            className="input"
            type="password"
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{ flex: 1, fontFamily: 'ui-monospace, Menlo, monospace' }}
          />
          <button className="btn btn-primary" onClick={save} disabled={validating}>
            {validating ? 'Validating…' : 'Save & Validate'}
          </button>
        </div>
      )}
    </div>
  );
}

function SendingCapsCard({ settings, dispatch }) {
  return (
    <div className="card dash-card">
      <div className="dash-card-title">Sending caps</div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Daily send cap</label>
          <input
            className="input"
            type="number"
            value={settings.dailyCap || 0}
            onChange={(e) => dispatch({ type: ACTIONS.UPDATE_OUTREACH_SETTINGS, patch: { dailyCap: Number(e.target.value) } })}
          />
          <div className="form-help">Max emails per day across all campaigns. Safe range: 30–80.</div>
        </div>
        <div className="form-group">
          <label className="form-label">Sending hours</label>
          <div className="flex-row">
            <input
              className="input"
              type="number"
              min="0" max="23"
              value={settings.sendingHoursStart || 0}
              onChange={(e) => dispatch({ type: ACTIONS.UPDATE_OUTREACH_SETTINGS, patch: { sendingHoursStart: Number(e.target.value) } })}
              style={{ maxWidth: 80 }}
            />
            <span className="text-muted">to</span>
            <input
              className="input"
              type="number"
              min="0" max="23"
              value={settings.sendingHoursEnd || 0}
              onChange={(e) => dispatch({ type: ACTIONS.UPDATE_OUTREACH_SETTINGS, patch: { sendingHoursEnd: Number(e.target.value) } })}
              style={{ maxWidth: 80 }}
            />
          </div>
          <div className="form-help">Local time, 24-hour. Most replies happen 9am–5pm.</div>
        </div>
      </div>
    </div>
  );
}

function AutoRoutingCard({ settings, tags, stages, dispatch, updateRule, toast }) {
  const enabled = settings.autoRoutingEnabled !== false;
  const hasKey = Boolean(settings.anthropicApiKey);
  const interestedStageKey = settings.autoRouting?.interestedPipelineStageKey || 'qualified';

  const toggleMaster = (v) => {
    dispatch({ type: ACTIONS.UPDATE_OUTREACH_SETTINGS, patch: { autoRoutingEnabled: v } });
    toast.success(v ? 'AI auto-routing enabled' : 'AI auto-routing turned off — replies go straight to your inbox');
  };

  return (
    <div className="card dash-card">
      <div className="auto-routing-header">
        <label className="auto-routing-toggle">
          <input type="checkbox" checked={enabled} onChange={(e) => toggleMaster(e.target.checked)} />
          <div>
            <div className="auto-routing-title">AI Auto-Routing</div>
            <div className="text-sm text-muted">
              Automatically take action on every inbound reply — tag the contact, move them into your pipeline, suppress unsubscribes, or flag a question for you. You stay in control of what each reply type does.
            </div>
          </div>
        </label>
      </div>

      {!hasKey && enabled && (
        <div className="info-banner" style={{ marginTop: 12, marginBottom: 0 }}>
          <Icon name="warning" size={20} />
          <div>
            <strong>Add an Anthropic API key above</strong> to enable real-time classification. Until then, replies will queue in your inbox unrouted.
          </div>
        </div>
      )}

      {enabled && (
        <div className="rules-list">
          <div className="rules-list-head">When a reply is classified as…</div>

          {/* INTERESTED — has stage selector + tag */}
          <div className="rule-block">
            <div className="rule-block-head">
              <span className="badge green" style={{ minWidth: 110 }}>Interested</span>
              <label className="rule-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(settings.autoRouting?.interestedToPipeline)}
                  onChange={(e) => updateRule('interestedToPipeline', e.target.checked)}
                />
                <span>Move into pipeline</span>
              </label>
            </div>
            {settings.autoRouting?.interestedToPipeline && (
              <div className="rule-block-body">
                <div className="rule-detail-row">
                  <span className="text-sm">Drop them into stage</span>
                  <select
                    className="input"
                    value={interestedStageKey}
                    onChange={(e) => updateRule('interestedPipelineStageKey', e.target.value)}
                    style={{ maxWidth: 200 }}
                  >
                    {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="rule-detail-row">
                  <span className="text-sm">Tag the contact with</span>
                  <select
                    className="input"
                    value={settings.autoRouting?.interestedTagId || ''}
                    onChange={(e) => updateRule('interestedTagId', e.target.value || null)}
                    style={{ maxWidth: 200 }}
                  >
                    <option value="">— No tag —</option>
                    {tags.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  Then pause the sequence so you don't keep emailing someone who's ready to talk.
                </div>
              </div>
            )}
          </div>

          {/* NOT INTERESTED */}
          <div className="rule-block">
            <div className="rule-block-head">
              <span className="badge slate" style={{ minWidth: 110 }}>Not interested</span>
              <label className="rule-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(settings.autoRouting?.notInterestedTagId)}
                  onChange={(e) => updateRule('notInterestedTagId', e.target.checked ? (tags.find((t) => t.label === 'Do Not Disturb')?.id || tags[0]?.id) : null)}
                />
                <span>Tag and suppress</span>
              </label>
            </div>
            {settings.autoRouting?.notInterestedTagId && (
              <div className="rule-block-body">
                <div className="rule-detail-row">
                  <span className="text-sm">Tag the contact with</span>
                  <select
                    className="input"
                    value={settings.autoRouting.notInterestedTagId}
                    onChange={(e) => updateRule('notInterestedTagId', e.target.value)}
                    style={{ maxWidth: 200 }}
                  >
                    {tags.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                  They'll be excluded from every campaign you run from now on.
                </div>
              </div>
            )}
          </div>

          {/* UNSUBSCRIBE */}
          <div className="rule-block">
            <div className="rule-block-head">
              <span className="badge red" style={{ minWidth: 110 }}>Unsubscribe</span>
              <label className="rule-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(settings.autoRouting?.unsubscribeArchive)}
                  onChange={(e) => updateRule('unsubscribeArchive', e.target.checked)}
                />
                <span>Archive contact</span>
              </label>
            </div>
            <div className="rule-block-body">
              <div className="text-xs text-muted">
                Removes them from your active contact list and every sequence — required for CAN-SPAM compliance.
              </div>
            </div>
          </div>

          {/* QUESTION */}
          <div className="rule-block">
            <div className="rule-block-head">
              <span className="badge amber" style={{ minWidth: 110 }}>Question</span>
              <label className="rule-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(settings.autoRouting?.questionAssignToOwner)}
                  onChange={(e) => updateRule('questionAssignToOwner', e.target.checked)}
                />
                <span>Send to me</span>
              </label>
            </div>
            <div className="rule-block-body">
              <div className="text-xs text-muted">
                Pauses the sequence and routes the reply to the campaign owner. Pricing questions, feature questions — these are the ones you want to answer personally.
              </div>
            </div>
          </div>

          {/* OUT OF OFFICE — implicit, always defers */}
          <div className="rule-block">
            <div className="rule-block-head">
              <span className="badge blue" style={{ minWidth: 110 }}>Out of office</span>
              <span className="text-xs text-muted">Always defers ~3 days</span>
            </div>
            <div className="rule-block-body">
              <div className="text-xs text-muted">
                Auto-replies pause the next step until they're back. No tag changes; the contact stays in the sequence.
              </div>
            </div>
          </div>
        </div>
      )}

      {!enabled && (
        <div className="info-banner" style={{ marginTop: 12, marginBottom: 0 }}>
          <Icon name="bell" size={20} />
          <div>
            <strong>Auto-routing is off.</strong> Every inbound reply will land in your inbox unclassified. Turn it back on to have Claude triage replies for you.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Find Prospects tab — Scrap.io search + Claude decision-maker enrichment
// ─────────────────────────────────────────────────────────────────────────────
function ProspectingTab({ dispatch, toast, state, settings }) {
  const searches = selectProspectSearches(state);
  const allResults = selectProspectResults(state);

  const [activeSearchId, setActiveSearchId] = useState(searches[0]?.id || null);
  // Reset to most recent search when a new one starts.
  useEffect(() => {
    if (!activeSearchId && searches[0]) setActiveSearchId(searches[0].id);
  }, [searches, activeSearchId]);

  const activeSearch = searches.find((s) => s.id === activeSearchId);
  const activeResults = activeSearch ? selectResultsForSearch(state, activeSearch.id) : [];

  const onNewSearch = (params) => {
    const searchId = newId('ps_s');
    // Persist the per-search role override on the search record itself so the
    // enricher uses it later when the user clicks "Find →" on individual rows.
    dispatch({
      type: ACTIONS.ADD_PROSPECT_SEARCH,
      search: {
        id: searchId,
        query: params.query,
        location: params.location,
        resultCap: params.resultCap,
        overrideRole: params.overrideRole || null,
        status: 'running',
        progress: 0,
      },
    });
    setActiveSearchId(searchId);
    runSearch({
      query: params.query,
      location: params.location,
      resultCap: params.resultCap,
      onProgress: (pct) => dispatch({ type: ACTIONS.UPDATE_PROSPECT_SEARCH, id: searchId, patch: { progress: pct } }),
    })
      .then(({ results }) => {
        const stamped = results.map((r) => ({
          ...r,
          id: newId('ps_r'),
          searchId,
          savedContactId: null,
          foundAt: new Date().toISOString(),
        }));
        dispatch({ type: ACTIONS.ADD_PROSPECT_RESULTS, results: stamped });
        dispatch({
          type: ACTIONS.UPDATE_PROSPECT_SEARCH, id: searchId,
          patch: { status: 'completed', progress: 100, completedAt: new Date().toISOString() },
        });
        toast.success(`Found ${results.length} prospects`);
      })
      .catch((err) => {
        dispatch({
          type: ACTIONS.UPDATE_PROSPECT_SEARCH, id: searchId,
          patch: { status: 'failed', failureReason: err.message },
        });
        toast.error(`Search failed — ${err.message}`);
      });
  };

  return (
    <div className="prospecting-layout">
      <div className="prospecting-main">
        {/* Step 1: targeting (who you sell to) — explicit + persistent */}
        <BusinessProfileCard settings={settings} dispatch={dispatch} toast={toast} />
        {/* Step 2: search (where to look) */}
        <ProspectSearchForm onSubmit={onNewSearch} settings={settings} />
        {/* Step 3: results (who we found) */}
        {activeSearch && (
          <ProspectResultsPanel
            search={activeSearch}
            results={activeResults}
            allResults={allResults}
            settings={settings}
            dispatch={dispatch}
            toast={toast}
            state={state}
          />
        )}
        {!activeSearch && (
          <EmptyState
            icon={<Icon name="search" size={28} />}
            title="No searches yet"
            message="Set your targeting above, then run your first search. Matching businesses load from Google Maps, and the people who fit your target roles get enriched automatically."
          />
        )}
      </div>
      <ProspectSearchHistory
        searches={searches}
        activeSearchId={activeSearchId}
        onSelect={setActiveSearchId}
        dispatch={dispatch}
        toast={toast}
      />
    </div>
  );
}

function ProspectSearchForm({ onSubmit, settings }) {
  const profile = settings.businessProfile || {};
  const profileRoles = profile.targetRoles || [];
  const profileIndustries = profile.targetIndustries || [];

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [resultCap, setResultCap] = useState(25);
  // Per-search role override — defaults to top profile role.
  const [overrideRole, setOverrideRole] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!query.trim() || !location.trim()) return;
    onSubmit({
      query: query.trim(),
      location: location.trim(),
      resultCap,
      // null = use profile.targetRoles. A non-empty override moves that role
      // to the front of the priority list for THIS search only.
      overrideRole: overrideRole.trim() || null,
    });
  };

  const hasKey = Boolean(settings.scrapioApiKey);

  return (
    <div className="card dash-card prospect-search-form">
      <div className="targeting-head">
        <div className="targeting-step">Step 2</div>
        <div>
          <div className="targeting-title">Where to look</div>
          <div className="text-sm text-muted">
            Type a business type + location. Matching businesses load from Google Maps. Each decision-maker found uses the targeting from Step 1 above.
          </div>
        </div>
        {!hasKey && <span className="badge amber" style={{ minWidth: 0, padding: '2px 10px', marginLeft: 'auto' }}>API key needed</span>}
      </div>

      <form onSubmit={submit} className="prospect-search-form-row" style={{ marginTop: 14 }}>
        <input
          className="input"
          placeholder="Business type (e.g. commercial cleaning, property management)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          className="input"
          placeholder="Location (e.g. Seattle, WA)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <select
          className="input"
          value={resultCap}
          onChange={(e) => setResultCap(Number(e.target.value))}
          style={{ maxWidth: 110 }}
        >
          <option value={10}>10 results</option>
          <option value={25}>25 results</option>
          <option value={50}>50 results</option>
        </select>
        <button type="submit" className="btn btn-primary" disabled={!query.trim() || !location.trim()}>
          <Icon name="search" size={14} /> Run search
        </button>
      </form>

      {/* Industry shortcuts pulled from profile */}
      {profileIndustries.length > 0 && (
        <div className="search-suggestion-row">
          <span className="text-xs text-muted">Try one →</span>
          {profileIndustries.slice(0, 6).map((ind) => (
            <button
              key={ind}
              type="button"
              className="preset-btn preset-btn-sm"
              onClick={() => setQuery(ind.toLowerCase())}
              title={`Search for: ${ind}`}
            >
              {ind}
            </button>
          ))}
        </div>
      )}

      {/* Per-search role override */}
      {profileRoles.length > 0 && (
        <div className="search-override-row">
          <span className="text-sm">For this search, look for</span>
          <select
            className="input"
            value={overrideRole}
            onChange={(e) => setOverrideRole(e.target.value)}
            style={{ maxWidth: 260 }}
          >
            <option value="">{profileRoles[0]} (your default)</option>
            {profileRoles.slice(1).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
            <option value="" disabled>──────────</option>
            {profileRoles.map((r) => (
              <option key={`force-${r}`} value={r}>↑ Force "{r}" first</option>
            ))}
          </select>
          <span className="text-xs text-muted">first at every prospect found.</span>
        </div>
      )}

      {!hasKey && (
        <div className="text-xs text-muted" style={{ marginTop: 10 }}>
          Add your Scrap.io API key in Settings to search Google Maps. Without a key, sample results populate the table so you can still try the flow.
        </div>
      )}
    </div>
  );
}

function ProspectResultsPanel({ search, results, settings, dispatch, toast, state }) {
  const [selected, setSelected] = useState(new Set());

  // Clear selection if the search changes.
  useEffect(() => { setSelected(new Set()); }, [search.id]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectAllUnsaved = () => {
    const ids = results.filter((r) => !r.savedContactId).map((r) => r.id);
    setSelected(new Set(ids));
  };

  const selectedResults = results.filter((r) => selected.has(r.id));
  const savedCount = results.filter((r) => r.savedContactId).length;
  const enrichedCount = results.filter((r) => r.decisionMaker).length;

  const bulkSave = () => {
    let saved = 0; let skipped = 0;
    for (const r of selectedResults) {
      if (r.savedContactId) continue;
      const dm = r.decisionMaker;
      // Without a decision maker we still create a contact for the business
      // itself — name pulled from businessName, email synthesized from website.
      const email = dm?.email || (r.website ? `info@${r.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}` : null);
      if (!email) { skipped++; continue; }
      // Dedupe against existing contacts.
      const existing = selectContactByEmail(state, email);
      if (existing) {
        dispatch({ type: ACTIONS.LINK_PROSPECT_TO_CONTACT, resultId: r.id, contactId: existing.id });
        skipped++;
        continue;
      }
      const contactId = newId('ct');
      dispatch({
        type: ACTIONS.ADD_CONTACT,
        contact: {
          id: contactId,
          email,
          firstName: dm?.firstName || '',
          lastName:  dm?.lastName  || r.businessName,
          title:     dm?.title     || '',
          phone:     r.phone || '',
          companyId: null,
          ownerUserId: state.currentUserId,
          tagIds: [],
          visibility: 'org',
          lifecycle: 'lead',
          stage: 'new',
          notes: `Sourced via prospect search: "${search.query}" in ${search.location}.`,
          customFields: { company: r.businessName, sourceSearchId: search.id, website: r.website },
        },
      });
      dispatch({ type: ACTIONS.LINK_PROSPECT_TO_CONTACT, resultId: r.id, contactId });
      saved++;
    }
    setSelected(new Set());
    if (saved > 0) toast.success(`Saved ${saved} contact${saved === 1 ? '' : 's'} to CRM${skipped > 0 ? ` (${skipped} skipped — duplicates or no email)` : ''}`);
    else if (skipped > 0) toast.error(`No new contacts saved — ${skipped} were duplicates or had no email yet. Enrich first.`);
  };

  // Build the priority-ordered targetRoles for this enrichment:
  //   1. If this search has an overrideRole, put it first.
  //   2. Then the profile's targetRoles in their natural order.
  // Falls back to a sensible default if no profile exists.
  const buildTargetRoles = () => {
    const profile = settings.businessProfile || {};
    const profileRoles = profile.targetRoles || [];
    const override = search.overrideRole;
    if (!override) return profileRoles;
    const rest = profileRoles.filter((r) => r.toLowerCase() !== override.toLowerCase());
    return [override, ...rest];
  };

  const enrichOne = (resultId) => {
    const result = results.find((r) => r.id === resultId);
    if (!result) return;
    if (!settings.anthropicApiKey) {
      toast.error('Add an Anthropic API key in Settings to enrich.');
      return;
    }
    const runId = newId('dm_r');
    dispatch({ type: ACTIONS.START_DM_RUN, run: { id: runId, resultId, layer: 'website' } });
    enrichDecisionMaker({
      businessName: result.businessName,
      category: result.category,
      website: result.website,
      anthropicKey: settings.anthropicApiKey,
      perplexityKey: settings.perplexityApiKey,
      targetRoles: buildTargetRoles(),
      excludedTitles: settings.businessProfile?.excludedTitles || [],
    })
      .then((out) => {
        dispatch({
          type: ACTIONS.COMPLETE_DM_RUN,
          id: runId,
          decisionMaker: out.decisionMaker,
          foundCandidateCount: out.candidateCount,
        });
        if (out.decisionMaker) {
          toast.success(`Found ${out.decisionMaker.firstName} ${out.decisionMaker.lastName} — ${out.matchedRole || out.decisionMaker.title}`);
        } else {
          toast.error(out.failureReason || 'No decision maker found.');
        }
      })
      .catch((err) => {
        dispatch({ type: ACTIONS.FAIL_DM_RUN, id: runId, failureReason: err.message });
        toast.error(`Enrichment failed — ${err.message}`);
      });
  };

  const enrichAllVisible = () => {
    const targets = results.filter((r) => !r.decisionMaker && !selectActiveDmRunForResult(state, r.id)?.status?.match(/running/));
    if (targets.length === 0) { toast.error('All results already enriched.'); return; }
    if (!settings.anthropicApiKey) { toast.error('Add an Anthropic API key in Settings to enrich.'); return; }
    targets.forEach((r) => enrichOne(r.id));
    toast.success(`Enriching ${targets.length} prospect${targets.length === 1 ? '' : 's'}…`);
  };

  if (search.status === 'running' || search.status === 'queued') {
    return (
      <div className="card dash-card">
        <div className="dash-card-title">Searching Google Maps…</div>
        <div className="prospect-progress">
          <div className="prospect-progress-bar" style={{ width: `${search.progress || 0}%` }} />
        </div>
        <div className="text-sm text-muted" style={{ marginTop: 10 }}>
          {search.progress || 0}% — pulling businesses matching "{search.query}" in {search.location}
        </div>
      </div>
    );
  }

  if (search.status === 'failed') {
    return (
      <div className="card dash-card">
        <div className="dash-card-title">Search failed</div>
        <div className="text-sm" style={{ color: 'var(--danger)' }}>{search.failureReason || 'Unknown error'}</div>
      </div>
    );
  }

  return (
    <div className="card dash-card">
      <div className="dash-card-title-row">
        <div>
          <div className="dash-card-title" style={{ margin: 0, padding: 0, border: 'none' }}>
            Results for "{search.query}" in {search.location}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            {results.length} businesses · {enrichedCount} enriched · {savedCount} saved to CRM
          </div>
        </div>
        <div className="flex-row">
          <button className="btn btn-outline btn-sm" onClick={enrichAllVisible}>
            <Icon name="search" size={12} /> Enrich all
          </button>
          <button className="btn btn-outline btn-sm" onClick={selectAllUnsaved}>
            Select unsaved
          </button>
          <button
            className="btn btn-primary btn-sm"
            disabled={selected.size === 0}
            onClick={bulkSave}
          >
            <Icon name="plus" size={12} /> Save {selected.size > 0 ? `${selected.size} ` : ''}to CRM
          </button>
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="prospect-results-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Business</th>
              <th>Category</th>
              <th>Phone</th>
              <th>Website</th>
              <th>Decision maker</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const dmRun = selectActiveDmRunForResult(state, r.id);
              const enriching = dmRun?.status === 'running';
              const failed = dmRun?.status === 'failed';
              const saved = Boolean(r.savedContactId);
              return (
                <tr key={r.id} className={saved ? 'saved' : ''}>
                  <td>
                    {!saved && (
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                      />
                    )}
                  </td>
                  <td className="name">
                    {r.businessName}
                    <div className="text-xs text-muted">{r.address}</div>
                  </td>
                  <td><span className="text-xs text-muted">{r.category}</span></td>
                  <td className="text-xs">{r.phone}</td>
                  <td className="text-xs">{r.website}</td>
                  <td>
                    {r.decisionMaker ? (
                      <div>
                        <div className="text-sm" style={{ fontWeight: 600 }}>
                          {r.decisionMaker.firstName} {r.decisionMaker.lastName}
                        </div>
                        <div className="text-xs">
                          <span className="dm-role-badge" title="Matched your targeting">{r.decisionMaker.title}</span>
                        </div>
                        {r.decisionMaker.email && (
                          <div className="text-xs" style={{ color: 'var(--primary)', marginTop: 4 }}>{r.decisionMaker.email}</div>
                        )}
                        <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                          via {r.decisionMaker.source === 'website' ? 'Claude (website)' : 'Perplexity (web search)'}
                          {r.decisionMaker.confidence && ` · ${Math.round(r.decisionMaker.confidence * 100)}%`}
                        </div>
                      </div>
                    ) : enriching ? (
                      <span className="text-xs text-muted">
                        <span className="dot-pulse" /> Reading website…
                      </span>
                    ) : failed ? (
                      <button className="btn btn-outline btn-sm" onClick={() => enrichOne(r.id)}>
                        Retry
                      </button>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={() => enrichOne(r.id)}>
                        Find →
                      </button>
                    )}
                  </td>
                  <td>
                    {saved ? (
                      <Link to={`/contacts/${r.savedContactId}`} className="text-xs" style={{ color: 'var(--success)' }}>
                        ✓ In CRM
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProspectSearchHistory({ searches, activeSearchId, onSelect, dispatch, toast }) {
  if (searches.length === 0) return null;
  return (
    <div className="card prospecting-history">
      <div className="dash-card-title" style={{ padding: '14px 14px 10px' }}>Search history</div>
      <div className="prospecting-history-list">
        {searches.map((s) => {
          const isActive = s.id === activeSearchId;
          return (
            <div
              key={s.id}
              className={`prospecting-history-row ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(s.id)}
            >
              <div className="prospecting-history-query">{s.query || '(empty query)'}</div>
              <div className="prospecting-history-meta">
                {s.location} · <SearchStatusBadge status={s.status} progress={s.progress} />
              </div>
              <div className="text-xs text-muted">{fmtRelative(s.createdAt)}</div>
              <button
                className="prospecting-history-del"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Delete this search and its results? Saved contacts stay in your CRM.')) {
                    dispatch({ type: ACTIONS.DELETE_PROSPECT_SEARCH, id: s.id });
                    toast.success('Search deleted');
                  }
                }}
                title="Delete search"
                aria-label="Delete search"
              >
                <Icon name="x" size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SearchStatusBadge({ status, progress }) {
  if (status === 'running' || status === 'queued') {
    return <span className="badge blue" style={{ minWidth: 0, padding: '1px 8px' }}>Running {progress || 0}%</span>;
  }
  if (status === 'completed') return <span className="badge green" style={{ minWidth: 0, padding: '1px 8px' }}>Done</span>;
  if (status === 'failed')    return <span className="badge red"   style={{ minWidth: 0, padding: '1px 8px' }}>Failed</span>;
  return <span className="badge slate" style={{ minWidth: 0, padding: '1px 8px' }}>Queued</span>;
}
