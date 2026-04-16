import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useStore } from '../store';
import { selectCompany } from '../store/selectors';
import { usePermissionChecker } from '../hooks/usePermission';
import Icon from './Icon';
import UserSwitcher from './UserSwitcher';

const CORE_NAV = [
  { to: '/',          label: 'Dashboard',  icon: 'dashboard', perm: 'dashboard.view', end: true },
  { to: '/schedule',  label: 'Schedule',   icon: 'schedule',  perm: 'schedule.view'  },
  { to: '/clients',   label: 'Clients',    icon: 'clients',   perm: 'clients.view'   },
  { to: '/invoices',  label: 'Invoices',   icon: 'invoices',  perm: 'invoices.view'  },
  { to: '/reminders', label: 'Reminders',  icon: 'reminders', perm: 'reminders.view' },
];

const ADDON_NAV = [
  { to: '/messaging', label: 'Messaging',  icon: 'messaging', perm: 'messaging.use', addon: true },
];

export default function Sidebar({ mobileOpen, onCloseMobile, onNewJob, canCreateJob }) {
  const company = selectCompany(useStore());
  const check = usePermissionChecker();
  const [coreCollapsed, setCoreCollapsed] = useState(false);
  const [addonCollapsed, setAddonCollapsed] = useState(false);

  const allowedCore  = CORE_NAV.filter((n) => check(n.perm));
  const allowedAddon = ADDON_NAV.filter((n) => check(n.perm));

  const renderItem = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
      onClick={onCloseMobile}
    >
      <Icon name={item.icon} />
      <span className="nav-btn-label">{item.label}</span>
      {item.addon && <span className="nav-badge">Add-on</span>}
    </NavLink>
  );

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-logo">{company.logoInitials}</div>
        <div className="sidebar-brand-text">
          <h1>{company.name}</h1>
          <p>Platform</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {allowedCore.length > 0 && (
          <>
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
              {allowedCore.map(renderItem)}
            </div>
          </>
        )}

        {allowedAddon.length > 0 && (
          <>
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
              {allowedAddon.map(renderItem)}
            </div>
          </>
        )}

        {check('settings.account') && (
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-btn nav-btn-solo ${isActive ? 'active' : ''}`}
            onClick={onCloseMobile}
          >
            <Icon name="settings" />
            <span className="nav-btn-label">Settings</span>
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <UserSwitcher />
        {canCreateJob && (
          <button className="sidebar-footer-btn" onClick={onNewJob}>
            <Icon name="plus" size={16} /> New Job
          </button>
        )}
      </div>
    </aside>
  );
}
