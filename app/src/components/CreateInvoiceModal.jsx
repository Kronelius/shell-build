import { useEffect, useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import ContactPicker from './ContactPicker';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectActiveClients, selectClientById, selectSitesForClient } from '../store/selectors';
import { useToast } from './Toast';
import { newId } from '../lib/ids';
import { todayIso, composeIso } from '../lib/dates';

const newLine = () => ({ id: newId('li'), description: '', qty: 1, unitPrice: 0 });

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CreateInvoiceModal({ open, onClose, presetClientId = null, presetSiteId = null, presetJobId = null }) {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const clients = selectActiveClients(state);

  const presetClient = presetClientId ? selectClientById(state, presetClientId) : null;

  const [form, setForm] = useState({
    clientId: presetClientId || '',
    siteId: presetSiteId || '',
    billingContactId: presetClient?.primaryContactId || null,
    issueDate: todayIso(),
    dueDate: addDays(todayIso(), 30),
    taxRate: state.company.taxRate || 0,
    lineItems: [newLine()],
  });

  useEffect(() => {
    if (!open) return;
    const seededClient = presetClientId ? selectClientById(state, presetClientId) : null;
    setForm({
      clientId: presetClientId || '',
      siteId: presetSiteId || '',
      billingContactId: seededClient?.primaryContactId || null,
      issueDate: todayIso(),
      dueDate: addDays(todayIso(), 30),
      taxRate: state.company.taxRate || 0,
      lineItems: [newLine()],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetClientId, presetSiteId]);

  const clientSites = form.clientId ? selectSitesForClient(state, form.clientId) : [];

  const onClientChange = (clientId) => {
    const picked = clientId ? selectClientById(state, clientId) : null;
    setForm({
      ...form,
      clientId,
      siteId: '',
      // Auto-fill billing contact from the client's primary contact (user can change).
      billingContactId: picked?.primaryContactId || null,
    });
  };

  const updateLine = (id, patch) => setForm({
    ...form,
    lineItems: form.lineItems.map((li) => (li.id === id ? { ...li, ...patch } : li)),
  });
  const addLine = () => setForm({ ...form, lineItems: [...form.lineItems, newLine()] });
  const removeLine = (id) => setForm({ ...form, lineItems: form.lineItems.filter((li) => li.id !== id) });

  const subtotal = form.lineItems.reduce((a, li) => a + (Number(li.qty) || 0) * (Number(li.unitPrice) || 0), 0);
  const taxAmount = subtotal * ((Number(form.taxRate) || 0) / 100);
  const total = subtotal + taxAmount;

  const submit = (e) => {
    e.preventDefault();
    if (!form.clientId) return;
    const cleanItems = form.lineItems
      .filter((li) => li.description.trim())
      .map((li) => ({ ...li, qty: Number(li.qty) || 0, unitPrice: Number(li.unitPrice) || 0 }));
    if (cleanItems.length === 0) return;
    dispatch({
      type: ACTIONS.ADD_INVOICE,
      invoice: {
        clientId: form.clientId,
        siteId: form.siteId || null,
        billingContactId: form.billingContactId || null,
        jobIds: presetJobId ? [presetJobId] : [],
        issueDate: composeIso(form.issueDate, '12:00'),
        dueDate: composeIso(form.dueDate, '12:00'),
        lineItems: cleanItems,
        taxRate: Number(form.taxRate) || 0,
        status: 'pending',
        payments: [],
      },
    });
    toast.success('Invoice created');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Invoice">
      <form onSubmit={submit}>
        <div className="form-row">
          <FormField
            label="Client" as="select" required value={form.clientId}
            onChange={(e) => onClientChange(e.target.value)}
            options={[{ value: '', label: 'Select a client' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />
          {clientSites.length > 0 && (
            <FormField
              label="Site" as="select" value={form.siteId}
              onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              options={[{ value: '', label: '— No specific site —' }, ...clientSites.map((s) => ({ value: s.id, label: s.name }))]}
            />
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Billing contact</label>
          <ContactPicker
            value={form.billingContactId}
            onChange={(id) => setForm({ ...form, billingContactId: id })}
            companyId={form.clientId || null}
            placeholder="Select a billing contact…"
          />
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>
            Optional — who receives the invoice. Defaults to the account's primary contact.
          </div>
        </div>
        <div className="form-row">
          <FormField label="Issue date" type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
          <FormField label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <FormField label="Tax rate (%)" type="number" step="0.01" min="0" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
        </div>

        <div className="form-group">
          <label className="form-label">Line items</label>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ width: 70 }}>Qty</th>
                  <th style={{ width: 110 }}>Unit Price</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.lineItems.map((li) => (
                  <tr key={li.id}>
                    <td><input className="input" placeholder="e.g., Weekly janitorial" value={li.description} onChange={(e) => updateLine(li.id, { description: e.target.value })} /></td>
                    <td><input type="number" min="0" step="0.5" className="input" value={li.qty} onChange={(e) => updateLine(li.id, { qty: e.target.value })} /></td>
                    <td><input type="number" min="0" step="0.01" className="input" value={li.unitPrice} onChange={(e) => updateLine(li.id, { unitPrice: e.target.value })} /></td>
                    <td>
                      {form.lineItems.length > 1 && (
                        <button type="button" className="btn-icon btn-icon-danger" aria-label="Remove" onClick={() => removeLine(li.id)}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={addLine} style={{ marginTop: 8 }}>+ Add line</button>
        </div>

        <div className="invoice-totals">
          <div><span className="text-muted">Subtotal</span><span className="money">${subtotal.toFixed(2)}</span></div>
          {Number(form.taxRate) > 0 && (
            <div><span className="text-muted">Tax ({form.taxRate}%)</span><span className="money">${taxAmount.toFixed(2)}</span></div>
          )}
          <div><strong>Total</strong><strong className="money">${total.toFixed(2)}</strong></div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">Create Invoice</button>
        </div>
      </form>
    </Modal>
  );
}
