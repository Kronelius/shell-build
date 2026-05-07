import { useMemo, useState } from 'react';
import { useDispatch, useStore } from '../../store';
import { ACTIONS } from '../../store/reducer';
import { usePermission } from '../../hooks/usePermission';
import {
  selectReminderTemplates, selectReminderEvents, selectReminderStats,
  selectClients, selectClientById,
  selectUnreadReminderCount, selectFailedReminderCount,
} from '../../store/selectors';
import { useToast } from '../../components/Toast';
import { fmtRelative } from '../../lib/dates';
import { retryDelivery } from '../../lib/reminderScheduler';
import { sendSMS } from '../../lib/twilio';
import { sendEmail } from '../../lib/email';
import FormField from '../../components/FormField';
import Toggle from '../../components/Toggle';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import Badge from '../../components/Badge';

const TOKENS = ['{client_contact}', '{company}', '{service}', '{site_name}', '{date}', '{time}'];

const STAGE_META = {
  welcome_email:        { icon: 'bell',     label: 'Welcome Email',         hint: 'Sent when a contact becomes a customer' },
  booking_confirmation: { icon: 'schedule', label: 'Booking Confirmation',  hint: 'Sent immediately after booking' },
  reminder_24h:         { icon: 'bell',     label: '24-Hour Reminder',      hint: 'Day before the job' },
  day_of_eta:           { icon: 'schedule', label: 'Day-Of ETA',            hint: 'Crew on the way' },
  post_service:         { icon: 'check',    label: 'Post-Service Follow-Up', hint: 'Recap + feedback request' },
};

const stageLabel = (key) => STAGE_META[key]?.label || key;

const TABS = [
  { key: 'inbox',     label: 'Delivery Inbox' },
  { key: 'sequence',  label: 'Sequence' },
  { key: 'templates', label: 'Templates' },
];

