import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationsBell from '../components/NotificationsBell';
import { useStore } from '../store';
import { selectCompany } from '../store/selectors';

export default function AppLayout() {
  const company = selectCompany(useStore());
  const [mobileOpen, setMobileOpen] = useState(false);

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
        <NotificationsBell />
      </div>
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <main className="main">
        <div className="bell-floater">
          <NotificationsBell />
        </div>
        <Outlet />
      </main>
    </>
  );
}
