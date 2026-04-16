import Toggle from '../components/Toggle';
import StatCard from '../components/StatCard';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { REMINDER_SETTINGS_DEFAULT, REMINDER_STATS } from '../data/sampleData';

const SETTINGS = [
  { key: 'bookingConfirmation', label: 'Booking Confirmation', desc: 'Send immediately after job is scheduled' },
  { key: 'reminder24h',         label: '24-Hour Reminder',     desc: 'Email + SMS one day before service' },
  { key: 'dayOfEta',             label: 'Day-Of ETA Notice',    desc: 'Send crew arrival time on service day' },
  { key: 'postService',          label: 'Post-Service Follow-Up', desc: 'Quality check email after job completion' },
];

export default function Reminders() {
  const [settings, setSettings] = useLocalStorage('pp.reminderSettings', REMINDER_SETTINGS_DEFAULT);

  const toggle = (key) => (val) => setSettings({ ...settings, [key]: val });

  return (
    <>
      <div className="page-head"><h1>Automated Reminders</h1></div>

      <div className="info-banner">
        🔔
        <div>
          <strong>Smart Reminders Active</strong><br />
          Automated confirmations, 24-hour reminders, and day-of notices.
        </div>
      </div>

      <div className="stat-grid">
        <StatCard value={REMINDER_STATS.sentThisMonth} label="Sent This Month" />
        <StatCard value={`${REMINDER_STATS.deliveryRate}%`} label="Delivery Rate" />
        <StatCard value={REMINDER_STATS.noShowsPrevented} label="No-Shows Prevented" />
      </div>

      <div className="card dash-card">
        <div className="dash-card-title">Reminder Sequence</div>
        <div className="drip-flow">
          <div className="drip-node">
            <div className="drip-icon">📅</div>
            <div>
              <div className="text-xs font-semi text-muted">Job Booked</div>
              <div className="text-sm font-semi">Confirmation Email</div>
            </div>
          </div>
          <div className="drip-connector" />
          <div className="drip-node">
            <div className="drip-icon">⏲</div>
            <div>
              <div className="text-xs font-semi text-muted">24 Hours Before</div>
              <div className="text-sm font-semi">Reminder SMS + Email</div>
            </div>
          </div>
          <div className="drip-connector" />
          <div className="drip-node">
            <div className="drip-icon">🚚</div>
            <div>
              <div className="text-xs font-semi text-muted">Day-Of</div>
              <div className="text-sm font-semi">ETA & Arrival Notice</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card dash-card">
        <div className="dash-card-title">Reminder Settings</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SETTINGS.map((s) => (
            <div
              key={s.key}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div>
                <div className="text-sm font-semi">{s.label}</div>
                <div className="text-xs text-muted">{s.desc}</div>
              </div>
              <Toggle on={!!settings[s.key]} onChange={toggle(s.key)} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
