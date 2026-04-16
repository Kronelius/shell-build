import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge, { statusBadgeVariant } from '../components/Badge';
import StatCard from '../components/StatCard';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import { useStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import {
  selectCompany, selectActiveUsers, selectActiveClients, selectInvoices, selectJobs,
  selectClientById, selectServiceById, selectSiteById, selectDashboardStats, selectJobsForUser,
  invoicePaid, invoiceBalance, deriveInvoiceStatus,
} from '../store/selectors';
import { fmtTime, fmtTimeRange, money, sameDay, startOfWeek } from '../lib/dates';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formattedToday() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Dashboard() {
  const state = useStore();
  const navigate = useNavigate();
  const [layout, setLayout] = useState('overview');
  const { currentUser } = useAuth();
  const canInvoices = usePermission('invoices.view');
  const canSchedule = usePermission('schedule.edit');

  const company = selectCompany(state);
  const team = selectActiveUsers(state);
  const clients = selectActiveClients(state);
  const invoices = selectInvoices(state);
  const jobs = selectJobs(state);

  const isCrew = currentUser?.role === 'crew';
  const userJobs = isCrew && currentUser ? selectJobsForUser(state, currentUser.id) : jobs;

  const today = new Date();
  const todaysJobs = useMemo(() => userJobs.filter((j) => sameDay(j.startAt, today)).sort((a, b) => a.startAt.localeCompare(b.startAt)), [userJobs]);
  const upcoming = useMemo(() => userJobs.filter((j) => new Date(j.startAt) > new Date() && j.status === 'upcoming').sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 5), [userJobs]);

  const stats = selectDashboardStats(state);

  // Week revenue bucketed by day of the week (paid amounts)
  const weekRevenue = useMemo(() => {
    const start = startOfWeek(today);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i);
      return { day: d.toLocaleDateString(undefined, { weekday: 'short' }), date: d, total: 0 };
    });
    invoices.forEach((inv) => {
      (inv.payments || []).forEach((p) => {
        const pd = new Date(p.date);
        days.forEach((d) => {
          if (sameDay(d.date, pd)) d.total += Number(p.amount) || 0;
        });
      });
    });
    const max = Math.max(1, ...days.map((d) => d.total));
    return days.map((d) => ({ ...d, height: Math.round((d.total / max) * 100) }));
  }, [invoices]);

  const overdueList = useMemo(() => invoices.filter((i) => deriveInvoiceStatus(i) === 'overdue'), [invoices]);
  const soon = useMemo(() => {
    const now = new Date();
    const twoH = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return jobs.filter((j) => new Date(j.startAt) >= now && new Date(j.startAt) <= twoH && j.status === 'upcoming');
  }, [jobs]);

  const topClients = useMemo(() => [...clients].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 4), [clients]);

  return (
    <>
      <div className="page-head"><h1>Dashboard</h1></div>

      {(stats.overdueCount > 0 || stats.unreadMessages > 0 || soon.length > 0) && (
        <div className="notif-strip">
          {soon.length > 0 && (
            <button className="notif-chip" onClick={() => navigate('/schedule')}>
              <Icon name="schedule" size={14} />
              {soon.length} job{soon.length === 1 ? '' : 's'} starting within 2 hours
            </button>
          )}
          {canInvoices && stats.overdueCount > 0 && (
            <button className="notif-chip notif-chip-danger" onClick={() => navigate('/invoices')}>
              <Icon name="invoices" size={14} />
              {stats.overdueCount} overdue invoice{stats.overdueCount === 1 ? '' : 's'} · {money(stats.overdue)}
            </button>
          )}
          {stats.unreadMessages > 0 && (
            <button className="notif-chip" onClick={() => navigate('/messaging')}>
              <Icon name="messaging" size={14} />
              {stats.unreadMessages} unread message{stats.unreadMessages === 1 ? '' : 's'}
            </button>
          )}
        </div>
      )}

      {!isCrew && (
        <div className="dash-switcher">
          <button className={`dash-sw-btn ${layout === 'overview' ? 'active' : ''}`} onClick={() => setLayout('overview')}>Overview</button>
          <button className={`dash-sw-btn ${layout === 'metrics' ? 'active' : ''}`} onClick={() => setLayout('metrics')}>Metrics</button>
        </div>
      )}

      {(isCrew || layout === 'overview') && (
        <>
          <div className="dash-hero">
            <h1>{greeting()}, {currentUser?.name?.split(' ')[0] || company.owner}</h1>
            <div className="sub">{formattedToday()}</div>
            <div className="dash-hero-stats">
              <div className="dash-hero-stat">
                <div className="val">{todaysJobs.length}</div>
                <div className="lbl">Jobs Today</div>
              </div>
              {!isCrew && (
                <>
                  <div className="dash-hero-stat">
                    <div className="val">{money(stats.collected)}</div>
                    <div className="lbl">Collected</div>
                  </div>
                  <div className="dash-hero-stat">
                    <div className="val">{stats.activeClients}</div>
                    <div className="lbl">Active Clients</div>
                  </div>
                </>
              )}
              <div className="dash-hero-stat">
                <div className="val">{upcoming.length}</div>
                <div className="lbl">Upcoming</div>
              </div>
            </div>
          </div>

          <div className="dash-cols">
            <div>
              <div className="card dash-card">
                <div className="dash-card-title">{isCrew ? 'Your Schedule Today' : "Today's Schedule"}</div>
                {todaysJobs.length === 0 ? (
                  <EmptyState message="No jobs scheduled today." />
                ) : todaysJobs.map((job) => {
                  const client = selectClientById(state, job.clientId);
                  const service = selectServiceById(state, job.serviceId);
                  const site = selectSiteById(state, job.siteId);
                  return (
                    <div key={job.id} className="sched-block clickable" onClick={() => navigate(`/schedule/${job.id}`)}>
                      <strong>{fmtTime(job.startAt)}</strong> — {client?.name || '—'}
                      <Badge variant={statusBadgeVariant(job.status === 'in_progress' ? 'In Progress' : job.status === 'done' ? 'Confirmed' : 'Pending')} style={{ marginLeft: 6 }}>
                        {job.status === 'in_progress' ? 'In Progress' : job.status === 'done' ? 'Done' : 'Upcoming'}
                      </Badge>
                      <div className="text-xs text-muted">{service?.name || '—'}{site ? ` · ${site.name}` : ''}</div>
                    </div>
                  );
                })}
              </div>
              <div className="card dash-card">
                <div className="dash-card-title">Quick Actions</div>
                <div className="quick-actions">
                  {canSchedule && (
                    <button className="qa-btn" onClick={() => navigate('/schedule')}>
                      <span className="qa-icon">+</span>Schedule
                    </button>
                  )}
                  {canInvoices && (
                    <button className="qa-btn" onClick={() => navigate('/invoices')}>
                      <span className="qa-icon">$</span>Invoices
                    </button>
                  )}
                  <button className="qa-btn" onClick={() => navigate('/clients')}>
                    <span className="qa-icon"><Icon name="clients" size={16} /></span>Clients
                  </button>
                  <button className="qa-btn" onClick={() => navigate('/messaging')}>
                    <span className="qa-icon"><Icon name="messaging" size={16} /></span>Messages
                  </button>
                </div>
              </div>
            </div>
            <div>
              {!isCrew && (
                <div className="card dash-card">
                  <div className="dash-card-title">Weekly Revenue (Paid)</div>
                  <div className="rev-chart">
                    {weekRevenue.map((d) => (
                      <div key={d.day} className="rev-bar-wrap">
                        <div className="rev-bar bar-blue" style={{ height: `${d.height}%` }} title={money(d.total)} />
                        <div className="rev-bar-lbl">{d.day}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="card dash-card">
                <div className="dash-card-title">{isCrew ? 'Your Upcoming' : 'Team'}</div>
                {isCrew ? (
                  upcoming.length === 0 ? (
                    <EmptyState message="No upcoming jobs." />
                  ) : upcoming.map((j) => {
                    const client = selectClientById(state, j.clientId);
                    return (
                      <div key={j.id} className="sched-block clickable" onClick={() => navigate(`/schedule/${j.id}`)}>
                        <strong>{new Date(j.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong> · {fmtTimeRange(j.startAt, j.endAt)}
                        <div className="text-xs text-muted">{client?.name}</div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {team.slice(0, 5).map((t) => (
                      <div key={t.id} style={{ textAlign: 'center' }}>
                        <Avatar initials={t.initials} variant={t.avatar} size="md" />
                        <div className="text-xs" style={{ marginTop: 4 }}>{t.name.split(' ')[0]}</div>
                        <div className="text-xs text-muted">{t.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {!isCrew && layout === 'metrics' && (
        <>
          <div className="metric-strip">
            <div className="metric-cell">
              <div className="val">{money(stats.collected)}</div>
              <div className="lbl">Collected (all time)</div>
            </div>
            <div className="metric-cell">
              <div className="val">{stats.activeClients}</div>
              <div className="lbl">Active Clients</div>
            </div>
            <div className="metric-cell">
              <div className="val">{stats.totalInvoices}</div>
              <div className="lbl">Invoices Issued</div>
            </div>
          </div>
          <div className="dash-cols">
            <div>
              <div className="card dash-card">
                <div className="dash-card-title">Top Clients by Revenue</div>
                {topClients.length === 0 ? (
                  <EmptyState message="No clients yet." />
                ) : (
                  <table>
                    <thead><tr><th>Client</th><th>Revenue</th><th>Jobs</th></tr></thead>
                    <tbody>
                      {topClients.map((c) => (
                        <tr key={c.id} className="clickable" onClick={() => navigate(`/clients/${c.id}`)}>
                          <td className="name">{c.name}</td>
                          <td className="money">{money(c.revenue || 0)}</td>
                          <td>{jobs.filter((j) => j.clientId === c.id).length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="card dash-card">
                <div className="dash-card-title">Overdue Invoices</div>
                {overdueList.length === 0 ? (
                  <EmptyState message="Nothing overdue. Nice." />
                ) : (
                  <table>
                    <thead><tr><th>Invoice</th><th>Client</th><th>Balance</th></tr></thead>
                    <tbody>
                      {overdueList.map((inv) => {
                        const c = selectClientById(state, inv.clientId);
                        return (
                          <tr key={inv.id} className="clickable" onClick={() => navigate(`/invoices/${inv.id}`)}>
                            <td className="name">{inv.id}</td>
                            <td>{c?.name || '—'}</td>
                            <td className="money text-danger">{money(invoiceBalance(inv))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div>
              <div className="stat-grid">
                <StatCard value={money(stats.collected)} label="Collected" trendDirection="up" />
                <StatCard value={stats.jobsToday} label="Jobs Today" />
                <StatCard value={money(stats.outstanding)} label="Outstanding" trend={`${stats.outstandingCount} invoice${stats.outstandingCount === 1 ? '' : 's'}`} trendDirection="down" />
                <StatCard value={money(stats.overdue)} label="Overdue" trend={`${stats.overdueCount} invoice${stats.overdueCount === 1 ? '' : 's'}`} trendDirection="down" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
