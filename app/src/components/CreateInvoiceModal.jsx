import { useState } from 'react';
import Modal from './Modal';
import { CLIENTS, COMPANY } from '../data/sampleData';

export default function CreateInvoiceModal({ open, onClose, onSubmit, nextId }) {
  const [form, setForm] = useState({ client: '', amount: '', date: '', status: 'Pending' });
  const handle = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const dateObj = form.date ? new Date(form.date) : new Date();
    const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    onSubmit({
      id: nextId || `${COMPANY.invoicePrefix}-${Date.now()}`,
      client: form.client,
      amount: Number(form.amount),
      date: dateLabel,
      status: form.status,
    });
    setForm({ client: '', amount: '', date: '', status: 'Pending' });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Invoice">
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label">Client</label>
          <select className="input" value={form.client} onChange={handle('client')} required>
            <option value="">Select a client</option>
            {CLIENTS.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Amount ($)</label>
            <input type="number" step="0.01" min="0" className="input" value={form.amount} onChange={handle('amount')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="input" value={form.date} onChange={handle('date')} required />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="input" value={form.status} onChange={handle('status')}>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Create Invoice</button>
        </div>
      </form>
    </Modal>
  );
}
