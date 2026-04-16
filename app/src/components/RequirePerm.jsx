import { Link } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS } from '../lib/roles';

export default function RequirePerm({ perm, children, fallbackLabel }) {
  const allowed = usePermission(perm);
  const { currentUser } = useAuth();

  if (allowed) return children;

  return (
    <div className="no-access">
      <div className="no-access-card">
        <div className="no-access-icon" aria-hidden>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3v.008M4.5 19.5h15a1.5 1.5 0 001.342-2.17l-7.5-13.5a1.5 1.5 0 00-2.684 0l-7.5 13.5A1.5 1.5 0 004.5 19.5z" />
          </svg>
        </div>
        <h2>Access restricted</h2>
        <p>
          Your role (<strong>{ROLE_LABELS[currentUser?.role] || 'Unknown'}</strong>) doesn&rsquo;t include the permission required for
          {fallbackLabel ? ` ${fallbackLabel}` : ' this page'}.
        </p>
        <p className="no-access-hint">Ask your Owner to grant it under <Link to="/settings/roles">Settings → Roles</Link>.</p>
        <Link to="/" className="btn btn-outline">Back to Dashboard</Link>
      </div>
    </div>
  );
}
