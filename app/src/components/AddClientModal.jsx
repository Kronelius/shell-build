import { useState } from 'react';
import Modal from './Modal';
import { SERVICES, FREQUENCIES } from '../data/sampleData';

export default function AddClientModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '', service: '', frequency: '', contact: '', email: '', phone: '',
  });

  const handle = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      id: `c${Date.now()}`,
      name: form.name,
      service: form.service,
      frequency: form.frequency,
      lastService: '—',
      revenue: 0,
      status: 'Active',
    });
    setForm({ name: '', service: '', frequency: '', contact: '', email: '', phone: '' });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Client">
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Company Name</label>
          <input className="input" value={form.name} onChange={handle('name')} required />
        </div>
        <div className="form-group">
          <label className="form-label">Primary Contact</label>
          <input className="input" value={form.contact} onChange={handle('contact')} placeholder="Full name" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="input" value={form.email} onChange={handle('email')} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input type="tel" className="input" value={form.phone} onChange={handle('phone')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Service</label>
            <select className="input" value={form.service} onChange={handle('service')} required>
              <option value="">Select…</option>
              {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Frequency</label>
            <select className="input" value={form.frequency} onChange={handle('frequency')} required>
              <option value="">Select…</option>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Add Client</button>
        </div>
      </form>
    </Modal>
  );
}
