import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Toggle from '../components/Toggle';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import FormField from '../components/FormField';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../components/Toast';
import {
  selectReminderTemplates, selectReminderEvents, selectReminderStats,
  selectClientById, selectUnreadReminderCount, selectFailedReminderCount,
} from '../store/selectors';
import { fmtRelative } from '../lib/dates';

const STAGE_META = {
  booking_confirmation: { icon: 'schedule',  label: 'Job Booked',     hint: 'Sent immediately after booking' },
  reminder_24h:         { icon: 'bell',      label: '24 Hours Before', hint: 'SMS + email day before' },
  day_of_eta:           { icon: 'schedule',  label: 'Day-Of ETA',      hint: 'Crew on the way' },
  post_service:         { icon: 'check',     label: 'Post-Service',    hint: 'Follow-up + feedback' },
};

const TABS = [
  { key: 'sequence', label: 'Sequence & Templates' },
  { key: 'inbox',    label: 'Delivery Inbox' },
];

export default function Reminders() {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const canEdit = usePermission('reminders.edit');
  const templates = selectReminderTemplates(state);
  const events = selectReminderEvents(state);
  const stats = selectReminderStats(state);
  const unreadCount = selectUnreadReminderCount(state);
  const failedCount = selectFailedReminderCount(state);

  const [tab, setTab] = useState('sequence');

  const toggle = (tpl) => () => {
    dispatch({ type: ACTIONS.UPDATE_REMINDER_TEMPLATE, id: tpl.id, patch: { enabled: !tpl.enabled } });
    toast.success(`${STAGE_META[tpl.key]?.label || tpl.key} ${!tpl.enabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <>
      <div className="page-head">
        <h1>Automated Reminders</h1>
        {canEdit && (
          <Link to="/settings/notifications" className="btn btn-outline" style={{ marginLeft: 'auto' }}>
            <Icon name="edit" size={14} /> Edit Templates
          </Link>
        )}
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

      {tab === 'sequence' && (
        <SequenceTab
          templates={templates}
          stats={stats}
          toggle={toggle}
          canEdit={canEdit}
        />
      )}

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
    </>
  );
}

function SequenceTab({ templates, stats, toggle, canEdit }) {
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
        <div className="dash-card-title">Reminder Settings</div>
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
      if (channel !== 'all' && e.channel !== channel) return false;
      if (templateKey !== 'all' && e.templateKey !== templateKey) return false;
      return true;
    }).sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
  }, [events, status, channel, templateKey, range]);

  const toggleRead = (e) => {
    if (e.readAt) {
      dispatch({ type: ACTIONS.MARK_REMINDER_EVENT_UNREAD, id: e.id });
    } else {
      dispatch({ type: ACTIONS.MARK_REMINDER_EVENT_READ, id: e.id });
    }
  };

  const retry = (e) => {
    if (!canEdit) return;
    dispatch({ type: ACTIONS.RETRY_REMINDER_EVENT, id: e.id });
    toast.success(`Resent ${STAGE_META[e.templateKey]?.label || e.templateKey}`);
  };

  return (
    <>
      <div className="inbox-summary">
        <Badge variant={unreadCount > 0 ? 'blue' : 'slate'}>{unreadCount} unread</Badge>
        <Badge variant={failedCount > 0 ? 'red' : 'slate'}>{failedCount} failed</Badge>
      </div>

      <div className="filter-bar">
        <FormField
          label="Status"
          as="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: 'all',    label: 'All' },
            { value: 'unread', label: 'Unread' },
            { value: 'failed', label: 'Failed' },
            { value: 'sent',   label: 'Sent' },
          ]}
        />
        <FormField
          label="Channel"
          as="select"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          options={[
            { value: 'all',   label: 'All channels' },
            { value: 'sms',   label: 'SMS' },
            { value: 'email', label: 'Email' },
          ]}
        />
        <FormField
          label="Template"
          as="select"
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value)}
          options={[
            { value: 'all', label: 'All templates' },
            ...templates.map((t) => ({ value: t.key, label: STAGE_META[t.key]?.label || t.key })),
          ]}
        />
        <FormField
          label="Range"
          as="select"
          value={range}
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
        <div className="card">
          <div className="table-wrap">
            <table className="inbox-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Sent</th>
                  <th>Template</th>
                  <th>Client</th>
                  <th>Channel</th>
                  <th className="text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const meta = STAGE_META[e.templateKey] || { label: e.templateKey };
                  const client = selectClientById(state, e.clientId);
                  const isUnread = !e.readAt;
                  return (
                    <tr key={e.id} className={`inbox-row ${isUnread ? 'is-unread' : ''}`}>
                      <td>
                        <Badge variant={e.status === 'sent' ? 'green' : 'red'}>{e.status}</Badge>
                      </td>
                      <td>{fmtRelative(e.sentAt)}</td>
                      <td>{meta.label}</td>
                      <td>{client?.name || '—'}</td>
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
        </div>
      )}
    </>
  );
}
