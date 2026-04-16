import { useEffect, useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import { useDispatch } from '../store';
import { ACTIONS } from '../store/reducer';
import { useToast } from './Toast';

const EMPTY = { name: '', address: '', accessNotes: '' };

export default function AddSiteModal({ open, onClose, clientId, mode = 'create', initialData = null }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) setForm(initialData ? { name: initialData.name || '', address: initialData.address || '', accessNotes: initialData.accessNotes || '' } : EMPTY);
  }, [open, initialData]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    if (mode === 'edit' && initialData) {
      dispatch({ type: ACTIONS.UPDATE_SITE, id: initialData.id, patch: { name: form.name.trim(), address: form.address.trim(), accessNotes: form.accessNotes.trim() } });
      toast.success('Site updated');
    } else {
      dispatch({ type: ACTIONS.ADD_SITE, site: { clientId, name: form.name.trim(), address: form.address.trim(), accessNotes: form.accessNotes.trim() } });
      toast.success('Site added');
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Edit Site' : 'Add Site'}>
      <form onSubmit={submit}>
        <FormField label="Site name" required placeholder="e.g., Main Hospital" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <FormField label="Address" required placeholder="123 Example St, City ST 00000" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <FormField label="Access notes" as="textarea" placeholder="Gate code, best entrance, security contact…" value={form.accessNotes} onChange={(e) => setForm({ ...form, accessNotes: e.target.value })} />
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{mode === 'edit' ? 'Save Changes' : 'Add Site'}</button>
        </div>
      </form>
    </Modal>
  );
}
