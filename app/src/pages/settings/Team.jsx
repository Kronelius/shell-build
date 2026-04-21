import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useStore } from '../../store';
import { ACTIONS } from '../../store/reducer';
import { selectUsers, selectUserPermissionOverrides } from '../../store/selectors';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../components/Toast';
import FormField from '../../components/FormField';
import Badge from '../../components/Badge';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import { ROLES, ROLE_LABELS } from '../../lib/roles';

export default function SettingsTeam() {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const canEdit = usePermission('settings.team.edit');
  const users = selectUsers(state);
  const overrides = selectUserPermissionOverrides(state);
  const hasOverride = (userId) => overrides.some((o) => o.userId === userId && ((o.grants?.length || 0) + (o.revokes?.length || 0) > 0));

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: '', email: '', role: 'crew' });

  const sendInvite = (e) => {
    e.preventDefault();
    if (!invite.name.trim() || !invite.email.trim()) return;
    const initials = invite.name.split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2);
    dispatch({
      type: ACTIONS.ADD_USER,
      user: { name: invite.name.trim(), email: invite.email.trim(), role: invite.role, status: 'invited', initials },
    });
    setInvite({ name: '', email: '', role: 'crew' });
    setInviteOpen(false);
    toast.success('Invite sent (simulated)');
  };

  return (
    <div>
      <div className="section-head">
        <div className="page-head-text">
          <h1 className="page-head-title">Team</h1>
          <p className="page-head-subtitle">Everyone who can log in. Click a name to edit.</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary btn-sm" onClick={() => setInviteOpen((v) => !v)}>
            <Icon name="plus" size={14} /> Invite Member
          </button>
        )}
      </div>

      {inviteOpen && (
        <form className="card detail-card" onSubmit={sendInvite} style={{ marginBottom: 16 }}>
          <h3 className="dash-card-title">Invite a new team member</h3>
          <div className="form-row">
            <FormField label="Name" required value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
            <FormField label="Email" type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            <FormField label="Role" as="select" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}
              options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setInviteOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Send Invite</button>
          </div>
        </form>
      )}

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
    </div>
  );
}
