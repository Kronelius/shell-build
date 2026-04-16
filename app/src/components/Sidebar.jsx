import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { COMPANY } from '../data/sampleData';

// Icons are inline SVGs matching the shell.html wireframe.
const icons = {
  dashboard: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  schedule: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  clients: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  invoices: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  reminders: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  messaging: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  ),
};

const CORE_NAV = [
  { to: '/',            label: 'Dashboard',  icon: 'dashboard' },
  { to: '/schedule',    label: 'Schedule',   icon: 'schedule'  },
  { to: '/clients',     label: 'Clients',    icon: 'clients'   },
  { to: '/invoices',    label: 'Invoices',   icon: 'invoices'  },
  { to: '/reminders',   label: 'Reminders',  icon: 'reminders' },
];

const ADDON_NAV = [
  { to: '/messaging',   label: 'Messaging',  icon: 'messaging', addon: true },
];

export default function Sidebar({ mobileOpen, onCloseMobile, onNewJob }) {
  const [coreCollapsed, setCoreCollapsed] = useState(false);
  const [addonCollapsed, setAddonCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-logo">{COMPANY.logoInitials}</div>
        <div className="sidebar-brand-text">
          <h1>{COMPANY.name}</h1>
          <p>Platform</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div
          className={`sidebar-section ${coreCollapsed ? 'collapsed' : ''}`}
          onClick={() => setCoreCollapsed(!coreCollapsed)}
        >
          Core Platform <span className="tier-badge">Core</span>
          <span className="chevron">▾</span>
        </div>
        <div
          className={`nav-group ${coreCollapsed ? 'collapsed' : ''}`}
          style={{ maxHeight: coreCollapsed ? 0 : 300 }}
        >
          {CORE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
              onClick={onCloseMobile}
            >
              {icons[item.icon]}
              {item.label}
            </NavLink>
          ))}
        </div>

        <div
          className={`sidebar-section ${addonCollapsed ? 'collapsed' : ''}`}
          onClick={() => setAddonCollapsed(!addonCollapsed)}
        >
          Add-Ons <span className="tier-badge">Add-on</span>
          <span className="chevron">▾</span>
        </div>
        <div
          className={`nav-group ${addonCollapsed ? 'collapsed' : ''}`}
          style={{ maxHeight: addonCollapsed ? 0 : 100 }}
        >
          {ADDON_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
              onClick={onCloseMobile}
            >
              {icons[item.icon]}
              {item.label}
              {item.addon && <span className="nav-badge">Add-on</span>}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-footer-btn" onClick={onNewJob}>+ New Job</button>
      </div>
    </aside>
  );
}
