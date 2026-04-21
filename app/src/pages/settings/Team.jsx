import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store';
import { selectUsers, selectUserPermissionOverrides } from '../../store/selectors';
import { usePermission } from '../../hooks/usePermission';
import AddUserModal from '../../components/AddUserModal';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import { ROLE_LABELS } from '../../lib/roles';

export default function SettingsTeam() {
  const state = useStore();
  const canEdit = usePermission('settings.team.edit');
  const users = selectUsers(state);
  const overrides = selectUserPermissionOverrides(state);
  const hasOverride = (userId) => overrides.some((o) => o.userId === userId && ((o.grants?.length || 0) + (o.revokes?.length || 0) > 0));

  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div>
      <div className="section-head">
        <div className="page-head-text">
          <h1 className="page-head-title">Team</h1>
          <p className="page-head-subtitle">Everyone who can log in. Click a name to edit.</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={() => setInviteOpen(true)}>
            <Icon name="plus" size={14} /> Invite Member
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<Icon name="clients" size={28} />} title="No team members yet" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Link to={`/settings/team/${u.id}`} className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                        <Avatar initials={u.initials} variant={u.avatar} size="sm" />
                        <span className="name">{u.name}</span>
                      </Link>
                    </td>
                    <td>{u.email || '—'}</td>
                    <td>{ROLE_LABELS[u.role]}</td>
                    <td>
                      <Badge variant={hasOverride(u.id) ? 'amber' : 'slate'}>
                        {hasOverride(u.id) ? 'Custom' : 'Default'}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={u.status === 'active' ? 'green' : u.status === 'invited' ? 'amber' : 'slate'}>
                        {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="text-right"><Icon name="chevronRight" size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
