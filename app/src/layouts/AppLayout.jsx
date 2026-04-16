import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NewJobModal from '../components/NewJobModal';
import { useStore } from '../store';
import { selectCompany } from '../store/selectors';
import { usePermission } from '../hooks/usePermission';

export default function AppLayout() {
  const company = selectCompany(useStore());
  const canCreateJob = usePermission('schedule.edit');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newJobOpen, setNewJobOpen] = useState(false);
  const navigate = useNavigate();

  const handleNewJob = () => {
    if (!canCreateJob) return;
    setNewJobOpen(true);
    setMobileOpen(false);
  };

  return (
    <>
      <div className="mobile-header">
        <button
          className={`hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span />
        </button>
        <div className="mobile-brand">{company.name}</div>
      </div>
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNewJob={handleNewJob}
        canCreateJob={canCreateJob}
      />
      <main className="main">
        <Outlet context={{ onNewJob: handleNewJob, navigate }} />
      </main>
      <NewJobModal open={newJobOpen} onClose={() => setNewJobOpen(false)} />
    </>
  );
}
