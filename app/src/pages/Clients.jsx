import { useState, useMemo } from 'react';
import Badge, { statusBadgeVariant } from '../components/Badge';
import AddClientModal from '../components/AddClientModal';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { CLIENTS } from '../data/sampleData';

export default function Clients() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [customClients, setCustomClients] = useLocalStorage('pp.customClients', []);

  const all = useMemo(() => [...customClients, ...CLIENTS], [customClients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.service.toLowerCase().includes(q) ||
      c.frequency.toLowerCase().includes(q)
    );
  }, [all, search]);

  const handleAdd = (newClient) => {
    setCustomClients([newClient, ...customClients]);
  };

  return (
    <>
      <div className="page-head">
        <h1>Clients</h1>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModalOpen(true)}>
          + Add Client
        </button>
      </div>
      <input
        className="input mb-20"
        placeholder="Search clients..."
        style={{ maxWidth: 320 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Frequency</th>
                <th>Last Service</th>
                <th>Revenue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No clients found.</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id}>
                  <td className="name">{c.name}</td>
                  <td>{c.service}</td>
                  <td>{c.frequency}</td>
                  <td>{c.lastService}</td>
                  <td className="money">${c.revenue.toLocaleString()}</td>
                  <td><Badge variant={statusBadgeVariant(c.status)}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <AddClientModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleAdd} />
    </>
  );
}
