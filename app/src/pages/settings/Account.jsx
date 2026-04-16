import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDispatch } from '../../store';
import { ACTIONS } from '../../store/reducer';
import { useToast } from '../../components/Toast';
import FormField from '../../components/FormField';
import Avatar from '../../components/Avatar';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../lib/roles';

export default function SettingsAccount() {
  const { currentUser } = useAuth();
  const dispatch = useDispatch();
  const toast = useToast();
  const [form, setForm] = useState(currentUser);

  useEffect(() => { setForm(currentUser); }, [currentUser]);

  if (!currentUser) return null;

  const save = (e) => {
    e.preventDefault();
    dispatch({
      type: ACTIONS.UPDATE_USER,
      id: currentUser.id,
      patch: { name: form.name, email: form.email, phone: form.phone, initials: form.initials },
    });
    toast.success('Profile saved');
  };

  return (
    <div>
      <div className="page-head-text">
        <h1 className="page-head-title">Your Account</h1>
        <p className="page-head-subtitle">This is your profile. Other settings may only be available to your Owner or Admin.</p>
      </div>

      <form className="card detail-card" onSubmit={save}>
        <div className="flex-row" style={{ gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <Avatar initials={currentUser.initials} variant={currentUser.avatar} size="lg" />
          <div>
            <div className="text-sm font-semi">{ROLE_LABELS[currentUser.role]}</div>
            <div className="text-xs text-muted">{ROLE_DESCRIPTIONS[currentUser.role]}</div>
          </div>
        </div>
        <div className="form-row">
          <FormField label="Full name" required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FormField label="Initials" value={form.initials || ''} onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase().slice(0, 3) })} help="2–3 characters used in the avatar" />
        </div>
        <div className="form-row">
          <FormField label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <FormField label="Phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="modal-actions">
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
}
