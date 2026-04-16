import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge, { statusBadgeVariant } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import FormField from '../components/FormField';
import AddClientModal from '../components/AddClientModal';
import { useStore } from '../store';
import { usePermission } from '../hooks/usePermission';
import { selectClients, selectServiceById, selectFrequencies, selectServices } from '../store/selectors';
import { fmtDate, money } from '../lib/dates';

export default function Clients() {
  const state = useStore();
  const navigate = useNavigate();
  const canCreate = usePermission('clients.edit');
  const clients = selectClients(state);
  const services = selectServices(state);
  const frequencies = selectFrequencies(state);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [freqFilter, setFreqFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (status !== 'all' && c.status !== status) return false;
      if (serviceFilter !== 'all' && c.serviceId !== serviceFilter) return false;
      if (freqFilter !== 'all' && c.frequencyId !== freqFilter) return false;
      if (q && !(c.name?.toLowerCase().includes(q) || c.primaryContact?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [clients, search, status, serviceFilter, freqFilter]);

  return (
    <>
      <div className="page-head">
        <h1>Clients</h1>
        {canCreate && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModalOpen(true)}>
            + Add Client
          </button>
        )}
      </div>

      <div className="filter-bar">
        <FormField label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, contact, email…" />
        <FormField label="Status" as="select" value={status} onChange={(e) => setStatus(e.target.value)}
          options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <FormField label="Service" as="select" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
          options={[{ value: 'all', label: 'All services' }, ...services.map((s) => ({ value: s.id, label: s.name }))]} />
        <FormField label="Frequency" as="select" value={freqFilter} onChange={(e) => setFreqFilter(e.target.value)}
          options={[{ value: 'all', label: 'All frequencies' }, ...frequencies.map((f) => ({ value: f.id, label: f.label }))]} />
      </div>

      {filtered.length === 0 ? (
        clients.length === 0 ? (
          <EmptyState
            icon={<Icon name="clients" size={28} />}
            title="No clients yet"
            message="Add your first client to get started."
            action={canCreate && <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Add Client</button>}
          />
        ) : (
          <EmptyState title="No matches" message="Try clearing filters or changing search." />
        )
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Service</th>
                  <th>Frequency</th>
                  <th>Last Service</th>
                  <th>Revenue</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/clients/${c.id}`)}>
                    <td className="name">{c.name}</td>
                    <td>{c.primaryContact || '—'}</td>
                    <td>{selectServiceById(state, c.serviceId)?.name || '—'}</td>
                    <td>{frequencies.find((f) => f.id === c.frequencyId)?.label || '—'}</td>
                    <td>{c.lastServiceAt ? fmtDate(c.lastServiceAt) : '—'}</td>
                    <td className="money">{money(c.revenue || 0)}</td>
                    <td><Badge variant={statusBadgeVariant(c.status === 'active' ? 'Active' : 'Inactive')}>
                      {c.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge></td>
                    <td className="text-right"><Icon name="chevronRight" size={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddClientModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
