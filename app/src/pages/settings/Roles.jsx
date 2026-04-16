import { useDispatch, useStore } from '../../store';
import { ACTIONS } from '../../store/reducer';
import { selectPermissions } from '../../store/selectors';
import { useToast } from '../../components/Toast';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../lib/roles';

export default function SettingsRoles() {
  const permissions = selectPermissions(useStore());
  const dispatch = useDispatch();
  const toast = useToast();

  const togglePerm = (perm, role) => {
    const next = perm.roles.includes(role)
      ? perm.roles.filter((r) => r !== role)
      : [...perm.roles, role];
    dispatch({ type: ACTIONS.UPDATE_PERMISSION, id: perm.id, patch: { roles: next } });
    toast.success(`${perm.label} ${next.includes(role) ? 'granted to' : 'revoked from'} ${ROLE_LABELS[role]}`);
  };

  return (
    <div>
      <div className="page-head-text">
        <h1 className="page-head-title">Roles & Permissions</h1>
        <p className="page-head-subtitle">Control what each role can see and do. Owner-only.</p>
      </div>

      <div className="card detail-card" style={{ marginBottom: 16 }}>
        <div className="role-legend">
          {ROLES.map((r) => (
            <div key={r} className="role-legend-item">
              <strong>{ROLE_LABELS[r]}</strong>
              <span className="text-muted text-sm">{ROLE_DESCRIPTIONS[r]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="roles-table">
            <thead>
              <tr>
                <th>Permission</th>
                {ROLES.map((r) => <th key={r} style={{ textAlign: 'center', width: 100 }}>{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="text-sm font-semi">{p.label}</div>
                    <div className="text-xs text-muted">{p.id}</div>
                  </td>
                  {ROLES.map((r) => (
                    <td key={r} style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="role-checkbox"
                        checked={p.roles.includes(r)}
                        onChange={() => togglePerm(p, r)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
