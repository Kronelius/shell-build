// Per-campaign detail. Tabs: Overview / Sequence / Audience / Replies.
// "Activate" / "Pause" buttons live in the page-head and toggle SET_CAMPAIGN_STATUS.

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../components/Toast';
import {
  selectCampaignById, selectStepsForCampaign, selectEnrollmentsForCampaign,
  selectRepliesForCampaign, selectCampaignKpis, selectContactById, selectUserById,
  selectContacts, selectOutreachSettings,
} from '../store/selectors';
import { CLASSIFICATION_META } from '../lib/outreachClassifier';
import { fmtRelative } from '../lib/dates';
import {
  activateCampaign, pauseCampaign, deleteCampaign as instantlyDeleteCampaign,
  outreachIsStub,
} from '../lib/outreach';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'sequence', label: 'Sequence' },
  { key: 'audience', label: 'Audience' },
  { key: 'replies',  label: 'Replies' },
];

const STATUS_BADGE = {
  active:    { color: 'green', label: 'Active' },
  paused:    { color: 'amber', label: 'Paused' },
  draft:     { color: 'slate', label: 'Draft' },
  completed: { color: 'blue',  label: 'Completed' },
};

const ENROLLMENT_STATUS_BADGE = {
  pending:      { color: 'slate', label: 'Pending' },
  active:       { color: 'blue',  label: 'In flight' },
  replied:      { color: 'green', label: 'Replied' },
  unsubscribed: { color: 'red',   label: 'Unsubscribed' },
  bounced:      { color: 'amber', label: 'Bounced' },
  completed:    { color: 'slate', label: 'Sequence done' },
};

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();

  const canSend = usePermission('outreach.send');
  const canEdit = usePermission('outreach.edit');

  const campaign = selectCampaignById(state, campaignId);
  const [tab, setTab] = useState('overview');
  const [editingStep, setEditingStep] = useState(null); // step row being edited
  const [enrollOpen, setEnrollOpen] = useState(false);

  if (!campaign) {
    return (
      <div className="page-head">
        <Link to="/outreach" className="btn btn-outline btn-sm">
          <Icon name="chevronLeft" size={14} /> Back to Outreach
        </Link>
        <h1 style={{ marginLeft: 12 }}>Campaign not found</h1>
      </div>
    );
  }

  const steps = selectStepsForCampaign(state, campaign.id);
  const enrollments = selectEnrollmentsForCampaign(state, campaign.id);
  const replies = selectRepliesForCampaign(state, campaign.id);
  const kpis = selectCampaignKpis(state, campaign.id);
  const sender = selectUserById(state, campaign.senderUserId);
  const meta = STATUS_BADGE[campaign.status] || STATUS_BADGE.draft;

  // Activate / pause / delete: when an Instantly key is configured we hit the
  // real API first, then mirror the result into local state. In stub mode we
  // skip the API call. Note: the local campaign id IS the Instantly id when
  // created in production mode (NewCampaignModal stores it that way), so we
  // can pass campaign.id straight through to the API.
  const settings = selectOutreachSettings(state);
  const apiKey = settings.instantlyApiKey;
  const stubMode = outreachIsStub(apiKey);

  const setStatus = async (next, reason) => {
    if (!stubMode && (next === 'active' || next === 'paused')) {
      try {
        if (next === 'active') await activateCampaign(apiKey, campaign.id);
        else                   await pauseCampaign(apiKey, campaign.id);
      } catch (err) {
        toast.error(`Instantly ${next === 'active' ? 'activate' : 'pause'} failed — ${err.message}`);
        return;
      }
    }
    dispatch({ type: ACTIONS.SET_CAMPAIGN_STATUS, id: campaign.id, status: next, reason });
    toast.success(`Campaign ${next}${stubMode ? ' (local only)' : ''}`);
  };

  const removeCampaign = async () => {
    if (!window.confirm(`Delete campaign "${campaign.name}"? This removes all enrollments + events. Replies stay attached to contacts via their activity log.${stubMode ? '' : ' This also deletes the campaign in Instantly.'}`)) return;
    if (!stubMode) {
      try {
        await instantlyDeleteCampaign(apiKey, campaign.id);
      } catch (err) {
        toast.error(`Instantly delete failed — ${err.message}. Local cache not touched.`);
        return;
      }
    }
    dispatch({ type: ACTIONS.DELETE_CAMPAIGN, id: campaign.id });
    toast.success('Campaign deleted');
    navigate('/outreach');
  };

  return (
    <>
      <div className="page-head">
        <Link to="/outreach" className="btn btn-outline btn-sm">
          <Icon name="chevronLeft" size={14} /> Outreach
        </Link>
        <div style={{ marginLeft: 12 }}>
          <h1>{campaign.name}</h1>
          <div className="text-xs text-muted">
            {sender ? `Sending as ${sender.name}` : 'No sender'} · created {fmtRelative(campaign.createdAt)}
          </div>
        </div>
        <span className={`badge ${meta.color}`} style={{ marginLeft: 12 }}>{meta.label}</span>
        <div style={{ marginLeft: 'auto' }} className="flex-row">
          {canSend && campaign.status === 'draft' && (
            <button className="btn btn-primary" onClick={() => setStatus('active')}>
              <Icon name="check" size={14} /> Activate
            </button>
          )}
          {canSend && campaign.status === 'active' && (
            <button className="btn btn-outline" onClick={() => setStatus('paused', 'manually paused')}>
              Pause
            </button>
          )}
          {canSend && campaign.status === 'paused' && (
            <button className="btn btn-primary" onClick={() => setStatus('active')}>Resume</button>
          )}
          {canEdit && (
            <button className="btn btn-outline" onClick={removeCampaign}>
              <Icon name="trash" size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="metric-strip outreach-kpi-strip">
        <div className="metric-cell">
          <div className="val">{kpis.counts.enrolled}</div>
          <div className="lbl">Enrolled</div>
        </div>
        <div className="metric-cell">
          <div className="val">{kpis.counts.sent}</div>
          <div className="lbl">Sent</div>
        </div>
        <div className="metric-cell">
          <div className="val">{kpis.rates.open}%</div>
          <div className="lbl">Open rate</div>
        </div>
        <div className="metric-cell">
          <div className="val">{kpis.rates.reply}%</div>
          <div className="lbl">Reply rate</div>
        </div>
        <div className="metric-cell">
          <div className="val text-success">{kpis.classBreakdown.interested}</div>
          <div className="lbl">Interested</div>
        </div>
      </div>

      <div className="tab-container tab-container-line" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'replies' && replies.length > 0 && (
              <span className="tab-chip">{replies.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab campaign={campaign} kpis={kpis} steps={steps} />}
      {tab === 'sequence' && (
        <SequenceTab
          campaignId={campaign.id} steps={steps}
          canEdit={canEdit}
          onEdit={(s) => setEditingStep(s)}
          dispatch={dispatch}
          toast={toast}
        />
      )}
      {tab === 'audience' && (
        <AudienceTab
          campaign={campaign} enrollments={enrollments} state={state}
          dispatch={dispatch} toast={toast} canEdit={canEdit}
          onEnroll={() => setEnrollOpen(true)}
        />
      )}
      {tab === 'replies' && (
        <RepliesTab replies={replies} state={state} />
      )}

      {editingStep && (
        <StepEditorModal
          step={editingStep}
          onClose={() => setEditingStep(null)}
          onSave={(patch) => {
            dispatch({ type: ACTIONS.UPDATE_CAMPAIGN_STEP, id: editingStep.id, patch });
            toast.success('Step updated');
            setEditingStep(null);
          }}
        />
      )}
      {enrollOpen && (
        <EnrollContactsModal
          campaignId={campaign.id}
          enrolled={new Set(enrollments.map((e) => e.contactId))}
          onClose={() => setEnrollOpen(false)}
          onEnroll={(ids) => {
            dispatch({ type: ACTIONS.ENROLL_CONTACTS, campaignId: campaign.id, contactIds: ids });
            toast.success(`Enrolled ${ids.length} contact${ids.length === 1 ? '' : 's'}`);
            setEnrollOpen(false);
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab — funnel breakdown, classification distribution
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ campaign, kpis, steps }) {
  const funnelStages = [
    { key: 'enrolled', label: 'Enrolled', value: kpis.counts.enrolled, color: 'slate' },
    { key: 'sent',     label: 'Sent',     value: kpis.counts.sent,     color: 'blue' },
    { key: 'opened',   label: 'Opened',   value: kpis.counts.opened,   color: 'blue' },
    { key: 'replied',  label: 'Replied',  value: kpis.counts.replied,  color: 'green' },
  ];
  const max = Math.max(...funnelStages.map((s) => s.value), 1);

  return (
    <div className="dash-cols">
      <div className="card dash-card">
        <div className="dash-card-title">Funnel</div>
        <div className="funnel">
          {funnelStages.map((s) => {
            const pct = (s.value / max) * 100;
            return (
              <div key={s.key} className="funnel-row">
                <div className="funnel-label">{s.label}</div>
                <div className="funnel-bar-wrap">
                  <div className={`funnel-bar funnel-bar-${s.color}`} style={{ width: `${pct}%` }}>
                    <span>{s.value}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-muted" style={{ marginTop: 12 }}>
          Open rate <strong>{kpis.rates.open}%</strong> · Reply rate <strong>{kpis.rates.reply}%</strong>
          {kpis.counts.replied > 0 && <> · Interested rate <strong>{kpis.rates.interested}%</strong></>}
        </div>
      </div>

      <div className="card dash-card">
        <div className="dash-card-title">Reply classification (AI)</div>
        {kpis.counts.replied === 0 ? (
          <div className="text-sm text-muted">No replies yet.</div>
        ) : (
          <div className="class-breakdown">
            {Object.entries(kpis.classBreakdown).map(([key, count]) => {
              if (count === 0) return null;
              const m = CLASSIFICATION_META[key];
              return (
                <div key={key} className="class-row">
                  <span className={`badge ${m.color}`} style={{ minWidth: 110 }}>{m.label}</span>
                  <div className="class-row-bar" style={{ flex: 1 }}>
                    <div className={`class-row-fill class-row-fill-${m.color}`} style={{ width: `${(count / kpis.counts.replied) * 100}%` }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        )}

        <div className="dash-card-title" style={{ marginTop: 16 }}>Sequence summary</div>
        <div className="text-sm">
          <strong>{steps.length}</strong> step{steps.length === 1 ? '' : 's'} ·
          {' '}<strong>~{steps.reduce((acc, s) => acc + (s.delayDays || 0), 0)} days</strong> total cadence
        </div>
        {campaign.description && (
          <div className="text-sm text-muted" style={{ marginTop: 12 }}>
            {campaign.description}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sequence tab — list + edit each step
// ─────────────────────────────────────────────────────────────────────────────
function SequenceTab({ campaignId, steps, canEdit, onEdit, dispatch, toast }) {
  const addStep = () => {
    const order = steps.length + 1;
    dispatch({
      type: ACTIONS.ADD_CAMPAIGN_STEP,
      step: { campaignId, order, delayDays: 3, channel: 'email', subject: 'New follow-up', body: 'Hi {first_name}, …\n\n— {sender_first_name}' },
    });
    toast.success(`Step ${order} added`);
  };

  return (
    <div>
      <div className="info-banner">
        <Icon name="bell" size={20} />
        <div>
          <strong>Token interpolation:</strong>{' '}
          <code>{'{first_name}'}</code> <code>{'{last_name}'}</code> <code>{'{company}'}</code>{' '}
          <code>{'{sender_first_name}'}</code> <code>{'{sender_company}'}</code> auto-fill per recipient.
        </div>
      </div>

      <div className="sequence-list">
        {steps.map((step, i) => (
          <div key={step.id} className="sequence-step-card">
            <div className="sequence-step-head">
              <div>
                <span className="sequence-step-num">Step {i + 1}</span>
                <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
                  {i === 0 ? 'sent immediately on enrollment' : `+${step.delayDays} day${step.delayDays === 1 ? '' : 's'} after previous`}
                </span>
              </div>
              {canEdit && (
                <div className="flex-row">
                  <button className="btn btn-outline btn-sm" onClick={() => onEdit(step)}>
                    <Icon name="edit" size={12} /> Edit
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => {
                    if (window.confirm('Delete this step?')) {
                      dispatch({ type: ACTIONS.DELETE_CAMPAIGN_STEP, id: step.id });
                      toast.success('Step removed');
                    }
                  }}>
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              )}
            </div>
            <div className="sequence-step-subject"><strong>Subject:</strong> {step.subject}</div>
            <div className="sequence-step-body">{step.body}</div>
          </div>
        ))}
        {steps.length === 0 && (
          <EmptyState
            icon={<Icon name="mail" size={28} />}
            title="No steps yet"
            message="Add your first sequence step to start sending."
          />
        )}
      </div>

      {canEdit && (
        <button className="btn btn-outline" onClick={addStep} style={{ marginTop: 12 }}>
          <Icon name="plus" size={14} /> Add step
        </button>
      )}
    </div>
  );
}

function StepEditorModal({ step, onClose, onSave }) {
  const [subject, setSubject] = useState(step.subject || '');
  const [body, setBody] = useState(step.body || '');
  const [delayDays, setDelayDays] = useState(step.delayDays || 0);

  return (
    <Modal open={true} onClose={onClose} title="Edit Step" size="lg">
      <div>
        <FormField
          label="Delay (days after previous step)"
          type="number"
          value={delayDays}
          onChange={(e) => setDelayDays(Number(e.target.value))}
          min="0" max="30"
        />
        <FormField
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Quick question about {company}"
        />
        <FormField
          label="Body"
          as="textarea"
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave({ subject, body, delayDays })}>Save Step</button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audience tab — enrolled contacts table + Add Contacts button
// ─────────────────────────────────────────────────────────────────────────────
function AudienceTab({ campaign, enrollments, state, dispatch, toast, canEdit, onEnroll }) {
  const sorted = useMemo(
    () => [...enrollments].sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt)),
    [enrollments],
  );

  const removeOne = (id) => {
    if (!window.confirm('Remove this contact from the campaign? Their event history is kept.')) return;
    dispatch({ type: ACTIONS.REMOVE_ENROLLMENT, id });
    toast.success('Contact removed');
  };

  return (
    <div>
      <div className="page-head" style={{ marginBottom: 12 }}>
        <span className="text-sm text-muted">{enrollments.length} contact{enrollments.length === 1 ? '' : 's'} enrolled</span>
        {canEdit && (
          <button className="btn btn-outline" style={{ marginLeft: 'auto' }} onClick={onEnroll}>
            <Icon name="plus" size={14} /> Add Contacts
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Icon name="user" size={28} />}
          title="No one enrolled yet"
          message="Add contacts to start your campaign."
          action={canEdit ? <button className="btn btn-primary" onClick={onEnroll}><Icon name="plus" size={14} /> Add Contacts</button> : null}
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Step</th>
                  <th>Status</th>
                  <th>Last sent</th>
                  <th>Next send</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => {
                  const contact = selectContactById(state, e.contactId);
                  const meta = ENROLLMENT_STATUS_BADGE[e.status] || ENROLLMENT_STATUS_BADGE.pending;
                  return (
                    <tr key={e.id}>
                      <td className="name">
                        {contact ? (
                          <Link to={`/contacts/${contact.id}`}>{contact.firstName} {contact.lastName}</Link>
                        ) : '—'}
                      </td>
                      <td>{contact?.email || '—'}</td>
                      <td>{(e.currentStepIndex ?? 0) + 1}</td>
                      <td><span className={`badge ${meta.color}`}>{meta.label}</span></td>
                      <td>{e.lastSentAt ? fmtRelative(e.lastSentAt) : '—'}</td>
                      <td>{e.nextSendAt ? fmtRelative(e.nextSendAt) : '—'}</td>
                      {canEdit && (
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => removeOne(e.id)} title="Remove from campaign">
                            <Icon name="x" size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EnrollContactsModal({ campaignId, enrolled, onClose, onEnroll }) {
  const state = useStore();
  const allContacts = selectContacts(state).filter((c) => c.lifecycle !== 'archived');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const visible = allContacts.filter((c) => {
    if (enrolled.has(c.id)) return false; // hide already-enrolled
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.firstName || '').toLowerCase().includes(q)
      || (c.lastName  || '').toLowerCase().includes(q)
      || (c.email     || '').toLowerCase().includes(q);
  });

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <Modal open={true} onClose={onClose} title="Add contacts to campaign" size="lg">
      <div>
        <input
          className="input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div className="audience-summary">
          <span><strong>{selected.size}</strong> selected · {visible.length} not yet enrolled</span>
        </div>
        <div className="audience-list">
          {visible.map((c) => (
            <label key={c.id} className={`audience-row ${selected.has(c.id) ? 'checked' : ''}`}>
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              <div className="audience-row-body">
                <div className="audience-row-name">{c.firstName} {c.lastName}</div>
                <div className="audience-row-meta">{c.title || 'No title'} · {c.email}</div>
              </div>
            </label>
          ))}
          {visible.length === 0 && <div className="empty-state-inline">No more contacts to add.</div>}
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={selected.size === 0}
            onClick={() => onEnroll([...selected])}
          >
            Add {selected.size > 0 ? `${selected.size} ` : ''}contact{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Replies tab (campaign-scoped) — same UI as the hub but filtered to this campaign
// ─────────────────────────────────────────────────────────────────────────────
function RepliesTab({ replies, state }) {
  const sorted = useMemo(
    () => [...replies].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)),
    [replies],
  );

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="mail" size={28} />}
        title="No replies for this campaign yet"
        message="As prospects respond, replies land here with AI classification + auto-routing."
      />
    );
  }

  return (
    <div className="reply-list">
      {sorted.map((r) => {
        const contact = selectContactById(state, r.contactId);
        const meta = CLASSIFICATION_META[r.classification] || CLASSIFICATION_META.other;
        return (
          <div key={r.id} className="reply-card">
            <div className="reply-card-head">
              <div className="reply-card-from">
                <strong>{contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown'}</strong>
                <span className="text-xs text-muted"> · {contact?.email}</span>
              </div>
              <span className={`badge ${meta.color}`} title={meta.description}>
                {meta.label}
                {r.classificationConfidence > 0 && (
                  <span style={{ opacity: 0.85, marginLeft: 6, fontWeight: 500 }}>
                    · {Math.round(r.classificationConfidence * 100)}%
                  </span>
                )}
              </span>
            </div>
            <div className="reply-card-meta">
              Step {(r.stepIndex ?? 0) + 1} · {fmtRelative(r.receivedAt)}
            </div>
            <div className="reply-card-body">“{r.body}”</div>
            {r.classificationReasoning && (
              <div className="reply-card-ai">
                <Icon name="bell" size={14} />
                <div><span className="reply-card-ai-label">AI reasoning:</span> {r.classificationReasoning}</div>
              </div>
            )}
            {(r.autoActions || []).length > 0 && (
              <div className="reply-card-actions">
                <div className="reply-card-actions-head">
                  <Icon name="check" size={14} /> Auto-routing applied
                </div>
                <ul>
                  {(r.autoActions || []).map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
