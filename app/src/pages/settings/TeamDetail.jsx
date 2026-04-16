import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useStore } from '../../store';
import { ACTIONS } from '../../store/reducer';
import { selectUserById, selectJobsForUser } from '../../store/selectors';
import { usePermission } from '../../hooks/usePermission';
import { useToast } from '../../components/Toast';
import DetailHeader from '../../components/DetailHeader';
import FormField from '../../components/FormField';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import ConfirmDialog from '../../components/ConfirmDialog';
import { ROLES, ROLE_LABELS } from '../../lib/roles';

export default function SettingsTeamDetail() {
  const { userId } = useParams();
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const canEdit = usePermission('settings.team.edit');

  const user = selectUserById(state, userId);
  const jobs = useMemo(() => user ? selectJobsForUser(state, user.id) : [], [state, user]);
  const [form, setForm] = useState(user);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!user) {
    return (
      <div style={{ padding: 32 }}>
        <DetailHeader backTo="/settings/team" title="Team member not found" />
      </div>
    );
  }
  const current = form && form.id === user.id ? form : user;

  const save = () => {
    dispatch({
      type: ACTIONS.UPDATE_USER,
      id: user.id,
      patch: {
        name: current.name,
        email: current.email,
        phone: current.phone,
        role: current.role,
        status: current.status,
        initials: (current.initials || '').toUpperCase().slice(0, 3),
      },
    });
    toast.success('Member saved');
  };

  const del = () => {
    dispatch({ type: ACTIONS.DELETE_USER, id: user.id });
    toast.success('Member removed');
    navigate('/settings/team');
  };

  return (
    <div>
      <DetailHeader
        backTo="/settings/team"
        backLabel="Team"
        title={user.name}
        subtitle={user.email || ''}
        badge={<Badge variant={user.status === 'active' ? 'green' : user.status === 'invited' ? 'orange' : 'slate'}>
          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </Badge>}
      />

      <div className="card detail-card">
        <div className="flex-row" style={{ gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <Avatar initials={user.initials} variant={user.avatar} size="lg" />
          <div>
            <div className="text-sm font-semi">{ROLE_LABELS[user.role]}</div>
            <div className="text-xs text-muted">{jobs.length} job{jobs.length === 1 ? '' : 's'} assigned</div>
          </div>
        </div>
        <div className="form-row">
          <FormField label="Name" required value={current.name || ''} onChange={(e) => setForm({ ...current, name: e.target.value })} disabled={!canEdit} />
          <FormField label="Initials" value={current.initials || ''} onChange={(e) => setForm({ ...current, initials: e.target.value })} disabled={!canEdit} />
        </div>
        <div className="form-row">
          <FormField label="Email" type="email" value={current.email || ''} onChange={(e) => setForm({ ...current, email: e.target.value })} disabled={!canEdit} />
          <FormField label="Phone" value={current.phone || ''} onChange={(e) => setForm({ ...current, phone: e.target.value })} disabled={!canEdit} />
        </div>
        <div className="form-row">
          <FormField label="Role" as="select" value={current.role} onChange={(e) => setForm({ ...current, role: e.target.value })} disabled={!canEdit}
            options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
          <FormField label="Status" as="select" value={current.status} onChange={(e) => setForm({ ...current, status: e.target.value })} disabled={!canEdit}
            options={[{ value: 'active', label: 'Active' }, { value: 'invited', label: 'Invited' }, { value: 'disabled', label: 'Disabled' }]} />
        </div>
        {canEdit && (
          <div className="modal-actions">
            <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Remove</button>
            <button type="button" className="btn btn-primary" onClick={save}>Save</button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Remove ${user.name}?`}
        message="They will lose access and be removed from any assigned jobs."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={del}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
