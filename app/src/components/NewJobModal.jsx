import { useState } from 'react';
import Modal from './Modal';
import { CLIENTS, SERVICES, TEAM } from '../data/sampleData';

export default function NewJobModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    client: '', service: '', date: '', time: '', team: '', notes: '',
  });

  const handle = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(form);
    setForm({ client: '', service: '', date: '', time: '', team: '', notes: '' });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Job">
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Client</label>
          <select className="input" value={form.client} onChange={handle('client')} required>
            <option value="">Select a client</option>
            {CLIENTS.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Service</label>
          <select className="input" value={form.service} onChange={handle('service')} required>
            <option value="">Select a service</option>
            {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="input" value={form.date} onChange={handle('date')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Time</label>
            <input type="time" className="input" value={form.time} onChange={handle('time')} required />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Assigned To</label>
          <select className="input" value={form.team} onChange={handle('team')} required>
            <option value="">Select a team member</option>
            {TEAM.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="input" rows="2" value={form.notes} onChange={handle('notes')} placeholder="Optional notes..." />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Create Job</button>
        </div>
      </form>
    </Modal>
  );
}
