import { useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import {
  selectClientById, selectSitesForClient, selectJobsForClient, selectInvoicesForClient,
  selectServiceById, selectFrequencies, selectServices, selectContactsForClient, selectContactById,
  invoiceTotal, invoiceBalance, deriveInvoiceStatus,
} from '../store/selectors';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import DetailHeader from '../components/DetailHeader';
import Badge, { statusBadgeVariant } from '../components/Badge';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import FormField from '../components/FormField';
import AddSiteModal from '../components/AddSiteModal';
import AddContactModal from '../components/AddContactModal';
import ContactPicker from '../components/ContactPicker';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { fmtDate, fmtTimeRange, money } from '../lib/dates';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'sites',    label: 'Sites' },
  { key: 'history',  label: 'Service History' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'notes',    label: 'Notes' },
];

export default function ClientDetail() {
  const { clientId } = useParams();
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const canEdit = usePermission('clients.edit');
  const canArchive = usePermission('clients.archive');
  const canEditSites = usePermission('sites.edit');
  const canEditContacts = usePermission('contacts.edit');
  const { currentUser } = useAuth();

  const client = selectClientById(state, clientId);
  const sites = client ? selectSitesForClient(state, client.id) : [];
  const jobs = client ? selectJobsForClient(state, client.id) : [];
  const invoices = client ? selectInvoicesForClient(state, client.id) : [];
  const contacts = client ? selectContactsForClient(state, client.id) : [];
  const services = selectServices(state);
  const frequencies = selectFrequencies(state);
  const primaryContact = client?.primaryContactId ? selectContactById(state, client.primaryContactId) : null;

  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(client);
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [editSite, setEditSite] = useState(null);
  const [confirmDeleteSite, setConfirmDeleteSite] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addContactOpen, setAddContactOpen] = useState(false);

  const outstanding = useMemo(() => invoices.reduce((a, inv) => {
    const s = deriveInvoiceStatus(inv);
    return s === 'pending' || s === 'overdue' ? a + invoiceBalance(inv) : a;
  }, 0), [invoices]);

  if (!client) {
    return (
      <div style={{ padding: 32 }}>
        <DetailHeader backTo="/clients" title="Client not found" />
      </div>
    );
  }

  const save = () => {
    dispatch({ type: ACTIONS.UPDATE_CLIENT, id: client.id, patch: {
      name: form.name, primaryContact: form.primaryContact, email: form.email, phone: form.phone,
      serviceId: form.serviceId, frequencyId: form.frequencyId, status: form.status,
      primaryContactId: form.primaryContactId || null,
    }});
    setEditing(false);
    toast.success('Account updated');
  };

  const setPrimary = (contactId) => {
    dispatch({ type: ACTIONS.UPDATE_CLIENT, id: client.id, patch: { primaryContactId: contactId } });
    toast.success('Primary contact updated');
  };

  const archive = () => {
    dispatch({ type: ACTIONS.ARCHIVE_CLIENT, id: client.id });
    toast.success('Client archived');
  };

  const unarchive = () => {
    dispatch({ type: ACTIONS.UNARCHIVE_CLIENT, id: client.id });
    toast.success('Client reactivated');
  };

  const appendNote = () => {
    if (!noteText.trim()) return;
    dispatch({ type: ACTIONS.APPEND_CLIENT_NOTE, id: client.id, text: noteText.trim(), author: currentUser?.name });
    setNoteText('');
    toast.success('Note added');
  };

  return (
    <div className="page-pad">
      <DetailHeader
        backTo="/clients"
        backLabel="Clients"
        title={client.name}
        subtitle={client.primaryContact || ''}
        badge={<Badge variant={statusBadgeVariant(client.status === 'active' ? 'Active' : 'Inactive')}>
          {client.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>}
        actions={
          <div className="flex-row" style={{ gap: 8 }}>
            {canEdit && !editing && <button className="btn btn-outline btn-sm" onClick={() => { setEditing(true); setForm(client); }}>Edit</button>}
            {canArchive && client.status === 'active' && <button className="btn btn-outline btn-sm" onClick={() => setConfirmArchive(true)}>Archive</button>}
            {canArchive && client.status !== 'active' && <button className="btn btn-outline btn-sm" onClick={unarchive}>Reactivate</button>}
          </div>
        }
      />

      <div className="tab-container tab-container-line">
        {TABS.map((t) => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card detail-card">
          {!editing ? (
            <dl className="detail-dl">
              <div><dt>Primary contact</dt><dd>
                {primaryContact ? (
                  <Link to={`/clients/contact/${primaryContact.id}`}>
                    {primaryContact.firstName} {primaryContact.lastName}
                    {primaryContact.title && <span className="text-muted"> — {primaryContact.title}</span>}
                  </Link>
                ) : (client.primaryContact || '—')}
              </dd></div>
              <div><dt>Email</dt><dd>{primaryContact?.email || client.email || '—'}</dd></div>
              <div><dt>Phone</dt><dd>{primaryContact?.phone || client.phone || '—'}</dd></div>
              <div><dt>Service</dt><dd>{selectServiceById(state, client.serviceId)?.name || '—'}</dd></div>
              <div><dt>Frequency</dt><dd>{frequencies.find((f) => f.id === client.frequencyId)?.label || '—'}</dd></div>
              <div><dt>Lifetime revenue</dt><dd>{money(client.revenue || 0)}</dd></div>
              <div><dt>Outstanding</dt><dd>{outstanding > 0 ? <span className="text-danger">{money(outstanding)}</span> : money(0)}</dd></div>
              <div><dt>Last service</dt><dd>{client.lastServiceAt ? fmtDate(client.lastServiceAt) : '—'}</dd></div>
              <div><dt>Contacts</dt><dd>{contacts.length}</dd></div>
              <div><dt>Sites</dt><dd>{sites.length}</dd></div>
            </dl>
          ) : (
            <div>
              <FormField label="Company name" name="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="form-group">
                <label className="form-label">Primary contact</label>
                <ContactPicker
                  value={form.primaryContactId || null}
                  companyId={client.id}
                  onChange={(id) => setForm({ ...form, primaryContactId: id })}
                />
              </div>
              <div className="form-row">
                <FormField label="Email" type="email" name="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <FormField label="Phone" name="phone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-row">
                <FormField
                  label="Service" as="select" name="serviceId" required value={form.serviceId || ''}
                  onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                  options={services.map((s) => ({ value: s.id, label: s.name }))}
                />
                <FormField
                  label="Frequency" as="select" name="frequencyId" required value={form.frequencyId || ''}
                  onChange={(e) => setForm({ ...form, frequencyId: e.target.value })}
                  options={frequencies.map((f) => ({ value: f.id, label: f.label }))}
                />
                <FormField
                  label="Status" as="select" name="status" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => { setEditing(false); setForm(client); }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={save}>Save Changes</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'contacts' && (
        <div>
          <div className="section-head">
            <div>
              <h3 className="section-title">Contacts ({contacts.length})</h3>
              <p className="text-muted text-sm">Everyone you work with at {client.name}. Click a name for the full CRM profile.</p>
            </div>
            {canEditContacts && <button className="btn btn-primary btn-sm" onClick={() => setAddContactOpen(true)}><Icon name="plus" size={14} /> Add Contact</button>}
          </div>
          {contacts.length === 0 ? (
            <EmptyState
              icon={<Icon name="user" size={28} />}
              title="No contacts yet"
              message="Add the people you work with at this account."
              action={canEditContacts && <button className="btn btn-primary" onClick={() => setAddContactOpen(true)}>Add a contact</button>}
            />
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead><tr><th></th><th>Name</th><th>Title</th><th>Email</th><th>Phone</th><th></th></tr></thead>
                  <tbody>
                    {contacts
                      .slice()
                      .sort((a, b) => (a.id === client.primaryContactId ? -1 : b.id === client.primaryContactId ? 1 : 0))
                      .map((c) => {
                        const isPrimary = c.id === client.primaryContactId;
                        return (
                          <tr key={c.id} className="clickable" onClick={() => navigate(`/clients/contact/${c.id}`)}>
                            <td onClick={(e) => e.stopPropagation()} style={{ width: 36 }}>
                              <Avatar initials={`${(c.firstName[0] || '').toUpperCase()}${(c.lastName[0] || '').toUpperCase()}`} variant={(c.id.length % 5) + 1} size="sm" />
                            </td>
                            <td>
                              <span className="name">{c.firstName} {c.lastName}</span>
                              {isPrimary && <span className="tier-badge" style={{ marginLeft: 8 }}>Primary</span>}
                            </td>
                            <td>{c.title || '—'}</td>
                            <td>{c.email}</td>
                            <td>{c.phone || '—'}</td>
                            <td className="text-right" onClick={(e) => e.stopPropagation()}>
                              {!isPrimary && canEdit && (
                                <button className="btn btn-outline btn-sm" onClick={() => setPrimary(c.id)}>Set as primary</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <AddContactModal open={addContactOpen} onClose={() => setAddContactOpen(false)} lockCompanyId={client.id} />
        </div>
      )}

      {tab === 'sites' && (
        <div>
          <div className="section-head">
            <div>
              <h3 className="section-title">Sites ({sites.length})</h3>
              <p className="text-muted text-sm">Every location you service for this client.</p>
            </div>
            {canEditSites && <button className="btn btn-primary btn-sm" onClick={() => setAddSiteOpen(true)}><Icon name="plus" size={14} /> Add Site</button>}
          </div>
          {sites.length === 0 ? (
            <EmptyState
              icon={<Icon name="building" size={28} />}
              title="No sites yet"
              message="Add the locations you clean for this client."
              action={canEditSites && <button className="btn btn-primary" onClick={() => setAddSiteOpen(true)}>Add a site</button>}
            />
          ) : (
            <div className="site-grid">
              {sites.map((s) => (
                <div key={s.id} className="card site-card">
                  <div className="site-card-head">
                    <h4>{s.name}</h4>
                    {canEditSites && (
                      <div className="site-card-actions">
                        <button className="btn-icon" aria-label="Edit" onClick={() => setEditSite(s)}><Icon name="edit" size={16} /></button>
                        <button className="btn-icon btn-icon-danger" aria-label="Delete" onClick={() => setConfirmDeleteSite(s)}><Icon name="trash" size={16} /></button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-body">{s.address}</p>
                  {s.accessNotes && <p className="text-muted text-sm" style={{ marginTop: 6 }}>Access: {s.accessNotes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          {jobs.length === 0 ? (
            <EmptyState icon={<Icon name="schedule" size={28} />} title="No jobs yet" message="Jobs will appear here once scheduled." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Service</th><th>Site</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} className="clickable" onClick={() => navigate(`/schedule/${j.id}`)}>
                      <td>{fmtDate(j.startAt)} <span className="text-muted text-sm">{fmtTimeRange(j.startAt, j.endAt)}</span></td>
                      <td>{selectServiceById(state, j.serviceId)?.name || '—'}</td>
                      <td>{state.sites.find((s) => s.id === j.siteId)?.name || '—'}</td>
                      <td><Badge variant={statusBadgeVariant(j.status === 'in_progress' ? 'In Progress' : j.status === 'done' ? 'Confirmed' : 'Pending')}>
                        {j.status === 'in_progress' ? 'In Progress' : j.status === 'done' ? 'Done' : j.status === 'cancelled' ? 'Cancelled' : 'Upcoming'}
                      </Badge></td>
                      <td className="text-right"><Icon name="chevronRight" size={14} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="card">
          {invoices.length === 0 ? (
            <EmptyState icon={<Icon name="invoices" size={28} />} title="No invoices yet" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Invoice</th><th>Issued</th><th>Total</th><th>Balance</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {invoices.map((inv) => {
                    const st = deriveInvoiceStatus(inv);
                    return (
                      <tr key={inv.id} className="clickable" onClick={() => navigate(`/invoices/${inv.id}`)}>
                        <td className="name">{inv.id}</td>
                        <td>{fmtDate(inv.issueDate)}</td>
                        <td className="money">{money(invoiceTotal(inv))}</td>
                        <td className="money">{money(invoiceBalance(inv))}</td>
                        <td><Badge variant={statusBadgeVariant(st === 'paid' ? 'Paid' : st === 'overdue' ? 'Overdue' : 'Pending')}>{st.charAt(0).toUpperCase() + st.slice(1)}</Badge></td>
                        <td className="text-right"><Icon name="chevronRight" size={14} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'notes' && (
        <div>
          {canEdit && (
            <div className="card" style={{ marginBottom: 16 }}>
              <FormField label="Add note" as="textarea" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Arrival instructions, preferences, follow-ups…" />
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={appendNote} disabled={!noteText.trim()}>Append Note</button>
              </div>
            </div>
          )}
          {!client.notes ? (
            <EmptyState icon={<Icon name="edit" size={28} />} title="No notes yet" message="Notes are timestamped and appended in order." />
          ) : (
            <div className="card">
              <pre className="notes-pre">{client.notes}</pre>
            </div>
          )}
        </div>
      )}

      <AddSiteModal
        open={addSiteOpen}
        onClose={() => setAddSiteOpen(false)}
        clientId={client.id}
      />
      {editSite && (
        <AddSiteModal
          open
          mode="edit"
          clientId={client.id}
          initialData={editSite}
          onClose={() => setEditSite(null)}
        />
      )}
      <ConfirmDialog
        open={!!confirmDeleteSite}
        title={`Delete ${confirmDeleteSite?.name || 'site'}?`}
        message="Jobs and invoices linked to this site will keep their reference (the site will appear as '—')."
        confirmLabel="Delete Site"
        variant="danger"
        onConfirm={() => {
          dispatch({ type: ACTIONS.DELETE_SITE, id: confirmDeleteSite.id });
          toast.success('Site deleted');
        }}
        onClose={() => setConfirmDeleteSite(null)}
      />
      <ConfirmDialog
        open={confirmArchive}
        title="Archive this client?"
        message="They'll be marked inactive. You can reactivate anytime."
        confirmLabel="Archive"
        onConfirm={archive}
        onClose={() => setConfirmArchive(false)}
      />
    </div>
  );
}
