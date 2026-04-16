import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge, { statusBadgeVariant } from '../components/Badge';
import StatCard from '../components/StatCard';
import Avatar from '../components/Avatar';
import { COMPANY, TODAY_SCHEDULE, TEAM, WEEK_REVENUE, INVOICES, CLIENTS } from '../data/sampleData';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formattedToday() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function stateBadge(state) {
  if (state === 'done')   return { label: 'Done',       variant: 'slate' };
  if (state === 'active') return { label: 'In Progress', variant: 'blue' };
  return { label: 'Confirmed', variant: 'green' };
}

export default function Dashboard() {
  const [layout, setLayout] = useState('overview');
  const navigate = useNavigate();

  const jobsToday = TODAY_SCHEDULE.length;
  const weekRevenue = INVOICES.reduce((sum, i) => i.status === 'Paid' ? sum + i.amount : sum, 0);
  const onTime = 94;
  const avgRating = 4.8;
  const activeClients = CLIENTS.filter(c => c.status === 'Active').length;
  const monthlyRevenue = INVOICES.reduce((s, i) => s + i.amount, 0);
  const outstanding = INVOICES.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.amount, 0);
  const outstandingCount = INVOICES.filter(i => i.status !== 'Paid').length;
  const jobsThisWeek = TODAY_SCHEDULE.length * 5;

  return (
    <>
      <div className="page-head"><h1>Dashboard</h1></div>
      <div className="dash-switcher">
        <button
          className={`dash-sw-btn ${layout === 'overview' ? 'active' : ''}`}
          onClick={() => setLayout('overview')}
        >Overview</button>
        <button
          className={`dash-sw-btn ${layout === 'metrics' ? 'active' : ''}`}
          onClick={() => setLayout('metrics')}
        >Metrics</button>
      </div>

      {layout === 'overview' && (
        <>
          <div className="dash-hero">
            <h1>{greeting()}, {COMPANY.owner}</h1>
            <div className="sub">{formattedToday()}</div>
            <div className="dash-hero-stats">
              <div className="dash-hero-stat">
                <div className="val">{jobsToday}</div>
                <div className="lbl">Jobs Today</div>
              </div>
              <div className="dash-hero-stat">
                <div className="val">${weekRevenue.toLocaleString()}</div>
                <div className="lbl">This Week</div>
              </div>
              <div className="dash-hero-stat">
                <div className="val">{onTime}%</div>
                <div className="lbl">On-Time</div>
              </div>
              <div className="dash-hero-stat">
                <div className="val">{avgRating}</div>
                <div className="lbl">Avg Rating</div>
              </div>
            </div>
          </div>

          <div className="dash-cols">
            <div>
              <div className="card dash-card">
                <div className="dash-card-title">Today's Schedule</div>
                {TODAY_SCHEDULE.slice(0, 3).map((job) => {
                  const b = stateBadge(job.state);
                  return (
                    <div key={job.id} className="sched-block">
                      <strong>{job.time.split(' – ')[0]}</strong> — {job.client}
                      <Badge variant={b.variant} style={{ marginLeft: 6 }}>{b.label}</Badge>
                    </div>
                  );
                })}
              </div>
              <div className="card dash-card">
                <div className="dash-card-title">Quick Actions</div>
                <div className="quick-actions">
                  <button className="qa-btn" onClick={() => navigate('/schedule')}>
                    <span className="qa-icon">+</span>New Job
                  </button>
                  <button className="qa-btn" onClick={() => navigate('/invoices')}>
                    <span className="qa-icon">$</span>Invoice
                  </button>
                  <button className="qa-btn" onClick={() => navigate('/clients')}>
                    <span className="qa-icon">👤</span>Add Client
                  </button>
                  <button className="qa-btn" onClick={() => setLayout('metrics')}>
                    <span className="qa-icon">📊</span>Reports
                  </button>
                </div>
              </div>
            </div>
            <div>
              <div className="card dash-card">
                <div className="dash-card-title">Weekly Revenue</div>
                <div className="rev-chart">
                  {WEEK_REVENUE.map((d) => (
                    <div key={d.day} className="rev-bar-wrap">
                      <div className={`rev-bar bar-${d.style}`} style={{ height: `${d.height}%` }} />
                      <div className="rev-bar-lbl">{d.day}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card dash-card">
                <div className="dash-card-title">Team Status</div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {TEAM.slice(0, 5).map((t) => (
                    <div key={t.id} style={{ textAlign: 'center' }}>
                      <Avatar initials={t.initials} variant={t.avatar} size="md" />
                      <div className="text-xs" style={{ marginTop: 4 }}>{t.name}</div>
                      <div className="text-xs text-muted">{t.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {layout === 'metrics' && (
        <>
          <div className="metric-strip">
            <div className="metric-cell">
              <div className="val">${monthlyRevenue.toLocaleString()}</div>
              <div className="lbl">Monthly Revenue</div>
              <div className="trend text-success">+12%</div>
            </div>
            <div className="metric-cell">
              <div className="val">{activeClients}</div>
              <div className="lbl">Active Clients</div>
              <div className="trend text-success">+2</div>
            </div>
            <div className="metric-cell">
              <div className="val">92%</div>
              <div className="lbl">Client Retention</div>
              <div className="trend text-success">+3%</div>
            </div>
          </div>
          <div className="dash-cols">
            <div>
              <div className="card dash-card">
                <div className="dash-card-title">Revenue Trend</div>
                <div className="chart-placeholder">Revenue chart area</div>
              </div>
              <div className="card dash-card">
                <div className="dash-card-title">Top Clients by Revenue</div>
                <table>
                  <thead>
                    <tr><th>Client</th><th>Revenue</th><th>Jobs</th></tr>
                  </thead>
                  <tbody>
                    {[...CLIENTS].sort((a, b) => b.revenue - a.revenue).slice(0, 4).map((c) => (
                      <tr key={c.id}>
                        <td className="name">{c.name}</td>
                        <td className="money">${c.revenue.toLocaleString()}</td>
                        <td>{Math.max(1, Math.round(c.revenue / 500))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <div className="stat-grid">
                <StatCard value={`$${weekRevenue.toLocaleString()}`} label="This Week" trend="+8%" trendDirection="up" />
                <StatCard value={jobsThisWeek} label="Jobs This Week" trend="+4" trendDirection="up" />
                <StatCard value={`$${outstanding.toLocaleString()}`} label="Outstanding" trend={`${outstandingCount} invoices`} trendDirection="down" />
                <StatCard value={avgRating} label="Avg Rating" trend="+0.2" trendDirection="up" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
