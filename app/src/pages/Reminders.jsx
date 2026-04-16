import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Toggle from '../components/Toggle';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../components/Toast';
import { selectReminderTemplates, selectReminderEvents, selectReminderStats, selectClientById } from '../store/selectors';
import { fmtRelative } from '../lib/dates';

const STAGE_META = {
  booking_confirmation: { icon: 'schedule',  label: 'Job Booked',     hint: 'Sent immediately after booking' },
  reminder_24h:         { icon: 'bell',      label: '24 Hours Before', hint: 'SMS + email day before' },
  day_of_eta:           { icon: 'schedule',  label: 'Day-Of ETA',      hint: 'Crew on the way' },
  post_service:         { icon: 'check',     label: 'Post-Service',    hint: 'Follow-up + feedback' },
};

export default function Reminders() {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const canEdit = usePermission('reminders.edit');
  const templates = selectReminderTemplates(state);
  const events = selectReminderEvents(state);
  const stats = selectReminderStats(state);

  const history = useMemo(() => [...events].sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1)).slice(0, 50), [events]);

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

      <div className="card dash-card">
        <div className="dash-card-title">Recent Activity</div>
        {history.length === 0 ? (
          <EmptyState icon={<Icon name="bell" size={24} />} title="No reminders sent yet" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Sent</th><th>Template</th><th>Client</th><th>Channel</th><th>Status</th></tr>
              </thead>
              <tbody>
                {history.map((e) => {
                  const meta = STAGE_META[e.templateKey] || { label: e.templateKey };
                  const client = selectClientById(state, e.clientId);
                  return (
                    <tr key={e.id}>
                      <td>{fmtRelative(e.sentAt)}</td>
                      <td>{meta.label}</td>
                      <td>{client?.name || '—'}</td>
                      <td>{e.channel.toUpperCase()}</td>
                      <td><Badge variant={e.status === 'sent' ? 'green' : 'red'}>{e.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