export default function SettingsNotifications() {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const canEdit = usePermission('reminders.edit');

  const templates = selectReminderTemplates(state);
  const events    = selectReminderEvents(state);
  const stats     = selectReminderStats(state);
  const unreadCount = selectUnreadReminderCount(state);
  const failedCount = selectFailedReminderCount(state);

  const [tab, setTab] = useState('inbox');

  return (
    <div>
      <div className="page-head-text">
        <h1 className="page-head-title">Reminders</h1>
        <p className="page-head-subtitle">
          Templates, sequence, and delivery log for automated customer reminders.{' '}
          <strong>Email reminders</strong> are sent from the system address configured at{' '}
          <em>Settings → Integrations → Email Provider</em>.{' '}
          <strong>Direct emails to clients in Messaging</strong> come from each user's own
          mailbox at <em>Settings → Connected Inboxes</em> — these are different layers.
        </p>
      </div>

      <div className="info-banner">
        <Icon name="bell" size={20} />
        <div>
          <strong>Smart Reminders Active</strong><br />
          Automated confirmations, 24-hour reminders, and day-of notices.
        </div>
      </div>

      <div className="tab-container tab-container-line" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'inbox' && (unreadCount > 0 || failedCount > 0) && (
              <span className="tab-chip" aria-label={`${unreadCount} unread, ${failedCount} failed`}>
                {unreadCount + failedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'inbox' && (
        <InboxTab
          events={events}
          templates={templates}
          state={state}
          dispatch={dispatch}
          toast={toast}
          canEdit={canEdit}
          unreadCount={unreadCount}
          failedCount={failedCount}
        />
      )}

      {tab === 'sequence' && (
        <SequenceTab
          templates={templates}
          stats={stats}
          dispatch={dispatch}
          canEdit={canEdit}
        />
      )}

      {tab === 'templates' && (
        <TemplatesTab
          templates={templates}
          state={state}
          dispatch={dispatch}
          toast={toast}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}

function SequenceTab({ templates, stats, dispatch, canEdit }) {
  const toggle = (tpl) => () => {
    dispatch({ type: ACTIONS.UPDATE_REMINDER_TEMPLATE, id: tpl.id, patch: { enabled: !tpl.enabled } });
  };

  return (
    <>
      <div className="stat-grid">
        <StatCard value={stats.sentThisMonth} label="Sent (last 30d)" />
        <StatCard value={`${stats.deliveryRate}%`} label="Delivery Rate" />
        <StatCard value={stats.noShowsPrevented} label="No-Shows Prevented" />
      </div>

      <div className="card dash-card">
        <div className="dash-card-title">Reminder Sequence</div>
        <div className="drip-flow">
          {templates.map((tpl, i) => {
            const meta = STAGE_META[tpl.key] || { icon: 'bell', label: tpl.key, hint: '' };
            return (
              <div key={tpl.id} className="drip-node-wrap">
                <div className={`drip-node ${tpl.enabled ? '' : 'off'}`}>
                  <div className="drip-icon"><Icon name={meta.icon} size={18} /></div>
                  <div>
                    <div className="text-xs font-semi text-muted">{meta.label}</div>
                    <div className="text-sm font-semi">{tpl.channel.toUpperCase()}{!tpl.enabled && ' · Off'}</div>
                  </div>
                </div>
                {i < templates.length - 1 && <div className="drip-connector" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card dash-card">
        <div className="dash-card-title">Master Toggles</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates.map((tpl) => {
            const meta = STAGE_META[tpl.key] || { label: tpl.key, hint: '' };
            return (
              <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="text-sm font-semi">{meta.label}</div>
                  <div className="text-xs text-muted">{meta.hint}</div>
                </div>
                <Toggle on={!!tpl.enabled} onChange={toggle(tpl)} disabled={!canEdit} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function renderPreview(body, sample) {
  let out = body;
  Object.entries(sample).forEach(([k, v]) => {
    out = out.replaceAll(`{${k}}`, v);
  });
  return out;
}

function TemplatesTab({ templates, state, dispatch, toast, canEdit }) {
  const clients = selectClients(state);
  const [selectedId, setSelectedId] = useState(templates[0]?.id);
  const [draft, setDraft] = useState(null);

  const selected = templates.find((t) => t.id === selectedId);
  const current = draft && draft.id === selectedId ? draft : selected;

  if (!current) return null;

  const sample = {
    client_contact: clients[0]?.primaryContact || 'Client',
    company: state.company.name,
    service: state.services[0]?.name || 'Cleaning',
    site_name: state.sites[0]?.name || 'Main Site',
    date: 'Tomorrow',
    time: '9:00 AM',
  };

  const save = () => {
    dispatch({
      type: ACTIONS.UPDATE_REMINDER_TEMPLATE,
      id: current.id,
      patch: {
        channel: current.channel,
        subject: current.subject,
        body: current.body,
        enabled: current.enabled,
      },
    });
    setDraft(null);
    toast.success('Template saved');
  };

  const testSend = () => {
    dispatch({
      type: ACTIONS.ADD_REMINDER_EVENT,
      event: {
        templateKey: current.key,
        jobId: null,
        clientId: clients[0]?.id || null,
        channel: current.channel,
        status: 'sent',
      },
    });
    toast.success('Test event added to inbox');
  };

  const insertToken = (token) => {
    setDraft({ ...current, body: (current.body || '') + ' ' + token });
  };

  return (
    <div className="template-editor">
      <aside className="template-list">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`template-list-item ${t.id === selectedId ? 'active' : ''}`}
            onClick={() => { setSelectedId(t.id); setDraft(null); }}
          >
            <div className="template-list-label">{stageLabel(t.key)}</div>
            <div className="template-list-meta">{t.channel.toUpperCase()} · {t.enabled ? 'On' : 'Off'}</div>
          </button>
        ))}
      </aside>

      <div className="template-body">
        <div className="card detail-card">
          <div className="flex-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 className="dash-card-title">{stageLabel(current.key)}</h3>
            <Toggle on={!!current.enabled} onChange={(v) => setDraft({ ...current, enabled: v })} disabled={!canEdit} />
          </div>
          <div className="form-row">
            <FormField
              label="Channel" as="select" value={current.channel} disabled={!canEdit}
              onChange={(e) => setDraft({ ...current, channel: e.target.value })}
              options={[{ value: 'email', label: 'Email' }, { value: 'sms', label: 'SMS' }]}
            />
            {current.channel === 'email' && (
              <FormField
                label="Subject" value={current.subject || ''} disabled={!canEdit}
                onChange={(e) => setDraft({ ...current, subject: e.target.value })}
              />
            )}
          </div>
          <FormField
            label="Message body" as="textarea" rows={5} value={current.body} disabled={!canEdit}
            onChange={(e) => setDraft({ ...current, body: e.target.value })}
          />
          <div className="form-group">
            <div className="text-xs text-muted" style={{ marginBottom: 6 }}>Insert variable:</div>
            <div className="token-row">
              {TOKENS.map((t) => (
                <button key={t} type="button" className="chip" onClick={() => insertToken(t)} disabled={!canEdit}>{t}</button>
              ))}
            </div>
          </div>
          <div className="template-preview">
            <div className="text-xs text-muted font-semi" style={{ marginBottom: 6 }}>Preview</div>
            {current.channel === 'email' && current.subject && (
              <div className="text-sm font-semi" style={{ marginBottom: 6 }}>{renderPreview(current.subject, sample)}</div>
            )}
            <div className="text-sm">{renderPreview(current.body || '', sample)}</div>
          </div>
          {canEdit && (
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={testSend}>Send Test</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={!draft}>Save Template</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InboxTab({ events, templates, state, dispatch, toast, canEdit, unreadCount, failedCount }) {
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [templateKey, setTemplateKey] = useState('all');
  const [range, setRange] = useState('30');

  const filtered = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    return events.filter((e) => {
      if (new Date(e.sentAt) < cutoff) return false;
      if (status === 'unread' && e.readAt) return false;
      if (status === 'failed' && e.status !== 'failed') return false;
      if (status === 'sent' && e.status !== 'sent') return false;
      if (status === 'pending' && e.status !== 'pending') return false;
      if (channel !== 'all' && e.channel !== channel) return false;
      if (templateKey !== 'all' && e.templateKey !== templateKey) return false;
      return true;
    }).sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
  }, [events, status, channel, templateKey, range]);

  const statusVariant = (s) => {
    if (s === 'sent') return 'green';
    if (s === 'pending') return 'amber';
    if (s === 'failed') return 'red';
    return 'slate';
  };

  const toggleRead = (e) => {
    if (e.readAt) {
      dispatch({ type: ACTIONS.MARK_REMINDER_EVENT_UNREAD, id: e.id });
    } else {
      dispatch({ type: ACTIONS.MARK_REMINDER_EVENT_READ, id: e.id });
    }
  };

  const retry = async (e) => {
    if (!canEdit) return;
    dispatch({
      type: ACTIONS.UPDATE_REMINDER_EVENT,
      id: e.id,
      patch: { status: 'pending', failureReason: null },
    });
    const patch = await retryDelivery({ event: e, state, sendSMS, sendEmail });
    dispatch({ type: ACTIONS.UPDATE_REMINDER_EVENT, id: e.id, patch });
    if (patch.status !== 'sent') {
      toast.error(`Resend failed: ${patch.failureReason || 'Unknown error'}`);
    }
  };

  return (
    <>
      <div className="inbox-summary">
        <Badge variant={unreadCount > 0 ? 'blue' : 'slate'}>{unreadCount} unread</Badge>
        <Badge variant={failedCount > 0 ? 'red' : 'slate'}>{failedCount} failed</Badge>
      </div>

      <div className="filter-bar">
        <FormField
          label="Status" as="select" value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'all',     label: 'All' },
            { value: 'unread',  label: 'Unread' },
            { value: 'pending', label: 'Pending' },
            { value: 'failed',  label: 'Failed' },
            { value: 'sent',    label: 'Sent' },
          ]}
        />
        <FormField
          label="Channel" as="select" value={channel}
          onChange={(e) => setChannel(e.target.value)}
          options={[
            { value: 'all',   label: 'All channels' },
            { value: 'sms',   label: 'SMS' },
            { value: 'email', label: 'Email' },
          ]}
        />
        <FormField
          label="Template" as="select" value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value)}
          options={[
            { value: 'all', label: 'All templates' },
            ...templates.map((t) => ({ value: t.key, label: stageLabel(t.key) })),
          ]}
        />
        <FormField
          label="Range" as="select" value={range}
          onChange={(e) => setRange(e.target.value)}
          options={[
            { value: '7',  label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Icon name="bell" size={24} />} title="No deliveries match these filters" />
      ) : (
        <div className="table-wrap">
          <table className="inbox-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Sent</th>
                <th>Template</th>
                <th>Account</th>
                <th>Channel</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const client = selectClientById(state, e.clientId);
                const isUnread = !e.readAt;
                return (
                  <tr key={e.id} className={`inbox-row ${isUnread ? 'is-unread' : ''}`}>
                    <td>
                      <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                      {e.failureReason && (
                        <div className="text-xs" style={{ color: 'var(--color-text-error, #b91c1c)', marginTop: 2 }}>
                          {e.failureReason}
                        </div>
                      )}
                    </td>
                    <td>{fmtRelative(e.sentAt)}</td>
                    <td>{stageLabel(e.templateKey)}</td>
                    <td>
                      {client?.name || '—'}
                      {e.recipient && (
                        <div className="text-xs text-muted">{e.recipient}</div>
                      )}
                    </td>
                    <td>{e.channel.toUpperCase()}</td>
                    <td className="text-right">
                      {e.status === 'failed' && canEdit && (
                        <button className="btn btn-outline btn-sm" onClick={() => retry(e)} title="Retry delivery">
                          Retry
                        </button>
                      )}
                      <button
                        className="btn btn-link btn-sm"
                        onClick={() => toggleRead(e)}
                        title={isUnread ? 'Mark as read' : 'Mark as unread'}
                      >
                        {isUnread ? 'Mark read' : 'Mark unread'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
