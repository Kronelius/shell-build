import { useEffect, useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectUserByEmail } from '../store/selectors';
import { useToast } from './Toast';
import { ROLES, ROLE_LABELS } from '../lib/roles';

const EMPTY = { name: '', email: '', phone: '', role: 'crew' };

export default function AddUserModal({ open, onClose }) {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setError('');
  }, [open]);

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name) { setError('Name is required.'); return; }
    if (!email) { setError('Email is required.'); return; }
    const dup = selectUserByEmail(state, email);
    if (dup) { setError(`Email already in use by ${dup.name}.`); return; }

    const initials = name.split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2);
    dispatch({
      type: ACTIONS.ADD_USER,
      user: { name, email, phone: form.phone.trim(), role: form.role, status: 'invited', initials },
    });
    toast.success(`Invite sent to ${email}`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite Team Member">
      <form onSubmit={submit}>
        <div className="form-row">
          <FormField
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jordan Tate"
          />
          <FormField
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@company.com"
          />
        </div>
        {error && <div className="form-error" style={{ marginTop: -8, marginBottom: 10 }}>{error}</div>}
        <div className="form-row">
          <FormField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(206) 555-0100"
          />
          <FormField
            label="Role"
            as="select"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            help="Permissions can be customized per-member after adding."
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Send Invite</button>
        </div>
      </form>
    </Modal>
  );
}
