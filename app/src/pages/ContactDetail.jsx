import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import {
  selectContactById, selectClientById, selectUserById, selectUsers, selectClients,
  selectInvoicesForContact, selectConversationsForContact, selectJobsForClient,
  selectSynthesizedActivityForContact, selectTagById,
  invoiceTotal, invoiceBalance, deriveInvoiceStatus,
} from '../store/selectors';
import { usePermission } from '../hooks/usePermission';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';
import DetailHeader from '../components/DetailHeader';
import Badge, { statusBadgeVariant } from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import FormField from '../components/FormField';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import Avatar from '../components/Avatar';
import TagChip from '../components/TagChip';
import TagPicker from '../components/TagPicker';
import VisibilitySelect from '../components/VisibilitySelect';
import AddContactModal from '../components/AddContactModal';
import NewConversationModal from '../components/NewConversationModal';
import { fmtDate, fmtRelative, money } from '../lib/dates';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'related',  label: 'Related' },
  { key: 'notes',    label: 'Notes' },
];

const LIFECYCLE_VARIANTS = {
  lead: 'amber',
  prospect: 'blue',
  customer: 'green',
  vendor: 'slate',
  archived: 'slate',
};

const PIPELINE_STAGE_LABELS = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal: 'Proposal', won: 'Won', lost: 'Lost',
};

