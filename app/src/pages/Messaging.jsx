// ─────────────────────────────────────────────────────────────────────────────
// Messaging — GHL-shaped inbox (Phase 2a + 2b).
//   Shell: MessagingHeader (inbox toggle + filters + new button)
//          ┌─ Thread List ─┬─ Message Panel ─┬─ Context Panel ─┐
//   Channels: SMS, Email, Internal Comment ONLY. No FB/IG/WhatsApp.
//
// Phase 2b shipped: assignment, status lifecycle (open/snoozed/closed),
// auto-unsnooze (read-side), starring, following, folder membership,
// bulk actions (mark read/unread, archive, assign), crew visibility gate.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MessagingHeader, { EMPTY_FILTERS } from '../components/MessagingHeader';
import ConversationThreadList from '../components/ConversationThreadList';
import ConversationMessagePanel from '../components/ConversationMessagePanel';
import ConversationContextPanel from '../components/ConversationContextPanel';
import NewConversationModal from '../components/NewConversationModal';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { useAuth } from '../hooks/useAuth';
import { usePermission } from '../hooks/usePermission';
import {
  selectContactById, selectConversationById, selectMessagesForConversation,
  selectUnreadForConversation, selectConversationsForInbox, selectUnreadCountForInbox,
  selectEffectiveStatus,
} from '../store/selectors';

const DATE_WINDOW_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d':  7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

function withinDateRange(conv, range) {
  if (range === 'all' || !range) return true;
  const ms = DATE_WINDOW_MS[range];
  if (!ms) return true;
  const ts = conv.lastMessageAt || conv.createdAt;
  if (!ts) return false;
  return Date.now() - new Date(ts).getTime() <= ms;
}

// Compute each active filter's outcome, then combine with AND/OR logic.
// Inactive filters (empty arrays, blank values, defaults) are ignored.
function passesFilters(conv, filters, state) {
  const active = [];
  if (filters.channels.length > 0) {
    active.push(filters.channels.includes(conv.channel));
  }
  if (filters.tagIds.length > 0) {
    const contact = conv.contactId ? selectContactById(state, conv.contactId) : null;
    const tagIds = contact?.tagIds || [];
    active.push(filters.tagIds.some((id) => tagIds.includes(id)));
  }
  if (filters.ownerId) {
    // Phase 2b: filters.ownerId = thread assignee (or '__unassigned' sentinel).
    if (filters.ownerId === '__unassigned') {
      active.push(!conv.assignedUserId);
    } else {
      active.push(conv.assignedUserId === filters.ownerId);
    }
  }
  if (filters.dateRange && filters.dateRange !== 'all') {
    active.push(withinDateRange(conv, filters.dateRange));
  }
  if (filters.statuses && filters.statuses.length > 0) {
    const eff = selectEffectiveStatus(conv);
    active.push(filters.statuses.includes(eff));
  }
  if (filters.starredOnly) {
    active.push(Boolean(conv.starred));
  }
  if (active.length === 0) return true;
  return filters.logic === 'or' ? active.some(Boolean) : active.every(Boolean);
}

function matchesSearch(conv, q, state) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const contact = conv.contactId ? selectContactById(state, conv.contactId) : null;
  const name = contact ? `${contact.firstName} ${contact.lastName}`.toLowerCase() : (conv.title || '').toLowerCase();
  if (name.includes(needle)) return true;
  const msgs = selectMessagesForConversation(state, conv.id);
  return msgs.some((m) => (m.text || '').toLowerCase().includes(needle));
}

