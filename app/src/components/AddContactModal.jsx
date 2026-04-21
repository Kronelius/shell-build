import { useEffect, useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import VisibilitySelect from './VisibilitySelect';
import TagPicker from './TagPicker';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectClients, selectContactByEmail, selectUsers } from '../store/selectors';
import { useToast } from './Toast';

const LIFECYCLES = [
  { value: 'lead',     label: 'Lead' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'customer', label: 'Customer' },
  { value: 'vendor',   label: 'Vendor' },
];

const EMPTY = {
  email: '', firstName: '', lastName: '', title: '', phone: '',
  companyId: '', ownerUserId: '', tagIds: [],
  visibility: 'org', lifecycle: 'lead',
  notes: '',
};

export default function AddContactModal({ open, onClose, mode = 'create', initialData = null, lockCompanyId = null }) {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const clients = selectClients(state);
  const users = selectUsers(state);

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (mode === 'edit' && initialData) {
      setForm({
        email: initialData.email || '',
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        title: initialData.title || '',
        phone: initialData.phone || '',
        companyId: initialData.companyId || '',
        ownerUserId: initialData.ownerUserId || '',
        tagIds: initialData.tagIds || [],
        visibility: initialData.visibility || 'org',
        lifecycle: initialData.lifecycle || 'lead',
        notes: initialData.notes || '',
      });
    } else {
      setForm({ ...EMPTY, companyId: lockCompanyId || '' });
    }
  }, [open, initialData, mode, lockCompanyId]);

  const submit = (e) => {
    e.preventDefault();
    setError('');
    const email = form.email.trim().toLowerCase();
    if (!email) { setError('Email is required.'); return; }
    if (!form.firstName.trim() && !form.lastName.trim()) { setError('Enter at least a first or last name.'); return; }
    const dup = selectContactByEmail(state, email);
    if (dup && (!initialData || dup.id !== initialData.id)) {
      setError(`Email already in use by ${dup.firstName} ${dup.lastName}.`);
      return;
    }

    const payload = {
      email,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      title: form.title.trim(),
      phone: form.phone.trim(),
      companyId: form.companyId || null,
      ownerUserId: form.ownerUserId || null,
      tagIds: form.tagIds,
      visibility: form.visibility,
      lifecycle: form.lifecycle,
      notes: form.notes,
    };

    if (mode === 'edit' && initialData) {
      dispatch({ type: ACTIONS.UPDATE_CONTACT, id: initialData.id, patch: payload });
      toast.success('Contact updated');
    } else {
      dispatch({ type: ACTIONS.ADD_CONTACT, contact: payload });
      toast.success('Contact added');
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Edit Contact' : 'Add Contact'}>
      <form onSubmit={submit}>
        <FormField label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" help="Email is the contact's unique identifier." />
        {error && <div className="form-error" style={{ marginTop: -8, marginBottom: 10 }}>{error}</div>}
        <div className="form-row">
          <FormField label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <FormField label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <div className="form-row">
          <FormField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Office Manager, Facilities Director…" />
          <FormField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="form-row">
          <FormField
            label="Company"
            as="select"
            value={form.companyId}
            onChange={(e) => setForm({ ...form, companyId: e.target.value })}
            disabled={Boolean(lockCompanyId)}
            options={[{ value: '', label: '— None (lead / prospect / vendor) —' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <FormField
            label="Lifecycle"
            as="select"
            value={form.lifecycle}
            onChange={(e) => setForm({ ...form, lifecycle: e.target.value })}
            options={LIFECYCLES}
          />
        </div>
        <div className="form-row">
          <FormField
            label="Owner"
            as="select"
            value={form.ownerUserId}
            onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })}
            options={[{ value: '', label: '— Unassigned —' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
          />
          <div className="form-group">
            <label className="form-label">Visibility</label>
            <VisibilitySelect value={form.visibility} onChange={(v) => setForm({ ...form, visibility: v })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Tags</label>
          <TagPicker value={form.tagIds} onChange={(ids) => setForm({ ...form, tagIds: ids })} />
        </div>
        <FormField label="Notes" as="textarea" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything worth remembering…" />
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{mode === 'edit' ? 'Save Changes' : 'Add Contact'}</button>
        </div>
      </form>
    </Modal>
  );
}
