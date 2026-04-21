import Avatar from './Avatar';
import EmptyState from './EmptyState';
import Icon from './Icon';
import BulkActionBar from './BulkActionBar';
import { useStore } from '../store';
import {
  selectContactById, selectMessagesForConversation, selectUnreadForConversation,
  selectEffectiveStatus,
} from '../store/selectors';
import { fmtRelative } from '../lib/dates';

function previewText(msg) {
  if (!msg) return '';
  const prefix = msg.direction === 'internal' ? '[Internal] ' : '';
  return `${prefix}${msg.text || ''}`;
}

function initialsFromContact(contact) {
  if (!contact) return 'T';
  const first = (contact.firstName || '')[0] || '';
  const last = (contact.lastName || '')[0] || '';
  return `${first}${last}`.toUpperCase() || 'C';
}

// "Snoozed" label: show "Snoozed · in Xh" if waking within a day, else "until <date>".
function snoozeLabel(untilIso) {
  if (!untilIso) return 'Snoozed';
  const diffMs = new Date(untilIso).getTime() - Date.now();
  if (diffMs <= 0) return 'Snoozed';
  const hours = Math.round(diffMs / 3600000);
  if (hours < 24) return `Snoozed · in ${Math.max(1, hours)}h`;
  const d = new Date(untilIso);
  return `Snoozed · until ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function StatusChip({ status, snoozedUntil }) {
  if (status === 'open') return null;
  if (status === 'snoozed') {
    return <span className="status-chip status-chip-amber"><Icon name="moon" size={10} />{snoozeLabel(snoozedUntil)}</span>;
  }
  if (status === 'closed') {
    return <span className="status-chip status-chip-slate"><Icon name="check" size={10} />Closed</span>;
  }
  return null;
}

function ThreadRow({ conversation, active, selected, onSelect, onToggleSelect, onToggleStar }) {
  const state = useStore();
  const contact = conversation.contactId ? selectContactById(state, conversation.contactId) : null;
  const msgs = selectMessagesForConversation(state, conversation.id);
  const last = msgs[msgs.length - 1];
  const unread = selectUnreadForConversation(state, conversation.id);
  const effectiveStatus = selectEffectiveStatus(conversation);

  const isInternal = conversation.channel === 'internal';
  const displayName = isInternal
    ? (conversation.title || 'Team discussion')
    : (contact ? `${contact.firstName} ${contact.lastName}` : 'Unlinked');
  const initials = isInternal ? 'T' : initialsFromContact(contact);
  const avatarVariant = isInternal ? 3 : ((contact?.id?.length || 0) % 5) + 1;

  return (
    <div
      className={`thread-row ${active ? 'active' : ''} ${selected ? 'selected' : ''} ${effectiveStatus !== 'open' ? 'status-' + effectiveStatus : ''}`}
      onClick={() => onSelect(conversation.id)}
      role="button"
      tabIndex={0}
    >
      <label className="thread-row-check" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(conversation.id)}
          aria-label={`Select ${displayName}`}
        />
      </label>
      <Avatar initials={initials} variant={avatarVariant} size="sm" />
      <div className="thread-row-body">
        <div className="thread-row-name">{displayName}</div>
        <div className="thread-row-preview">{previewText(last) || 'No messages yet'}</div>
      </div>
      <div className="thread-row-right">
        <button
          type="button"
          className={`thread-star-btn ${conversation.starred ? 'starred' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleStar(conversation.id); }}
          aria-label={conversation.starred ? 'Unpin' : 'Pin'}
          title={conversation.starred ? 'Unpin' : 'Pin'}
        >
          <Icon name="star" size={14} />
        </button>
        <span className="thread-row-time">{last ? fmtRelative(last.sentAt) : fmtRelative(conversation.createdAt)}</span>
        <div className="thread-row-meta">
          <StatusChip status={effectiveStatus} snoozedUntil={conversation.snoozedUntil} />
          {unread > 0 && <span className="thread-unread" aria-label={`${unread} unread`}>{unread}</span>}
        </div>
      </div>
    </div>
  );
}

export default function ConversationThreadList({
  conversations,
  activeId,
  onSelect,
  search,
  onSearchChange,
  totalBeforeFilter = 0,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onToggleStar,
  onBulkAssign,
  onBulkMarkRead,
  onBulkMarkUnread,
  onBulkArchive,
  canAssign,
  canBulk,
}) {
  const selectedCount = selectedIds?.size || 0;
  const allSelected = selectedCount > 0 && conversations.every((c) => selectedIds.has(c.id));

  return (
    <section className="thread-list-pane">
      <div className="thread-list-head">
        <div className="thread-list-search">
          <Icon name="search" size={14} />
          <input
            className="thread-list-input"
            placeholder="Search by name or message…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="thread-list-subhead">
          <label className="thread-list-selectall" title="Select all visible">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => (allSelected ? onClearSelection() : onSelectAll(conversations.map((c) => c.id)))}
              aria-label="Select all visible"
            />
            <span className="text-xs text-muted">
              {conversations.length === totalBeforeFilter
                ? `${conversations.length} thread${conversations.length === 1 ? '' : 's'}`
                : `${conversations.length} of ${totalBeforeFilter}`}
            </span>
          </label>
        </div>
      </div>
      {selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          onClear={onClearSelection}
          onAssign={onBulkAssign}
          onMarkRead={onBulkMarkRead}
          onMarkUnread={onBulkMarkUnread}
          onArchive={onBulkArchive}
          canAssign={canAssign}
          canBulk={canBulk}
        />
      )}
      <div className="thread-list-rows">
        {conversations.length === 0 ? (
          <EmptyState
            icon={<Icon name="messaging" size={24} />}
            title="No conversations"
            message="Try a different inbox or clear your filters."
          />
        ) : (() => {
          // Partition into pinned vs. the rest. Visible sections (with headers) only appear
          // when there's at least one pinned thread — otherwise we render a flat list.
          const pinned = conversations.filter((c) => c.starred);
          const others = conversations.filter((c) => !c.starred);
          const renderRow = (c) => (
            <ThreadRow
              key={c.id}
              conversation={c}
              active={c.id === activeId}
              selected={selectedIds?.has(c.id) || false}
              onSelect={onSelect}
              onToggleSelect={onToggleSelect}
              onToggleStar={onToggleStar}
            />
          );
          if (pinned.length === 0) return conversations.map(renderRow);
          return (
            <>
              <div className="thread-section-header">
                <Icon name="star" size={12} />
                <span>Pinned</span>
                <span className="thread-section-count">{pinned.length}</span>
              </div>
              {pinned.map(renderRow)}
              {others.length > 0 && (
                <>
                  <div className="thread-section-header thread-section-header-muted">
                    <span>All conversations</span>
                    <span className="thread-section-count">{others.length}</span>
                  </div>
                  {others.map(renderRow)}
                </>
              )}
            </>
          );
        })()}
      </div>
    </section>
  );
}
