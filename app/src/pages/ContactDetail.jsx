import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useFromHere } from '../hooks/useFromHere';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import {
  selectContactById, selectClientById, selectUserById, selectUsers, selectClients,
  selectInvoicesForContact, selectConversationsForContact, selectJobsForClient,
  selectActivitiesForContact, selectTagById, selectPipelineStages,
  invoiceTotal, deriveInvoiceStatus,
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
import AddContactModal from '../components/AddContactModal';
import NewConversationModal from '../components/NewConversationModal';
import { fmtDate, fmtRelative, money } from '../lib/dates';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'notes',    label: 'Notes' },
];

const LIFECYCLE_VARIANTS = {
  lead: 'amber',
  prospect: 'blue',
  customer: 'green',
  vendor: 'slate',
};

export default function ContactDetail({ contactId: propContactId, embedded = false } = {}) {
  const params = useParams();
  const contactId = propContactId || params.contactId;
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const nav = useFromHere();
  const { currentUser } = useAuth();

  const canEditAll = usePermission('contacts.edit');
  const canDelete = usePermission('contacts.delete');
  const canAssignOwner = usePermission('contacts.assignOwner');
  const canStartConversation = usePermission('messaging.startConversation');

  const contact = selectContactById(state, contactId);
  const users = selectUsers(state);
  const clients = selectClients(state);
  const stages = selectPipelineStages(state);
  const stageLabel = (key) => stages.find((s) => s.key === key)?.label || key;

  const [tab, setTab] = useState('overview');
  const [activitySubTab, setActivitySubTab] = useState('service');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState(null);

  if (!contact) {
    return (
      <div style={{ padding: 32 }}>
        {embedded ? <h3>Contact not found</h3> : <DetailHeader backTo="/contacts" backLabel="Contacts" title="Contact not found" />}
      </div>
    );
  }

  const canEditThis = canEditAll || (isContactOwner(state, contact, currentUser));
  const owner = contact.ownerUserId ? selectUserById(state, contact.ownerUserId) : null;
  const company = contact.companyId ? selectClientById(state, contact.companyId) : null;
  const companyLabel = company?.name || contact.customFields?.company || '—';

  const invoices = useMemo(() => selectInvoicesForContact(state, contact.id), [state, contact.id]);
  const conversations = useMemo(() => selectConversationsForContact(state, contact.id), [state, contact.id]);
  const serviceHistory = useMemo(() => (contact.companyId ? selectJobsForClient(state, contact.companyId) : []), [state, contact.companyId]);
  const activities = useMemo(() => selectActivitiesForContact(state, contact.id), [state, contact.id]);
  const noteActivities = useMemo(() => activities.filter((a) => a.kind === 'note'), [activities]);

  const updateField = (patch) => {
    dispatch({ type: ACTIONS.UPDATE_CONTACT, id: contact.id, patch });
  };

  const appendNote = () => {
    if (!noteText.trim()) return;
    dispatch({ type: ACTIONS.APPEND_CONTACT_NOTE, id: contact.id, text: noteText.trim(), authorUserId: currentUser?.id });
    setNoteText('');
    toast.success('Note added');
  };

  const startEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.body);
  };
  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingNoteText('');
  };
  const saveEditNote = () => {
    if (!editingNoteText.trim()) return;
    dispatch({
      type: ACTIONS.UPDATE_CONTACT_ACTIVITY,
      id: editingNoteId,
      patch: { body: editingNoteText.trim(), editedAt: new Date().toISOString() },
    });
    cancelEditNote();
    toast.success('Note updated');
  };
  const deleteNote = (id) => {
    dispatch({ type: ACTIONS.DELETE_CONTACT_ACTIVITY, id });
    setConfirmDeleteNoteId(null);
    toast.success('Note deleted');
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
    navigate('/contacts');
  };

  const headerBadges = (
    <div className="flex-row" style={{ gap: 6 }}>
      <Badge variant={LIFECYCLE_VARIANTS[contact.lifecycle] || 'slate'}>
        {contact.lifecycle.charAt(0).toUpperCase() + contact.lifecycle.slice(1)}
      </Badge>
      {contact.stage && <Badge variant="blue">{stageLabel(contact.stage)}</Badge>}
    </div>
  );
  // Prefer opening an existing thread over creating a new one — enforces "one thread per contact" UX.
  // If any conversation exists, navigate to the most recently-active one;
  // only fall through to NewConversationModal when the contact is truly thread-less.
  const handleMessage = () => {
    const existing = conversations
      .slice()
      .sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));
    if (existing.length > 0) {
      navigate(`/messaging/${existing[0].id}`, { state: nav });
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
      {canDelete && <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>Delete</button>}
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
          backTo="/contacts"
          backLabel="Contacts"
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
              <div><dt>Company</dt><dd>{company ? <Link to={`/clients/${company.id}`} state={nav}>{company.name}</Link> : companyLabel}</dd></div>
              <div><dt>Lifecycle</dt><dd>{contact.lifecycle.charAt(0).toUpperCase() + contact.lifecycle.slice(1)}</dd></div>
              {contact.stage && (
                <>
                  <div><dt>Pipeline stage</dt><dd>{stageLabel(contact.stage)}</dd></div>
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
                    ...stages.map((s) => ({ value: s.key, label: s.label })),
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
        <div>
          <div className="activity-toggle">
            <button
              type="button"
              className={`activity-toggle-btn ${activitySubTab === 'service' ? 'active' : ''}`}
              onClick={() => setActivitySubTab('service')}
            >
              <Icon name="schedule" size={14} />
              Service History
              <span className="activity-toggle-count">{serviceHistory.length}</span>
            </button>
            <button
              type="button"
              className={`activity-toggle-btn ${activitySubTab === 'payment' ? 'active' : ''}`}
              onClick={() => setActivitySubTab('payment')}
            >
              <Icon name="invoices" size={14} />
              Payment History
              <span className="activity-toggle-count">{invoices.length}</span>
            </button>
          </div>

          {activitySubTab === 'service' && (
            serviceHistory.length === 0 ? (
              <EmptyState icon={<Icon name="schedule" size={28} />} title="No service history" message={contact.companyId ? 'Jobs linked to this account will appear here.' : 'This contact is not attached to an account yet.'} />
            ) : (
              <div className="activity-card-grid">
                {serviceHistory.map((j) => {
                  const serviceName = state.services.find((s) => s.id === j.serviceId)?.name || '—';
                  const statusLabel = j.status.replace('_', ' ');
                  return (
                    <button
                      key={j.id}
                      type="button"
                      className="activity-card activity-card-service"
                      onClick={() => navigate(`/schedule/${j.id}`, { state: nav })}
                    >
                      <div className="activity-card-icon"><Icon name="schedule" size={18} /></div>
                      <div className="activity-card-body">
                        <div className="activity-card-title">{serviceName}</div>
                        <div className="activity-card-meta">{fmtDate(j.startAt)}</div>
                      </div>
                      <Badge variant={statusBadgeVariant(j.status === 'done' ? 'Confirmed' : j.status === 'in_progress' ? 'In Progress' : 'Pending')}>
                        {statusLabel}
                      </Badge>
                      <Icon name="chevronRight" size={14} />
                    </button>
                  );
                })}
              </div>
            )
          )}

          {activitySubTab === 'payment' && (
            invoices.length === 0 ? (
              <EmptyState icon={<Icon name="invoices" size={28} />} title="No payment history" message="Invoices billed to this contact will appear here." />
            ) : (
              <div className="activity-card-grid">
                {invoices.map((inv) => {
                  const st = deriveInvoiceStatus(inv);
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      className="activity-card activity-card-payment"
                      onClick={() => navigate(`/invoices/${inv.id}`, { state: nav })}
                    >
                      <div className="activity-card-icon"><Icon name="invoices" size={18} /></div>
                      <div className="activity-card-body">
                        <div className="activity-card-title">{inv.id}</div>
                        <div className="activity-card-meta">{fmtDate(inv.issueDate)} · {money(invoiceTotal(inv))}</div>
                      </div>
                      <Badge variant={statusBadgeVariant(st === 'paid' ? 'Paid' : st === 'overdue' ? 'Overdue' : 'Pending')}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </Badge>
                      <Icon name="chevronRight" size={14} />
                    </button>
                  );
                })}
              </div>
            )
          )}
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
          {noteActivities.length === 0 ? (
            <EmptyState icon={<Icon name="edit" size={28} />} title="No notes yet" message="Notes are timestamped and shown newest first." />
          ) : (
            <div className="note-list">
              {noteActivities.map((n) => {
                const author = n.authorUserId ? selectUserById(state, n.authorUserId) : null;
                const isEditing = editingNoteId === n.id;
                return (
                  <div key={n.id} className="note-item">
                    <div className="note-item-head">
                      <div className="flex-row" style={{ gap: 8, alignItems: 'center' }}>
                        {author && <Avatar initials={author.initials} variant={author.avatar} size="sm" />}
                        <div>
                          <div className="note-item-author">{author?.name || 'Someone'}</div>
                          <div className="note-item-time text-xs text-muted">
                            {fmtRelative(n.occurredAt)}
                            {n.editedAt && <> · edited {fmtRelative(n.editedAt)}</>}
                          </div>
                        </div>
                      </div>
                      {canEditThis && !isEditing && (
                        <div className="note-item-actions">
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => startEditNote(n)}>Edit</button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmDeleteNoteId(n.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div style={{ marginTop: 8 }}>
                        <FormField label="" as="textarea" value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)} />
                        <div className="flex-row" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                          <button type="button" className="btn btn-outline btn-sm" onClick={cancelEditNote}>Cancel</button>
                          <button type="button" className="btn btn-primary btn-sm" onClick={saveEditNote} disabled={!editingNoteText.trim()}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="note-item-body">{n.body}</div>
                    )}
                  </div>
                );
              })}
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
      <ConfirmDialog
        open={confirmDeleteNoteId !== null}
        title="Delete this note?"
        message="This permanently removes the note. You can't undo this."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteNote(confirmDeleteNoteId)}
        onClose={() => setConfirmDeleteNoteId(null)}
      />
    </div>
  );
}

// Local helper — plain function (not a hook).
function isContactOwner(_state, contact, currentUser) {
  if (!currentUser || !contact) return false;
  return contact.ownerUserId === currentUser.id;
}

