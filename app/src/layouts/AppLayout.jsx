import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NewJobModal from '../components/NewJobModal';
import { COMPANY } from '../data/sampleData';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newJobOpen, setNewJobOpen] = useState(false);
  const navigate = useNavigate();

  const handleNewJob = () => {
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
        <div className="mobile-brand">{COMPANY.name}</div>
      </div>
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNewJob={handleNewJob}
      />
      <main className="main">
        <Outlet context={{ onNewJob: handleNewJob, navigate }} />
      </main>
      <NewJobModal open={newJobOpen} onClose={() => setNewJobOpen(false)} />
    </>
  );
}
