import { useState } from 'react';
import TabContainer from '../components/TabContainer';
import NewJobModal from '../components/NewJobModal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TODAY_SCHEDULE } from '../data/sampleData';

export default function Schedule() {
  const [view, setView] = useState('Day');
  const [modalOpen, setModalOpen] = useState(false);
  const [customJobs, setCustomJobs] = useLocalStorage('pp.customJobs', []);

  const handleNewJob = (form) => {
    const time = form.time
      ? new Date(`1970-01-01T${form.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : 'TBD';
    setCustomJobs([
      ...customJobs,
      {
        id: `j${Date.now()}`,
        time: `${time} – TBD`,
        client: form.client,
        service: form.service,
        team: form.team,
        address: form.notes || '—',
        state: 'upcoming',
      },
    ]);
  };

  const allJobs = [...TODAY_SCHEDULE, ...customJobs];

  return (
    <>
      <div className="page-head">
        <h1>Schedule</h1>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModalOpen(true)}>
          + New Job
        </button>
      </div>
      <TabContainer
        tabs={['Day', 'Week', 'Month']}
        active={view}
        onChange={setView}
        className="mb-20"
      />

      {view === 'Day' && (
        <div className="card dash-card">
          <div className="tl-track">
            <div className="tl-line" />
            {allJobs.map((job) => (
              <div key={job.id} className={`tl-item ${job.state}`}>
                <div className="tl-dot" />
                <div className="tl-time">{job.time}</div>
                <div className="tl-card">
                  <strong>{job.client}</strong> — {job.service}<br />
                  <span className="text-xs text-muted">{job.team} • {job.address}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'Week' && (
        <div className="card dash-card">
          <div className="dash-card-title">This Week</div>
          <div className="chart-placeholder" style={{ height: 300 }}>
            Weekly calendar view ({allJobs.length} jobs scheduled)
          </div>
        </div>
      )}

      {view === 'Month' && (
        <div className="card dash-card">
          <div className="dash-card-title">This Month</div>
          <div className="chart-placeholder" style={{ height: 400 }}>
            Monthly calendar view
          </div>
        </div>
      )}

      <NewJobModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleNewJob} />
    </>
  );
}
