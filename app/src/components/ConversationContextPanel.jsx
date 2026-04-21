import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import Badge, { statusBadgeVariant } from './Badge';
import EmptyState from './EmptyState';
import Icon from './Icon';
import TagChip from './TagChip';
import { useStore } from '../store';
import {
  selectClientById, selectInvoicesForContact, selectJobsForClient,
  selectSynthesizedActivityForContact, selectTagById, selectUserById,
  selectMessageFolders, selectMessageFolderById,
  invoiceTotal, deriveInvoiceStatus,
} from '../store/selectors';
import { fmtDate, fmtRelative, money } from '../lib/dates';

const LIFECYCLE_VARIANTS = {
  lead: 'amber',
  prospect: 'blue',
  customer: 'green',
  vendor: 'slate',
  archived: 'slate',
};

const TABS = [
  { key: 'contact',    label: 'Contact' },
  { key: 'activities', label: 'Activities' },
  { key: 'related',    label: 'Related' },
];

// Shared folder card — lists current folders and lets the user toggle membership
// via a dropdown. Also surfaces "Manage folders" for users with the manage perm.
function FoldersCard({ conversation, onSetFolders, onManage, canManage }) {
  const state = useStore();
  const allFolders = selectMessageFolders(state);
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setPickerOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setPickerOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const current = (conversation.folderIds || []);
  const toggle = (folderId) => {
    const next = current.includes(folderId)
      ? current.filter((id) => id !== folderId)
      : [...current, folderId];
    onSetFolders(next);
  };

  return (
    <div className="context-card">
      <div className="context-card-title-row">
        <div className="context-card-title">Folders</div>
        <div className="folder-card-actions">
          <button type="button" className="linklike text-xs" onClick={() => setPickerOpen((v) => !v)}>
            {current.length === 0 ? 'Add to folder' : 'Change'}
          </button>
          {canManage && (
            <button type="button" className="linklike text-xs" onClick={onManage}>
              Manage
            </button>
          )}
        </div>
      </div>
      <div className="folder-chips-row" ref={wrapRef}>
        {current.length === 0 ? (
          <span className="text-xs text-muted">Not filed</span>
        ) : current.map((fid) => {
          const f = selectMessageFolderById(state, fid);
          if (!f) return null;
          return (
            <span key={f.id} className={`folder-chip folder-color-${f.color}`}>
              <span className="folder-chip-dot" />
              {f.label}
              <button type="button" className="folder-chip-remove" aria-label={`Remove from ${f.label}`} onClick={() => toggle(f.id)}>×</button>
            </span>
          );
        })}
        {pickerOpen && (
          <div className="folder-picker-popover">
            {allFolders.length === 0 ? (
              <div className="text-xs text-muted" style={{ padding: 10 }}>No folders yet.</div>
            ) : allFolders.map((f) => {
              const on = current.includes(f.id);
              return (
                <button key={f.id} type="button" className={`folder-option ${on ? 'on' : ''}`} onClick={() => toggle(f.id)}>
                  <span className={`folder-chip-dot folder-color-${f.color}`} />
                  <span>{f.label}</span>
                  {on && <Icon name="check" size={12} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InternalContextPanel({ conversation, onSetFolders, onManageFolders, canManageFolders }) {
  const state = useStore();
  const participantIds = Array.from(new Set(
    (state.messages || [])
      .filter((m) => m.conversationId === conversation.id && m.authorUserId)
      .map((m) => m.authorUserId)
  ));
  const participants = participantIds.map((id) => selectUserById(state, id)).filter(Boolean);

  return (
    <aside className="context-pane">
      <div className="context-head">
        <h3 className="context-title">{conversation.title || 'Team discussion'}</h3>
        <div className="text-xs text-muted">Internal-only thread — not visible to customers.</div>
      </div>
      <div className="context-body">
        <div className="context-card">
          <div className="context-card-title">Participants</div>
          {participants.length === 0 ? (
            <div className="text-xs text-muted">No participants yet.</div>
          ) : (
            <ul className="context-participants">
              {participants.map((u) => (
                <li key={u.id} className="context-participant">
                  <Avatar initials={u.initials} variant={u.avatar} size="sm" />
                  <span>{u.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <FoldersCard
          conversation={conversation}
          onSetFolders={onSetFolders}
          onManage={onManageFolders}
          canManage={canManageFolders}
        />
      </div>
    </aside>
  );
}

export default function ConversationContextPanel({ conversation, contact, onSetFolders, onManageFolders, canManageFolders }) {
  const state = useStore();
  const [tab, setTab] = useState('contact');

  // Hooks must run on every render — compute activity/invoices/jobs up front,
  // even when we'll fall through to an early return below.
  const contactId = contact?.id || null;
  const companyId = contact?.companyId || null;
  const activity = useMemo(
    () => (contactId ? selectSynthesizedActivityForContact(state, contactId).slice(0, 10) : []),
    [state, contactId]
  );
  const invoices = useMemo(
    () => (contactId ? selectInvoicesForContact(state, contactId) : []),
    [state, contactId]
  );
  const jobs = useMemo(
    () => (companyId ? selectJobsForClient(state, companyId) : []),
    [state, companyId]
  );

  if (!conversation) {
    return (
      <aside className="context-pane context-pane-empty">
        <EmptyState message="Select a conversation to see contact details." />
      </aside>
    );
  }

  if (conversation.channel === 'internal' || !contact) {
    return (
      <InternalContextPanel
        conversation={conversation}
        onSetFolders={onSetFolders}
        onManageFolders={onManageFolders}
        canManageFolders={canManageFolders}
      />
    );
  }

  const company = contact.companyId ? selectClientById(state, contact.companyId) : null;
  const owner = contact.ownerUserId ? selectUserById(state, contact.ownerUserId) : null;

  const initials = `${(contact.firstName || '')[0] || ''}${(contact.lastName || '')[0] || ''}`.toUpperCase() || 'C';
  const avatarVariant = ((contact.id?.length || 0) % 5) + 1;

  return (
    <aside className="context-pane">
      <div className="context-head">
        <Avatar initials={initials} variant={avatarVariant} size="md" />
        <div className="context-head-text">
          <Link to={`/contacts/${contact.id}`} className="context-head-name">
            {contact.firstName} {contact.lastName}
          </Link>
          <div className="text-xs text-muted">{contact.title || '—'}</div>
          <div className="context-head-badges">
            <Badge variant={LIFECYCLE_VARIANTS[contact.lifecycle] || 'slate'}>
              {contact.lifecycle.charAt(0).toUpperCase() + contact.lifecycle.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="tab-container tab-container-line context-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="context-body">
        {tab === 'contact' && (
          <>
            <div className="context-card">
              <div className="context-card-title">Details</div>
              <dl className="context-dl">
                <div><dt>Email</dt><dd>{contact.email}</dd></div>
                <div><dt>Phone</dt><dd>{contact.phone || '—'}</dd></div>
                <div><dt>Company</dt><dd>{company ? <Link to={`/clients/${company.id}`}>{company.name}</Link> : '—'}</dd></div>
                <div><dt>Owner</dt><dd>{owner ? owner.name : 'Unassigned'}</dd></div>
              </dl>
            </div>
            <div className="context-card">
              <div className="context-card-title">Tags</div>
              <div className="flex-row" style={{ gap: 4 }}>
                {(contact.tagIds || []).length === 0 ? (
                  <span className="text-xs text-muted">No tags</span>
                ) : (contact.tagIds || []).map((tid) => {
                  const t = selectTagById(state, tid);
                  return t ? <TagChip key={tid} tag={t} /> : null;
                })}
              </div>
            </div>
            <FoldersCard
              conversation={conversation}
              onSetFolders={onSetFolders}
              onManage={onManageFolders}
              canManage={canManageFolders}
            />
            <div className="context-card">
              <Link to={`/contacts/${contact.id}`} className="btn btn-outline btn-sm context-full-link">
                Open full profile
                <Icon name="chevronRight" size={12} />
              </Link>
            </div>
          </>
        )}

        {tab === 'activities' && (
          <div className="context-card">
            {activity.length === 0 ? (
              <EmptyState message="No activity yet." />
            ) : (
              <ul className="context-activity">
                {activity.map((a) => (
                  <li key={a.id} className={`context-activity-item kind-${a.kind}`}>
                    <div className="context-activity-kind">{a.kind}</div>
                    <div className="context-activity-body">
                      <div>{a.body}</div>
                      <div className="text-xs text-muted">{fmtRelative(a.occurredAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'related' && (
          <>
            <div className="context-card">
              <div className="context-card-title">Invoices ({invoices.length})</div>
              {invoices.length === 0 ? (
                <div className="text-xs text-muted">No invoices linked.</div>
              ) : (
                <ul className="context-related">
                  {invoices.slice(0, 5).map((inv) => {
                    const st = deriveInvoiceStatus(inv);
                    return (
                      <li key={inv.id}>
                        <Link to={`/invoices/${inv.id}`} className="context-related-row">
                          <span className="context-related-primary">{inv.id}</span>
                          <span className="context-related-sub">{fmtDate(inv.issueDate)} · {money(invoiceTotal(inv))}</span>
                          <Badge variant={statusBadgeVariant(st === 'paid' ? 'Paid' : st === 'overdue' ? 'Overdue' : 'Pending')}>
                            {st.charAt(0).toUpperCase() + st.slice(1)}
                          </Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="context-card">
              <div className="context-card-title">Jobs ({jobs.length})</div>
              {jobs.length === 0 ? (
                <div className="text-xs text-muted">No jobs linked via this contact's account.</div>
              ) : (
                <ul className="context-related">
                  {jobs.slice(0, 5).map((j) => (
                    <li key={j.id}>
                      <Link to={`/schedule/${j.id}`} className="context-related-row">
                        <span className="context-related-primary">{fmtDate(j.startAt)}</span>
                        <span className="context-related-sub">{state.services.find((s) => s.id === j.serviceId)?.name || 'Service'}</span>
                        <Badge variant={statusBadgeVariant(j.status === 'done' ? 'Confirmed' : j.status === 'in_progress' ? 'In Progress' : 'Pending')}>
                          {j.status.replace('_', ' ')}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
