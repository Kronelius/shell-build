import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge, { statusBadgeVariant } from '../components/Badge';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import FormField from '../components/FormField';
import Icon from '../components/Icon';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../components/Toast';
import {
  selectInvoices, selectClients, selectClientById, invoiceTotal, invoiceBalance,
  invoicePaid, deriveInvoiceStatus,
} from '../store/selectors';
import { fmtDate, money, todayIso } from '../lib/dates';

export default function Invoices() {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const canCreate = usePermission('invoices.edit');
  const canPay = usePermission('invoices.recordPayment');

  const invoices = selectInvoices(state);
  const clients = selectClients(state);

  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [selection, setSelection] = useState(new Set());
  const [confirmPaid, setConfirmPaid] = useState(false);

  const withStatus = useMemo(() => invoices.map((inv) => ({ ...inv, derivedStatus: deriveInvoiceStatus(inv) })), [invoices]);

  const filtered = useMemo(() => {
    const now = new Date();
    return withStatus.filter((inv) => {
      if (statusFilter !== 'all' && inv.derivedStatus !== statusFilter) return false;
      if (clientFilter !== 'all' && inv.clientId !== clientFilter) return false;
      if (dateRange !== 'all') {
        const days = Number(dateRange);
        const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - days);
        if (new Date(inv.issueDate) < cutoff) return false;
      }
      return true;
    });
  }, [withStatus, statusFilter, clientFilter, dateRange]);

  const collected = withStatus.reduce((a, inv) => a + invoicePaid(inv), 0);
  const outstanding = withStatus.reduce((a, inv) => inv.derivedStatus === 'pending' ? a + invoiceBalance(inv) : a, 0);
  const overdue = withStatus.reduce((a, inv) => inv.derivedStatus === 'overdue' ? a + invoiceBalance(inv) : a, 0);
  const outstandingCount = withStatus.filter((i) => i.derivedStatus === 'pending').length;
  const overdueCount = withStatus.filter((i) => i.derivedStatus === 'overdue').length;

  const toggleSelect = (id) => {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelection(next);
  };
  const toggleAll = () => {
    if (selection.size === filtered.length) setSelection(new Set());
    else setSelection(new Set(filtered.map((i) => i.id)));
  };

  const bulkMarkPaid = () => {
    [...selection].forEach((id) => {
      const inv = invoices.find((x) => x.id === id);
      if (!inv) return;
      const bal = invoiceBalance(inv);
      if (bal > 0) {
        dispatch({ type: ACTIONS.ADD_INVOICE_PAYMENT, id, payment: { amount: bal, method: 'Manual', note: 'Bulk mark paid', date: todayIso() } });
      }
      dispatch({ type: ACTIONS.SET_INVOICE_STATUS, id, status: 'paid' });
    });
    toast.success(`${selection.size} invoice${selection.size === 1 ? '' : 's'} marked paid`);
    setSelection(new Set());
    setConfirmPaid(false);
  };

  const exportCsv = () => {
    const rows = [['Invoice', 'Client', 'Issued', 'Due', 'Total', 'Balance', 'Status']];
    filtered.forEach((inv) => {
      const c = selectClientById(state, inv.clientId);
      rows.push([inv.id, c?.name || '', inv.issueDate, inv.dueDate, invoiceTotal(inv), invoiceBalance(inv), inv.derivedStatus]);
    });
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'invoices.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <>
      <div className="page-head">
        <h1>Invoices</h1>
        {canCreate && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModalOpen(true)}>
            + Create Invoice
          </button>
        )}
      </div>

      <div className="stat-grid">
        <StatCard value={money(collected)} label="Collected" trendDirection="up" />
        <StatCard value={money(outstanding)} label="Outstanding" trend={`${outstandingCount} invoice${outstandingCount === 1 ? '' : 's'}`} trendDirection="down" />
        <StatCard value={money(overdue)} label="Overdue" trend={`${overdueCount} invoice${overdueCount === 1 ? '' : 's'}`} trendDirection="down" />
      </div>

      <div className="filter-bar">
        <FormField label="Status" as="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          options={[{ value: 'all', label: 'All statuses' }, { value: 'draft', label: 'Draft' }, { value: 'pending', label: 'Pending' }, { value: 'overdue', label: 'Overdue' }, { value: 'paid', label: 'Paid' }, { value: 'void', label: 'Void' }]} />
        <FormField label="Client" as="select" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}
          options={[{ value: 'all', label: 'All clients' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} />
        <FormField label="Date range" as="select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}
          options={[{ value: 'all', label: 'All time' }, { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]} />
      </div>

      {selection.size > 0 && (
        <div className="bulk-bar">
          <span className="text-sm">{selection.size} selected</span>
          <div className="flex-row" style={{ gap: 6, marginLeft: 'auto' }}>
            {canPay && <button className="btn btn-primary btn-sm" onClick={() => setConfirmPaid(true)}>Mark Paid</button>}
            <button className="btn btn-outline btn-sm" onClick={exportCsv}>Export CSV</button>
            <button className="btn btn-outline btn-sm" onClick={() => setSelection(new Set())}>Clear</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        invoices.length === 0 ? (
          <EmptyState icon={<Icon name="invoices" size={28} />} title="No invoices yet" message="Create your first invoice to track payments." action={canCreate && <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Create Invoice</button>} />
        ) : (
          <EmptyState title="No matches" message="Try adjusting filters or date range." />
        )
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input type="checkbox" checked={selection.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                  </th>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const client = selectClientById(state, inv.clientId);
                  return (
                    <tr key={inv.id} className="clickable" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selection.has(inv.id)} onChange={() => toggleSelect(inv.id)} />
                      </td>
                      <td className="name">{inv.id}</td>
                      <td>{client?.name || '—'}</td>
                      <td>{fmtDate(inv.issueDate)}</td>
                      <td>{fmtDate(inv.dueDate)}</td>
                      <td className="money">{money(invoiceTotal(inv))}</td>
                      <td className="money">{money(invoiceBalance(inv))}</td>
                      <td><Badge variant={statusBadgeVariant(inv.derivedStatus === 'paid' ? 'Paid' : inv.derivedStatus === 'overdue' ? 'Overdue' : inv.derivedStatus === 'void' ? 'Inactive' : 'Pending')}>
                        {inv.derivedStatus.charAt(0).toUpperCase() + inv.derivedStatus.slice(1)}
                      </Badge></td>
                      <td className="text-right"><Icon name="chevronRight" size={14} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateInvoiceModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <ConfirmDialog
        open={confirmPaid}
        title={`Mark ${selection.size} invoice${selection.size === 1 ? '' : 's'} paid?`}
        message="Full balance will be recorded as a manual payment."
        confirmLabel="Mark Paid"
        onConfirm={bulkMarkPaid}
        onClose={() => setConfirmPaid(false)}
      />
    </>
  );
}
