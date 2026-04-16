import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import FormField from '../components/FormField';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { useAuth } from '../hooks/useAuth';
import {
  selectConversations, selectMessagesForConversation, selectClientById,
  selectUnreadForConversation,
} from '../store/selectors';
import { fmtRelative, fmtTime } from '../lib/dates';

export default function Messaging() {
  const state = useStore();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { conversationId: paramId } = useParams();
  const { currentUser } = useAuth();

  const conversations = selectConversations(state);

  const [channel, setChannel] = useState('All');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (!showArchived && c.archived) return false;
      if (showArchived && !c.archived) return false;
      if (channel !== 'All' && c.channel !== channel.toLowerCase()) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const client = selectClientById(state, c.clientId);
        const msgs = selectMessagesForConversation(state, c.id);
        const hitClient = client?.name?.toLowerCase().includes(q);
        const hitMsg = msgs.some((m) => m.text?.toLowerCase().includes(q));
        if (!hitClient && !hitMsg) return false;
      }
      return true;
    });
  }, [conversations, state, channel, search, showArchived]);

  const [activeId, setActiveId] = useState(paramId || filtered[0]?.id || null);

  useEffect(() => {
    if (paramId && paramId !== activeId) setActiveId(paramId);
  }, [paramId]);

  useEffect(() => {
    if (filtered.length && !filtered.find((c) => c.id === activeId)) {
      setActiveId(filtered[0].id);
    }
  }, [filtered, activeId]);

  const activeConv = conversations.find((c) => c.id === activeId) || null;
  const messages = activeConv ? selectMessagesForConversation(state, activeConv.id) : [];
  const activeClient = activeConv ? selectClientById(state, activeConv.clientId) : null;

  // Mark as read when opening
  useEffect(() => {
    if (activeConv && selectUnreadForConversation(state, activeConv.id) > 0) {
      dispatch({ type: ACTIONS.MARK_CONVERSATION_READ, id: activeConv.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, activeId]);

  const sendMessage = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeConv) return;
    dispatch({
      type: ACTIONS.ADD_MESSAGE,
      message: { conversationId: activeConv.id, direction: 'out', text, authorUserId: currentUser?.id || null },
    });
    setDraft('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const archive = () => {
    if (!activeConv) return;
    dispatch({ type: ACTIONS.ARCHIVE_CONVERSATION, id: activeConv.id });
  };
  const unarchive = () => {
    if (!activeConv) return;
    dispatch({ type: ACTIONS.UNARCHIVE_CONVERSATION, id: activeConv.id });
  };

  return (
    <>
      <div className="page-head">
        <h1>Messaging</h1>
        <span className="tier-badge">Add-on</span>
      </div>
      <div className="schedule-toolbar">
        <div className="tab-container tab-container-line">
          {['All', 'SMS', 'Email'].map((v) => (
            <button key={v} className={`tab-btn ${channel === v ? 'active' : ''}`} onClick={() => setChannel(v)}>{v}</button>
          ))}
        </div>
        <label className="flex-row" style={{ gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          <span className="text-sm">Show archived</span>
        </label>
      </div>

      <div className="card">
        <div className="msg-layout">
          <div className="msg-sidebar">
            <div style={{ padding: 10 }}>
              <input
                className="input"
                placeholder="Search messages…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="msg-list">
              {filtered.length === 0 ? (
                <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
                  No conversations{showArchived ? ' in archive' : ''}.
                </div>
              ) : filtered.map((c) => {
                const msgs = selectMessagesForConversation(state, c.id);
                const last = msgs[msgs.length - 1];
                const client = selectClientById(state, c.clientId);
                const unread = selectUnreadForConversation(state, c.id);
                return (
                  <div
                    key={c.id}
                    className={`msg-item ${c.id === activeConv?.id ? 'active' : ''}`}
                    onClick={() => { setActiveId(c.id); navigate(`/messaging/${c.id}`); }}
                  >
                    <Avatar initials={client?.primaryContact?.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2) || 'C'} variant={1} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                        <div className="text-sm font-semi">{client?.name || 'Unlinked'}</div>
                        {unread > 0 && <span className="unread-dot">{unread}</span>}
                      </div>
                      <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {last?.text || '—'}
                      </div>
                    </div>
                    <div className="text-xs text-muted">{last ? fmtRelative(last.sentAt) : ''}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {activeConv ? (
            <div className="chat-area">
              <div className="chat-header">
                <div className="flex-row">
                  <Avatar initials={activeClient?.primaryContact?.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2) || 'C'} variant={1} size="sm" />
                  <div>
                    <strong className="text-sm">{activeClient?.name || 'Unlinked'}</strong>
                    <div className="text-xs text-muted">{activeConv.channel.toUpperCase()}</div>
                  </div>
                  <div className="flex-row" style={{ marginLeft: 'auto', gap: 6 }}>
                    {activeClient && (
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/clients/${activeClient.id}`)}>
                        View Client
                      </button>
                    )}
                    {activeConv.archived
                      ? <button className="btn btn-outline btn-sm" onClick={unarchive}>Unarchive</button>
                      : <button className="btn btn-outline btn-sm" onClick={archive}>Archive</button>}
                  </div>
                </div>
              </div>
              <div className="chat-messages" ref={scrollRef}>
                {messages.length === 0 ? (
                  <EmptyState message="No messages yet." />
                ) : messages.map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.direction === 'out' ? 'outgoing' : 'incoming'}`}>
                    {m.text}
                    <div className="chat-time">{fmtTime(m.sentAt)}</div>
                  </div>
                ))}
              </div>
              <form className="chat-compose" onSubmit={sendMessage}>
                <textarea
                  className="chat-input"
                  placeholder="Type a message…  (Enter to send, Shift+Enter for newline)"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKey}
                  rows={2}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>Send</button>
              </form>
            </div>
          ) : (
            <EmptyState icon={<Icon name="messaging" size={28} />} title="Select a conversation" message="Pick a thread from the left to start chatting." />
          )}
        </div>
      </div>
    </>
  );
}
