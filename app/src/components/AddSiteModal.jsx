import { useEffect, useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import ContactPicker from './ContactPicker';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectClientById } from '../store/selectors';
import { useToast } from './Toast';

const EMPTY = { name: '', address: '', accessNotes: '', siteContactId: null };

export default function AddSiteModal({ open, onClose, clientId, mode = 'create', initialData = null }) {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm({
        name: initialData.name || '',
        address: initialData.address || '',
        accessNotes: initialData.accessNotes || '',
        siteContactId: initialData.siteContactId || null,
      });
    } else {
      // On a fresh site, pre-fill with the account's primary contact as a sensible default.
      const client = clientId ? selectClientById(state, clientId) : null;
      setForm({ ...EMPTY, siteContactId: client?.primaryContactId || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData, clientId]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.address.trim()) return;
    const patch = {
      name: form.name.trim(),
      address: form.address.trim(),
      accessNotes: form.accessNotes.trim(),
      siteContactId: form.siteContactId || null,
    };
    if (mode === 'edit' && initialData) {
      dispatch({ type: ACTIONS.UPDATE_SITE, id: initialData.id, patch });
      toast.success('Site updated');
    } else {
      dispatch({ type: ACTIONS.ADD_SITE, site: { clientId, ...patch } });
      toast.success('Site added');
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === 'edit' ? 'Edit Site' : 'Add Site'}>
      <form onSubmit={submit}>
        <FormField label="Site name" required placeholder="e.g., Main Hospital" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <FormField label="Address" required placeholder="123 Example St, City ST 00000" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="form-group">
          <label className="form-label">Site contact</label>
          <ContactPicker
            value={form.siteContactId}
            onChange={(id) => setForm({ ...form, siteContactId: id })}
            companyId={clientId || null}
            placeholder="Select a site contact…"
          />
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            Optional — who to call when crew arrives. Defaults to the account's primary contact.
          </div>
        </div>
        <FormField label="Access notes" as="textarea" placeholder="Gate code, best entrance, security contact…" value={form.accessNotes} onChange={(e) => setForm({ ...form, accessNotes: e.target.value })} />
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{mode === 'edit' ? 'Save Changes' : 'Add Site'}</button>
        </div>
      </form>
    </Modal>
  );
}
