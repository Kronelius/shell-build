import { NavLink, Outlet } from 'react-router-dom';
import { usePermissionChecker } from '../../hooks/usePermission';
import Icon from '../../components/Icon';

const ITEMS = [
  { to: 'account',       label: 'Account',       icon: 'user',     perm: 'settings.account'    },
  { to: 'company',       label: 'Company',       icon: 'building', perm: 'settings.company'    },
  { to: 'services',      label: 'Services',      icon: 'invoices', perm: 'settings.services'   },
  { to: 'team',          label: 'Team',          icon: 'clients',  perm: 'settings.team.view'  },
  { to: 'roles',         label: 'Roles',         icon: 'lock',     perm: 'settings.roles.edit' },
  { to: 'notifications', label: 'Notifications', icon: 'bell',     perm: 'reminders.edit'      },
];

export default function SettingsLayout() {
  const check = usePermissionChecker();
  const allowed = ITEMS.filter((i) => check(i.perm));

  return (
    <div className="settings-shell">
      <aside className="settings-nav">
        <h2 className="settings-nav-title">Settings</h2>
        {allowed.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `settings-nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </aside>
      <div className="settings-content">
        <Outlet />
      </div>
    </div>
  );
}