export default function ContactDetail({ contactId: propContactId, embedded = false } = {}) {
  const params = useParams();
  const contactId = propContactId || params.contactId;
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const canEditAll = usePermission('contacts.edit');
  const canDelete = usePermission('contacts.delete');
  const canAssignOwner = usePermission('contacts.assignOwner');
  const canStartConversation = usePermission('messaging.startConversation');

  const contact = selectContactById(state, contactId);
  const users = selectUsers(state);
  const clients = selectClients(state);

  const [tab, setTab] = useState('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!contact) {
    return (
      <div style={{ padding: 32 }}>
        {embedded ? <h3>Contact not found</h3> : <DetailHeader backTo="/clients" title="Contact not found" />}
      </div>
    );
  }

  const canEditThis = canEditAll || (isContactOwner(state, contact, currentUser));
  const owner = contact.ownerUserId ? selectUserById(state, contact.ownerUserId) : null;
  const company = contact.companyId ? selectClientById(state, contact.companyId) : null;
  const companyLabel = company?.name || contact.customFields?.company || '—';

  const invoices = useMemo(() => selectInvoicesForContact(state, contact.id), [state, contact.id]);
  const conversations = useMemo(() => selectConversationsForContact(state, contact.id), [state, contact.id]);
  const relatedJobs = useMemo(() => (contact.companyId ? selectJobsForClient(state, contact.companyId) : []), [state, contact.companyId]);
  const activity = useMemo(() => selectSynthesizedActivityForContact(state, contact.id), [state, contact.id]);

  const updateField = (patch) => {
    dispatch({ type: ACTIONS.UPDATE_CONTACT, id: contact.id, patch });
    toast.success('Contact updated');
  };

  const appendNote = () => {
    if (!noteText.trim()) return;
    dispatch({ type: ACTIONS.APPEND_CONTACT_NOTE, id: contact.id, text: noteText.trim(), authorUserId: currentUser?.id });
    setNoteText('');
    toast.success('Note added');
  };

  const removeTag = (tag) => {
    dispatch({ type: ACTIONS.UNTAG_CONTACT, id: contact.id, tagId: tag.id });
  };
  const setTagIds = (ids) => {
    const prev = new Set(contact.tagIds || []);
    const next = new Set(ids);
    // grants
    ids.forEach((id) => { if (!prev.has(id)) dispatch({ type: ACTIONS.TAG_CONTACT, id: contact.id, tagId: id }); });
    // revokes
    (contact.tagIds || []).forEach((id) => { if (!next.has(id)) dispatch({ type: ACTIONS.UNTAG_CONTACT, id: contact.id, tagId: id }); });
  };

  const del = () => {
    dispatch({ type: ACTIONS.DELETE_CONTACT, id: contact.id });
    toast.success('Contact deleted');
    navigate('/clients');
  };

  const headerBadges = (
    <div className="flex-row" style={{ gap: 6 }}>
      <Badge variant={LIFECYCLE_VARIANTS[contact.lifecycle] || 'slate'}>
        {contact.lifecycle.charAt(0).toUpperCase() + contact.lifecycle.slice(1)}
      </Badge>
      {contact.stage && <Badge variant="blue">{PIPELINE_STAGE_LABELS[contact.stage] || contact.stage}</Badge>}
    </div>
  );
  // Prefer opening an existing thread over creating a new one — enforces "one thread per contact" UX.
  // If any non-archived conversation exists, navigate to the most recently-active one;
  // only fall through to NewConversationModal when the contact is truly thread-less.
  const handleMessage = () => {
    const existing = conversations
      .filter((c) => !c.archived)
      .sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));
    if (existing.length > 0) {
      navigate(`/messaging/${existing[0].id}`);
    } else {
      setNewConvOpen(true);
    }
  };

  const headerActions = (
    <div className="flex-row" style={{ gap: 8 }}>
      {canStartConversation && (
        <button className="btn btn-outline btn-sm" onClick={handleMessage}>
          <Icon name="messaging" size={14} />
          Message
        </button>
      )}
      {canEditThis && <button className="btn btn-outline btn-sm" onClick={() => setEditOpen(true)}>Edit</button>}
      {canDelete && <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(true)}>Delete</button>}
    </div>
  );

  return (
    <div className={embedded ? 'contact-detail-embedded' : 'page-pad'}>
      {embedded ? (
        <div className="contact-focus-head">
          <Avatar
            initials={`${(contact.firstName[0] || '').toUpperCase()}${(contact.lastName[0] || '').toUpperCase()}`}
            variant={(contact.id.length % 5) + 1}
            size="lg"
          />
          <div className="contact-focus-head-text">
            <div className="contact-focus-head-title">
              {contact.firstName} {contact.lastName}
            </div>
            <div className="text-muted text-sm">{contact.title || '—'} · {companyLabel}</div>
            <div style={{ marginTop: 6 }}>{headerBadges}</div>
          </div>
          <div className="contact-focus-head-actions">{headerActions}</div>
        </div>
      ) : (
        <DetailHeader
          backTo="/clients"
          backLabel="Clients"
          title={`${contact.firstName} ${contact.lastName}`}
          subtitle={`${contact.title || '—'} · ${companyLabel}`}
          badge={headerBadges}
          actions={headerActions}
        />
      )}

      <div className="tab-container tab-container-line">
        {TABS.map((t) => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="detail-grid">
          <div className="card detail-card">
            <h3>Contact</h3>
            <dl className="detail-dl">
              <div><dt>Email</dt><dd>{contact.email}</dd></div>
              <div><dt>Phone</dt><dd>{contact.phone || '—'}</dd></div>
              <div><dt>Title</dt><dd>{contact.title || '—'}</dd></div>
              <div><dt>Company</dt><dd>{company ? <Link to={`/clients/${company.id}`}>{company.name}</Link> : companyLabel}</dd></div>
              <div><dt>Lifecycle</dt><dd>{contact.lifecycle.charAt(0).toUpperCase() + contact.lifecycle.slice(1)}</dd></div>
              {contact.stage && (
                <>
                  <div><dt>Pipeline stage</dt><dd>{PIPELINE_STAGE_LABELS[contact.stage]}</dd></div>
                  <div><dt>Deal value</dt><dd>{contact.dealValue ? money(contact.dealValue) : '—'}</dd></div>
                  <div><dt>Expected close</dt><dd>{contact.expectedCloseDate ? fmtDate(contact.expectedCloseDate) : '—'}</dd></div>
                </>
              )}
              <div><dt>Created</dt><dd>{fmtDate(contact.createdAt)}</dd></div>
              <div><dt>Last updated</dt><dd>{fmtRelative(contact.updatedAt)}</dd></div>
            </dl>
          </div>

          <div>
            <div className="card detail-card">
              <h3>Owner</h3>
              {canAssignOwner ? (
                <FormField
                  label=""
                  as="select"
                  value={contact.ownerUserId || ''}
                  onChange={(e) => dispatch({ type: ACTIONS.ASSIGN_CONTACT_OWNER, id: contact.id, userId: e.target.value || null })}
                  options={[{ value: '', label: '— Unassigned —' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
                />
              ) : owner ? (
                <div className="flex-row" style={{ gap: 8 }}>
                  <Avatar initials={owner.initials} variant={owner.avatar} size="sm" />
                  <span>{owner.name}</span>
                </div>
              ) : <span className="text-muted text-sm">Unassigned</span>}
            </div>

            <div className="card detail-card">
              <h3>Tags</h3>
              {canEditThis ? (
                <TagPicker value={contact.tagIds || []} onChange={setTagIds} />
              ) : (
                <div className="flex-row" style={{ gap: 4 }}>
                  {(contact.tagIds || []).map((tid) => {
                    const t = selectTagById(state, tid);
                    return t ? <TagChip key={tid} tag={t} /> : null;
                  })}
                  {(contact.tagIds || []).length === 0 && <span className="text-muted text-sm">No tags</span>}
                </div>
              )}
            </div>

            <div className="card detail-card">
              <h3>Visibility</h3>
              {canEditThis ? (
                <VisibilitySelect value={contact.visibility} onChange={(v) => updateField({ visibility: v })} />
              ) : (
                <span>{contact.visibility}</span>
              )}
              <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                {contact.visibility === 'private' && 'Only the owner and Super Admin can see this contact.'}
                {contact.visibility === 'team' && 'Visible to admins and anyone with view-all permission.'}
                {contact.visibility === 'org' && 'Visible to anyone with Contacts access.'}
              </p>
            </div>

            {contact.lifecycle === 'lead' || contact.lifecycle === 'prospect' ? (
              <div className="card detail-card">
                <h3>Pipeline</h3>
                <FormField
                  label="Stage"
                  as="select"
                  value={contact.stage || ''}
                  onChange={(e) => dispatch({ type: ACTIONS.SET_CONTACT_STAGE, id: contact.id, stage: e.target.value })}
                  disabled={!canEditThis}
                  options={[
                    { value: '', label: '— None —' },
                    ...Object.entries(PIPELINE_STAGE_LABELS).map(([v, l]) => ({ value: v, label: l })),
                  ]}
                />
                <div className="form-row">
                  <FormField label="Deal value" type="number" value={contact.dealValue || ''} onChange={(e) => updateField({ dealValue: Number(e.target.value) || null })} disabled={!canEditThis} />
                  <FormField label="Expected close" type="date" value={contact.expectedCloseDate ? contact.expectedCloseDate.slice(0, 10) : ''} onChange={(e) => updateField({ expectedCloseDate: e.target.value ? new Date(e.target.value).toISOString() : null })} disabled={!canEditThis} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="card">
          {activity.length === 0 ? (
            <EmptyState icon={<Icon name="bell" size={28} />} title="No activity yet" message="Notes, stage changes, invoices, and messages will appear here." />
          ) : (
            <div className="activity-list">
              {activity.map((a) => (
                <div key={a.id} className={`activity-item activity-${a.kind}`}>
                  <div className="activity-kind">{a.kind}</div>
                  <div className="activity-body">
                    <div className="activity-text">{a.body}</div>
                    <div className="activity-meta text-xs text-muted">
                      {fmtRelative(a.occurredAt)}
                      {a._source === 'invoice' && <> · <Link to={`/invoices/${a._ref}`}>Open invoice</Link></>}
                      {a._source === 'job' && <> · <Link to={`/schedule/${a._ref}`}>Open job</Link></>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'related' && (
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-head" style={{ padding: '12px 16px 4px' }}>
              <h3 className="section-title">Invoices ({invoices.length})</h3>
            </div>
            {invoices.length === 0 ? (
              <div style={{ padding: '0 16px 16px' }}><span className="text-muted text-sm">No invoices where this contact is billing-lead.</span></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Invoice</th><th>Issued</th><th>Total</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const st = deriveInvoiceStatus(inv);
                      return (
                        <tr key={inv.id} className="clickable" onClick={() => navigate(`/invoices/${inv.id}`)}>
                          <td className="name">{inv.id}</td>
                          <td>{fmtDate(inv.issueDate)}</td>
                          <td className="money">{money(invoiceTotal(inv))}</td>
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

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="section-head" style={{ padding: '12px 16px 4px' }}>
              <h3 className="section-title">Jobs ({relatedJobs.length})</h3>
              {contact.companyId && <span className="text-xs text-muted">via {companyLabel}</span>}
            </div>
            {relatedJobs.length === 0 ? (
              <div style={{ padding: '0 16px 16px' }}><span className="text-muted text-sm">No jobs linked.</span></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Service</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {relatedJobs.slice(0, 10).map((j) => (
                      <tr key={j.id} className="clickable" onClick={() => navigate(`/schedule/${j.id}`)}>
                        <td>{fmtDate(j.startAt)}</td>
                        <td>{state.services.find((s) => s.id === j.serviceId)?.name || '—'}</td>
                        <td><Badge variant={statusBadgeVariant(j.status === 'done' ? 'Confirmed' : j.status === 'in_progress' ? 'In Progress' : 'Pending')}>
                          {j.status.replace('_', ' ')}
                        </Badge></td>
                        <td className="text-right"><Icon name="chevronRight" size={14} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-head" style={{ padding: '12px 16px 4px' }}>
              <h3 className="section-title">Conversations ({conversations.length})</h3>
            </div>
            {conversations.length === 0 ? (
              <div style={{ padding: '0 16px 16px' }}><span className="text-muted text-sm">No message threads yet.</span></div>
            ) : (
              <div style={{ padding: '0 16px 16px' }}>
                {conversations.map((cv) => (
                  <Link key={cv.id} to={`/messaging/${cv.id}`} className="chip" style={{ marginRight: 6 }}>
                    {cv.channel.toUpperCase()} · {fmtRelative(cv.createdAt)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <div>
          {canEditThis && (
            <div className="card" style={{ marginBottom: 16 }}>
              <FormField label="Add note" as="textarea" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Call recap, follow-up, decision…" />
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={appendNote} disabled={!noteText.trim()}>Append Note</button>
              </div>
            </div>
          )}
          {!contact.notes ? (
            <EmptyState icon={<Icon name="edit" size={28} />} title="No notes yet" message="Notes are timestamped and appended in order." />
          ) : (
            <div className="card">
              <pre className="notes-pre" style={{ padding: 16 }}>{contact.notes}</pre>
            </div>
          )}
        </div>
      )}

      <AddContactModal
        open={editOpen}
        mode="edit"
        initialData={contact}
        onClose={() => setEditOpen(false)}
      />
      <NewConversationModal
        open={newConvOpen}
        defaultContactId={contact.id}
        onClose={() => setNewConvOpen(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${contact.firstName} ${contact.lastName}?`}
        message="This removes the contact and unlinks them from any invoices, jobs, or conversations."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={del}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// Local helper — plain function (not a hook).
function isContactOwner(_state, contact, currentUser) {
  if (!currentUser || !contact) return false;
  return contact.ownerUserId === currentUser.id;
}
