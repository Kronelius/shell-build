import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge, { statusBadgeVariant } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import FormField from '../components/FormField';
import Avatar from '../components/Avatar';
import TagChip from '../components/TagChip';
import TagPicker from '../components/TagPicker';
import AddClientModal from '../components/AddClientModal';
import AddContactModal from '../components/AddContactModal';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { useAuth } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../components/Toast';
import {
  selectClients, selectClientById, selectServiceById, selectFrequencies, selectServices,
  selectContacts, selectTags, selectTagById, selectPermissions, selectUsers, selectUserById,
  selectVisibleContactsFor,
} from '../store/selectors';
import { fmtDate, fmtRelative, money } from '../lib/dates';

const LIFECYCLE_VARIANTS = {
  lead: 'amber',
  prospect: 'blue',
  customer: 'green',
  vendor: 'slate',
  archived: 'slate',
};

const LIFECYCLES = ['all', 'lead', 'prospect', 'customer', 'vendor'];
const VISIBILITIES = ['all', 'org', 'team', 'private'];

export default function Clients() {
  const state = useStore();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();
  const { currentUser } = useAuth();
  const canCreateClient = usePermission('clients.edit');
  const canCreateContact = usePermission('contacts.edit');
  const canAssignOwner = usePermission('contacts.assignOwner');


  const clients = selectClients(state);
  const services = selectServices(state);
  const frequencies = selectFrequencies(state);
  const users = selectUsers(state);
  const permissions = selectPermissions(state);
  const allContacts = selectContacts(state);
  const allTags = selectTags(state);

  const visibleContacts = useMemo(
    () => selectVisibleContactsFor(state, currentUser, permissions),
    [state, currentUser, permissions]
  );

  const [tab, setTab] = useState('contacts');

  // Contacts filters
  const [cSearch, setCSearch] = useState('');
  const [cLifecycle, setCLifecycle] = useState('all');
  const [cOwner, setCOwner] = useState('all');
  const [cTag, setCTag] = useState('all');
  const [cVisibility, setCVisibility] = useState('all');
  const [cCompany, setCCompany] = useState('all');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkTagIds, setBulkTagIds] = useState([]);
  const [addContactOpen, setAddContactOpen] = useState(false);

  // Accounts (Clients) filters — preserved from pre-CRM implementation
  const [aSearch, setASearch] = useState('');
  const [aStatus, setAStatus] = useState('active');
  const [aService, setAService] = useState('all');
  const [aFreq, setAFreq] = useState('all');
  const [addClientOpen, setAddClientOpen] = useState(false);

  const filteredContacts = useMemo(() => {
    const q = cSearch.trim().toLowerCase();
    return visibleContacts.filter((c) => {
      if (c.lifecycle === 'archived') return false;
      if (cLifecycle !== 'all' && c.lifecycle !== cLifecycle) return false;
      if (cOwner !== 'all') {
        if (cOwner === 'unassigned' && c.ownerUserId) return false;
        if (cOwner !== 'unassigned' && c.ownerUserId !== cOwner) return false;
      }
      if (cTag !== 'all' && !(c.tagIds || []).includes(cTag)) return false;
      if (cVisibility !== 'all' && c.visibility !== cVisibility) return false;
      if (cCompany !== 'all') {
        if (cCompany === 'unattached' && c.companyId) return false;
        if (cCompany !== 'unattached' && c.companyId !== cCompany) return false;
      }
      if (q) {
        const hay = [c.firstName, c.lastName, c.email, c.title, c.phone].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [visibleContacts, cSearch, cLifecycle, cOwner, cTag, cVisibility, cCompany]);

  const filteredClients = useMemo(() => {
    const q = aSearch.trim().toLowerCase();
    return clients.filter((c) => {
      if (aStatus !== 'all' && c.status !== aStatus) return false;
      if (aService !== 'all' && c.serviceId !== aService) return false;
      if (aFreq !== 'all' && c.frequencyId !== aFreq) return false;
      if (q && !(c.name?.toLowerCase().includes(q) || c.primaryContact?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [clients, aSearch, aStatus, aService, aFreq]);

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkAssignOwner = (userId) => {
    if (!canAssignOwner) return;
    selectedIds.forEach((id) => {
      dispatch({ type: ACTIONS.ASSIGN_CONTACT_OWNER, id, userId: userId || null });
    });
    toast.success(`Owner assigned to ${selectedIds.size} contact${selectedIds.size === 1 ? '' : 's'}`);
    clearSelection();
  };
  const bulkApplyTags = () => {
    if (bulkTagIds.length === 0) return;
    selectedIds.forEach((id) => {
      bulkTagIds.forEach((tagId) => dispatch({ type: ACTIONS.TAG_CONTACT, id, tagId }));
    });
    toast.success(`Tagged ${selectedIds.size} contact${selectedIds.size === 1 ? '' : 's'}`);
    setBulkTagIds([]);
    clearSelection();
  };
  const bulkArchive = () => {
    selectedIds.forEach((id) => dispatch({ type: ACTIONS.ARCHIVE_CONTACT, id }));
    toast.success(`Archived ${selectedIds.size} contact${selectedIds.size === 1 ? '' : 's'}`);
    clearSelection();
  };

  return (
    <>
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-head-title">Contacts</h1>
          <p className="page-head-subtitle">
            People and the companies they belong to. Switch tabs for the Accounts view.
          </p>
        </div>
        <div className="page-head-actions">
          {tab === 'contacts' && canCreateContact && (
            <button className="btn btn-primary" onClick={() => setAddContactOpen(true)}>+ Add Contact</button>
          )}
          {tab === 'accounts' && canCreateClient && (
            <button className="btn btn-primary" onClick={() => setAddClientOpen(true)}>+ Add Account</button>
          )}
        </div>
      </div>

      <div className="tab-container tab-container-line" style={{ marginBottom: 16 }}>
        <button className={`tab-btn ${tab === 'contacts' ? 'active' : ''}`} onClick={() => setTab('contacts')}>Contacts</button>
        <button className={`tab-btn ${tab === 'accounts' ? 'active' : ''}`} onClick={() => setTab('accounts')}>Accounts</button>
      </div>

      {tab === 'contacts' && (
        <>
          <div className="filter-bar">
            <FormField label="Search" value={cSearch} onChange={(e) => setCSearch(e.target.value)} placeholder="Name, email, title…" />
            <FormField label="Lifecycle" as="select" value={cLifecycle} onChange={(e) => setCLifecycle(e.target.value)}
              options={LIFECYCLES.map((v) => ({ value: v, label: v === 'all' ? 'All lifecycles' : v.charAt(0).toUpperCase() + v.slice(1) }))} />
            <FormField label="Owner" as="select" value={cOwner} onChange={(e) => setCOwner(e.target.value)}
              options={[{ value: 'all', label: 'All owners' }, { value: 'unassigned', label: 'Unassigned' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} />
            <FormField label="Tag" as="select" value={cTag} onChange={(e) => setCTag(e.target.value)}
              options={[{ value: 'all', label: 'All tags' }, ...allTags.map((t) => ({ value: t.id, label: t.label }))]} />
            <FormField label="Company" as="select" value={cCompany} onChange={(e) => setCCompany(e.target.value)}
              options={[{ value: 'all', label: 'All companies' }, { value: 'unattached', label: 'Unattached' }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} />
            <FormField label="Visibility" as="select" value={cVisibility} onChange={(e) => setCVisibility(e.target.value)}
              options={VISIBILITIES.map((v) => ({ value: v, label: v === 'all' ? 'All visibility' : v.charAt(0).toUpperCase() + v.slice(1) }))} />
          </div>

          {selectedIds.size > 0 && (
            <div className="bulk-bar">
              <span className="text-sm font-semi">{selectedIds.size} selected</span>
              <div style={{ flex: 1 }} />
              <div style={{ minWidth: 200 }}>
                <TagPicker value={bulkTagIds} onChange={setBulkTagIds} placeholder="Tag selected…" />
              </div>
              <button className="btn btn-outline btn-sm" disabled={bulkTagIds.length === 0} onClick={bulkApplyTags}>Apply tags</button>
              {canAssignOwner && (
                <FormField label="" as="select" value="" onChange={(e) => bulkAssignOwner(e.target.value)}
                  options={[{ value: '', label: 'Assign owner…' }, { value: 'unassigned', label: 'Unassigned' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} />
              )}
              <button className="btn btn-outline btn-sm" onClick={bulkArchive}>Archive</button>
              <button className="btn btn-outline btn-sm" onClick={clearSelection}>Cancel</button>
            </div>
          )}

          {filteredContacts.length === 0 ? (
            allContacts.length === 0 ? (
              <EmptyState
                icon={<Icon name="clients" size={28} />}
                title="No contacts yet"
                message="Add your first contact to start building your CRM."
                action={canCreateContact && <button className="btn btn-primary" onClick={() => setAddContactOpen(true)}>Add Contact</button>}
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
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          aria-label="Select all"
                          checked={selectedIds.size > 0 && selectedIds.size === filteredContacts.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th>Name</th>
                      <th>Company</th>
                      <th>Lifecycle</th>
                      <th>Owner</th>
                      <th>Tags</th>
                      <th>Updated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((c) => {
                      const owner = c.ownerUserId ? selectUserById(state, c.ownerUserId) : null;
                      const company = c.companyId ? selectClientById(state, c.companyId) : null;
                      const companyLabel = company?.name || c.customFields?.company || '—';
                      return (
                        <tr key={c.id} className="clickable">
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${c.firstName} ${c.lastName}`}
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleSelected(c.id)}
                            />
                          </td>
                          <td onClick={() => navigate(`/clients/contact/${c.id}`)}>
                            <div className="flex-row" style={{ gap: 8 }}>
                              <Avatar initials={`${(c.firstName[0] || '').toUpperCase()}${(c.lastName[0] || '').toUpperCase()}`} variant={(c.id.length % 5) + 1} size="sm" />
                              <div>
                                <div className="name">{c.firstName} {c.lastName}</div>
                                <div className="text-xs text-muted">{c.email}</div>
                              </div>
                            </div>
                          </td>
                          <td onClick={() => navigate(`/clients/contact/${c.id}`)}>
                            <div>{companyLabel}</div>
                            <div className="text-xs text-muted">{c.title || '—'}</div>
                          </td>
                          <td onClick={() => navigate(`/clients/contact/${c.id}`)}>
                            <Badge variant={LIFECYCLE_VARIANTS[c.lifecycle] || 'slate'}>
                              {c.lifecycle.charAt(0).toUpperCase() + c.lifecycle.slice(1)}
                            </Badge>
                          </td>
                          <td onClick={() => navigate(`/clients/contact/${c.id}`)}>
                            {owner ? (
                              <div className="flex-row" style={{ gap: 6 }}>
                                <Avatar initials={owner.initials} variant={owner.avatar} size="sm" />
                                <span className="text-xs">{owner.name}</span>
                              </div>
                            ) : <span className="text-muted text-xs">Unassigned</span>}
                          </td>
                          <td onClick={() => navigate(`/clients/contact/${c.id}`)}>
                            <div className="flex-row" style={{ gap: 4 }}>
                              {(c.tagIds || []).slice(0, 3).map((tid) => {
                                const t = selectTagById(state, tid);
                                return t ? <TagChip key={tid} tag={t} size="xs" /> : null;
                              })}
                              {(c.tagIds || []).length > 3 && <span className="text-xs text-muted">+{(c.tagIds || []).length - 3}</span>}
                            </div>
                          </td>
                          <td onClick={() => navigate(`/clients/contact/${c.id}`)} className="text-xs text-muted">{fmtRelative(c.updatedAt)}</td>
                          <td className="text-right" onClick={() => navigate(`/clients/contact/${c.id}`)}><Icon name="chevronRight" size={14} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <AddContactModal open={addContactOpen} onClose={() => setAddContactOpen(false)} />
        </>
      )}

      {tab === 'accounts' && (
        <>
          <div className="filter-bar">
            <FormField label="Search" value={aSearch} onChange={(e) => setASearch(e.target.value)} placeholder="Name, contact, email…" />
            <FormField label="Status" as="select" value={aStatus} onChange={(e) => setAStatus(e.target.value)}
              options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            <FormField label="Service" as="select" value={aService} onChange={(e) => setAService(e.target.value)}
              options={[{ value: 'all', label: 'All services' }, ...services.map((s) => ({ value: s.id, label: s.name }))]} />
            <FormField label="Frequency" as="select" value={aFreq} onChange={(e) => setAFreq(e.target.value)}
              options={[{ value: 'all', label: 'All frequencies' }, ...frequencies.map((f) => ({ value: f.id, label: f.label }))]} />
          </div>

          {filteredClients.length === 0 ? (
            clients.length === 0 ? (
              <EmptyState
                icon={<Icon name="clients" size={28} />}
                title="No accounts yet"
                message="Add your first account (company) to get started."
                action={canCreateClient && <button className="btn btn-primary" onClick={() => setAddClientOpen(true)}>Add Account</button>}
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
                      <th>Account</th>
                      <th>Primary contact</th>
                      <th>Service</th>
                      <th>Frequency</th>
                      <th>Last Service</th>
                      <th>Revenue</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((c) => {
                      const primary = c.primaryContactId ? allContacts.find((ct) => ct.id === c.primaryContactId) : null;
                      const primaryLabel = primary ? `${primary.firstName} ${primary.lastName}` : (c.primaryContact || '—');
                      return (
                        <tr key={c.id} className="clickable" onClick={() => navigate(`/clients/${c.id}`)}>
                          <td className="name">{c.name}</td>
                          <td>{primaryLabel}</td>
                          <td>{selectServiceById(state, c.serviceId)?.name || '—'}</td>
                          <td>{frequencies.find((f) => f.id === c.frequencyId)?.label || '—'}</td>
                          <td>{c.lastServiceAt ? fmtDate(c.lastServiceAt) : '—'}</td>
                          <td className="money">{money(c.revenue || 0)}</td>
                          <td><Badge variant={statusBadgeVariant(c.status === 'active' ? 'Active' : 'Inactive')}>
                            {c.status === 'active' ? 'Active' : 'Inactive'}
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

          <AddClientModal open={addClientOpen} onClose={() => setAddClientOpen(false)} />
        </>
      )}

    </>
  );
}