export default function Messaging() {
  const state = useStore();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { conversationId: paramId } = useParams();
  const { currentUser } = useAuth();

  const canStart = usePermission('messaging.startConversation');
  const canInternal = usePermission('messaging.internalComment');
  const canAssign = usePermission('messaging.assign');
  const canBulk = usePermission('messaging.bulkActions');

  const [selectedInbox, setSelectedInbox] = useState('my');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(paramId || null);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Base inbox list (no filters/search applied yet) — also used for totals in rail counts.
  const inboxConversations = useMemo(
    () => selectConversationsForInbox(state, selectedInbox, currentUser),
    [state, selectedInbox, currentUser]
  );

  // Apply filters + search on top of the inbox slice.
  const visibleConversations = useMemo(
    () => inboxConversations.filter((c) => passesFilters(c, filters, state) && matchesSearch(c, search, state)),
    [inboxConversations, filters, search, state]
  );

  // Unread counts per inbox bucket (shown as badges on the header toggle).
  const inboxUnread = useMemo(() => ({
    my:       selectUnreadCountForInbox(state, 'my',       currentUser),
    team:     selectUnreadCountForInbox(state, 'team',     currentUser),
    internal: selectUnreadCountForInbox(state, 'internal', currentUser),
  }), [state, currentUser]);

  // Keep activeId in sync with URL + visible-set membership.
  useEffect(() => {
    if (paramId && paramId !== activeId) setActiveId(paramId);
  }, [paramId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visibleConversations.length) return;
    if (!activeId || !visibleConversations.find((c) => c.id === activeId)) {
      setActiveId(visibleConversations[0].id);
    }
  }, [visibleConversations, activeId]);

  // If the user switches inbox, pick the first conversation in the new set
  // and clear any lingering bulk selection (selections don't cross inboxes).
  useEffect(() => {
    setSelectedIds(new Set());
    if (!visibleConversations.length) {
      setActiveId(null);
      return;
    }
    if (!visibleConversations.find((c) => c.id === activeId)) {
      setActiveId(visibleConversations[0].id);
    }
  }, [selectedInbox]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeConversation = activeId ? selectConversationById(state, activeId) : null;
  const activeContact = activeConversation?.contactId ? selectContactById(state, activeConversation.contactId) : null;
  const activeMessages = activeConversation ? selectMessagesForConversation(state, activeConversation.id) : [];

  // Mark incoming messages as read when opening a thread.
  useEffect(() => {
    if (activeConversation && selectUnreadForConversation(state, activeConversation.id) > 0) {
      dispatch({ type: ACTIONS.MARK_CONVERSATION_READ, id: activeConversation.id });
    }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (id) => {
    setActiveId(id);
    navigate(`/messaging/${id}`);
  };

  const handleSend = (text, opts) => {
    if (!activeConversation) return;
    const direction = opts?.channel === 'internal' ? 'internal' : 'out';
    dispatch({
      type: ACTIONS.ADD_MESSAGE,
      message: {
        conversationId: activeConversation.id,
        direction,
        text,
        authorUserId: currentUser?.id || null,
        snippetId: opts?.snippetId || null,
      },
    });
  };

  const handleArchiveToggle = () => {
    if (!activeConversation) return;
    dispatch({
      type: activeConversation.archived ? ACTIONS.UNARCHIVE_CONVERSATION : ACTIONS.ARCHIVE_CONVERSATION,
      id: activeConversation.id,
    });
  };

  // --- Phase 2b per-thread action handlers -------------------------------
  const handleAssign = (userId) => {
    if (!activeConversation) return;
    dispatch({ type: ACTIONS.ASSIGN_CONVERSATION, id: activeConversation.id, userId });
  };
  const handleSetStatus = (status) => {
    if (!activeConversation) return;
    dispatch({ type: ACTIONS.SET_CONVERSATION_STATUS, id: activeConversation.id, status });
  };
  const handleSnooze = (until) => {
    if (!activeConversation) return;
    dispatch({ type: ACTIONS.SNOOZE_CONVERSATION, id: activeConversation.id, until });
  };
  const handleToggleStarActive = () => {
    if (!activeConversation) return;
    dispatch({ type: ACTIONS.TOGGLE_CONVERSATION_STAR, id: activeConversation.id });
  };
  const handleToggleStarRow = (id) => {
    dispatch({ type: ACTIONS.TOGGLE_CONVERSATION_STAR, id });
  };
  const handleToggleFollow = () => {
    if (!activeConversation || !currentUser) return;
    dispatch({ type: ACTIONS.TOGGLE_CONVERSATION_FOLLOW, id: activeConversation.id, userId: currentUser.id });
  };
  const handleLinkContact = (contactId) => {
    if (!activeConversation) return;
    dispatch({
      type: ACTIONS.UPDATE_CONVERSATION,
      id: activeConversation.id,
      patch: { contactId: contactId || null },
    });
  };

  // --- Bulk selection ----------------------------------------------------
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const handleSelectAll = (ids) => setSelectedIds(new Set(ids));
  const handleClearSelection = () => setSelectedIds(new Set());

  const handleBulkAssign = (userId) => {
    dispatch({ type: ACTIONS.BULK_ASSIGN_CONVERSATIONS, ids: Array.from(selectedIds), userId });
    setSelectedIds(new Set());
  };
  const handleBulkMarkRead = () => {
    dispatch({ type: ACTIONS.BULK_MARK_CONVERSATIONS_READ, ids: Array.from(selectedIds) });
  };
  const handleBulkMarkUnread = () => {
    dispatch({ type: ACTIONS.BULK_MARK_CONVERSATIONS_UNREAD, ids: Array.from(selectedIds) });
  };
  const handleBulkArchive = () => {
    dispatch({ type: ACTIONS.BULK_ARCHIVE_CONVERSATIONS, ids: Array.from(selectedIds) });
    setSelectedIds(new Set());
  };

  return (
    <>
      <div className="page-head">
        <h1>Messaging</h1>
      </div>
      <div className="messaging-wrap card">
        <MessagingHeader
          selectedInbox={selectedInbox}
          onInboxChange={setSelectedInbox}
          unread={inboxUnread}
          filters={filters}
          onFiltersChange={setFilters}
          canStart={canStart}
          onNewConversation={() => setNewConvOpen(true)}
        />
        <div className="msg-3pane">
          <ConversationThreadList
            conversations={visibleConversations}
            activeId={activeId}
            onSelect={handleSelect}
            search={search}
            onSearchChange={setSearch}
            totalBeforeFilter={inboxConversations.length}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onToggleStar={handleToggleStarRow}
            onBulkAssign={handleBulkAssign}
            onBulkMarkRead={handleBulkMarkRead}
            onBulkMarkUnread={handleBulkMarkUnread}
            onBulkArchive={handleBulkArchive}
            canAssign={canAssign}
            canBulk={canBulk}
          />
          <ConversationMessagePanel
            conversation={activeConversation}
            contact={activeContact}
            messages={activeMessages}
            canInternalComment={canInternal}
            canAssign={canAssign}
            currentUser={currentUser}
            onSend={handleSend}
            onArchiveToggle={handleArchiveToggle}
            onAssign={handleAssign}
            onSetStatus={handleSetStatus}
            onSnooze={handleSnooze}
            onToggleStar={handleToggleStarActive}
            onToggleFollow={handleToggleFollow}
          />
          <ConversationContextPanel
            conversation={activeConversation}
            contact={activeContact}
            onLinkContact={handleLinkContact}
          />
        </div>
      </div>

      <NewConversationModal
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
      />
    </>
  );
}
