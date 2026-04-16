import { useState, useMemo } from 'react';
import Badge, { statusBadgeVariant } from '../components/Badge';
import StatCard from '../components/StatCard';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INVOICES, COMPANY } from '../data/sampleData';

export default function Invoices() {
  const [modalOpen, setModalOpen] = useState(false);
  const [customInvoices, setCustomInvoices] = useLocalStorage('pp.customInvoices', []);

  const all = useMemo(() => [...customInvoices, ...INVOICES], [customInvoices]);

  const collected = all.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const outstanding = all.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0);
  const outstandingCount = all.filter(i => i.status === 'Pending').length;
  const overdue = all.filter(i => i.status === 'Overdue').reduce((s, i) => s + i.amount, 0);
  const overdueCount = all.filter(i => i.status === 'Overdue').length;

  const nextNumber = all.length + 1001;
  const nextId = `${COMPANY.invoicePrefix}-${nextNumber.toString().padStart(4, '0')}`;

  const handleCreate = (inv) => {
    setCustomInvoices([inv, ...customInvoices]);
  };

  return (
    <>
      <div className="page-head">
        <h1>Invoices</h1>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModalOpen(true)}>
          + Create Invoice
        </button>
      </div>
      <div className="stat-grid">
        <StatCard value={`$${collected.toLocaleString()}`} label="Collected (MTD)" trend="+12%" trendDirection="up" />
        <StatCard value={`$${outstanding.toLocaleString()}`} label="Outstanding" trend={`${outstandingCount} invoice${outstandingCount === 1 ? '' : 's'}`} trendDirection="down" />
        <StatCard value={`$${overdue.toLocaleString()}`} label="Overdue" trend={`${overdueCount} invoice${overdueCount === 1 ? '' : 's'}`} trendDirection="down" />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {all.map((inv) => (
                <tr key={inv.id}>
                  <td className="name">{inv.id}</td>
                  <td>{inv.client}</td>
                  <td className="money">${inv.amount.toLocaleString()}</td>
                  <td>{inv.date}</td>
                  <td><Badge variant={statusBadgeVariant(inv.status)}>{inv.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <CreateInvoiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        nextId={nextId}
      />
    </>
  );
}
