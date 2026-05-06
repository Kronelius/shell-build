import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFromHere } from '../hooks/useFromHere';
import Avatar from './Avatar';
import ChannelBadge from './ChannelBadge';
import EmptyState from './EmptyState';
import Icon from './Icon';
import SnippetPicker from './SnippetPicker';
import { useStore } from '../store';
import { selectUserById, selectOtherParticipant } from '../store/selectors';
import { fmtTime, fmtRelative } from '../lib/dates';

function initialsFor(contact) {
  if (!contact) return 'T';
  return `${(contact.firstName || '')[0] || ''}${(contact.lastName || '')[0] || ''}`.toUpperCase() || 'C';
}

function InternalBubble({ message }) {
  const state = useStore();
  const author = message.authorUserId ? selectUserById(state, message.authorUserId) : null;
  return (
    <div className="internal-bubble">
      <div className="internal-bubble-head">
        {author && <span className="internal-bubble-author">{author.name}</span>}
        <span className="internal-bubble-time">{fmtTime(message.sentAt)} · {fmtRelative(message.sentAt)}</span>
      </div>
      <div className="internal-bubble-body">{message.text}</div>
    </div>
  );
}

function ChatBubble({ message }) {
  const state = useStore();
  const author = message.authorUserId ? selectUserById(state, message.authorUserId) : null;
  const isOut = message.direction === 'out';
  return (
    <div className={`chat-bubble ${isOut ? 'outgoing' : 'incoming'}`}>
      {isOut && author && <div className="chat-bubble-author">{author.name}</div>}
      <div>{message.text}</div>
      <div className="chat-time">{fmtTime(message.sentAt)}</div>
    </div>
  );
}

function DmBubble({ message, currentUserId }) {
  const state = useStore();
  const author = message.authorUserId ? selectUserById(state, message.authorUserId) : null;
  const isMine = author?.id === currentUserId;
  return (
    <div className={`chat-bubble ${isMine ? 'outgoing' : 'incoming'}`}>
      {!isMine && author && <div className="chat-bubble-author">{author.name}</div>}
      <div>{message.text}</div>
      <div className="chat-time">{fmtTime(message.sentAt)}</div>
    </div>
  );
}

export default function ConversationMessagePanel({
  conversation,
  contact,
  messages,
  currentUser,
  isSuperAdmin,
  onSend,
  onDeleteForever,
  onSetStatus,
  onSnooze,
  onToggleStar,
  onToggleMute,
  onBack,
}) {
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const nav = useFromHere();
  const state = useStore();

  const composeChannel = conversation?.channel || 'sms';
  const [draft, setDraft] = useState('');
  const [snippetId, setSnippetId] = useState(null);

  // Compose textarea height — controlled in JS so the drag handle can grow it
  // *upward* from the top edge (the native textarea resize only goes down from
  // the bottom-right corner). 96px ≈ 4 lines, comfortable default for both
  // quick replies and longer notes.
  const COMPOSE_MIN_H = 56;
  const COMPOSE_MAX_H = 360;
  const [composeHeight, setComposeHeight] = useState(96);
  const composeDragRef = useRef(null);
  const [isResizingCompose, setIsResizingCompose] = useState(false);

  const onComposeResizeStart = useCallback((e) => {
    e.preventDefault();
    composeDragRef.current = { startY: e.clientY, startH: composeHeight };
    setIsResizingCompose(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    const onMove = (me) => {
      const ds = composeDragRef.current;
      if (!ds) return;
      // Drag UP (clientY decreases) → height grows. That makes the handle in
      // the top-right behave like the top edge of the box: pull it up to make
      // the textarea taller.
      const dy = ds.startY - me.clientY;
      const next = Math.max(COMPOSE_MIN_H, Math.min(COMPOSE_MAX_H, ds.startH + dy));
      setComposeHeight(next);
    };
    const onUp = () => {
      composeDragRef.current = null;
      setIsResizingCompose(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [composeHeight]);

  useEffect(() => {
    setDraft('');
    setSnippetId(null);
  }, [conversation?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <section className="message-pane">
        <EmptyState
          icon={<Icon name="messaging" size={28} />}
          title="Select a conversation"
          message="Pick a thread from the list to start chatting."
        />
      </section>
    );
  }

  const isInternalThread = conversation.channel === 'internal';
  const isDmThread = conversation.channel === 'dm';
  const dmOther = isDmThread ? selectOtherParticipant(state, conversation, currentUser?.id) : null;
  let headerName;
  let headerSub;
  let initials;
  let avatarVariant;
  if (isDmThread) {
    headerName = dmOther ? dmOther.name : 'Unknown user';
    headerSub = 'Direct message · only the two of you can see this';
    initials = dmOther?.initials || '?';
    avatarVariant = dmOther?.avatar || 1;
  } else if (isInternalThread) {
    headerName = conversation.title || 'Team discussion';
    headerSub = 'Internal team thread';
    initials = 'T';
    avatarVariant = 3;
  } else {
    headerName = contact ? `${contact.firstName} ${contact.lastName}` : 'Unlinked';
    headerSub = contact?.email || contact?.phone || 'No contact info';
    initials = initialsFor(contact);
    avatarVariant = ((contact?.id?.length || 0) % 5) + 1;
  }

  const handleSend = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text, { channel: composeChannel, snippetId });
    setDraft('');
    setSnippetId(null);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleInsertSnippet = ({ id, body }) => {
    setSnippetId(id);
    setDraft((prev) => (prev ? `${prev}\n${body}` : body));
  };

  const isMuted = currentUser && (conversation.mutedByUserIds || []).includes(currentUser.id);
  const canHardDelete = Boolean(isSuperAdmin || (currentUser && conversation.createdByUserId === currentUser.id));

  return (
    <section className="message-pane">
      <div className="message-pane-head">
        {onBack && (
          <button type="button" className="msg-back-btn" onClick={onBack} aria-label="Back to inbox">
            <Icon name="chevronLeft" size={20} />
          </button>
        )}
        <Avatar initials={initials} variant={avatarVariant} size="sm" />
        <div className="message-pane-titles">
          <div className="message-pane-name">
            {isInternalThread || !contact ? (
              headerName
            ) : (
              <button type="button" className="linklike" onClick={() => navigate(`/contacts/${contact.id}`, { state: nav })}>
                {headerName}
              </button>
            )}
            {!isInternalThread && <ChannelBadge channel={conversation.channel} />}
          </div>
          <div className="message-pane-sub text-xs text-muted">{headerSub}</div>
        </div>
        <div className="message-pane-actions">
          <button
            type="button"
            className={`icon-btn ${conversation.starred ? 'starred' : ''}`}
            onClick={onToggleStar}
            title={conversation.starred ? 'Unstar' : 'Star'}
            aria-label={conversation.starred ? 'Unstar' : 'Star'}
          >
            <Icon name="star" size={14} />
          </button>
          {!isDmThread && (
            <button
              type="button"
              className={`icon-btn ${isMuted ? 'is-muted' : ''}`}
              onClick={onToggleMute}
              title={isMuted ? 'Notifications silenced — click to unmute' : 'Silence notifications for this thread'}
              aria-label={isMuted ? 'Unmute notifications' : 'Mute notifications'}
              aria-pressed={isMuted ? 'true' : 'false'}
            >
              <Icon name={isMuted ? 'bellOff' : 'bell'} size={14} />
            </button>
          )}
          {canHardDelete && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={onDeleteForever}
              title="Permanently delete the thread and all messages for everyone"
            >
              <Icon name="trash" size={14} />
              Delete thread
            </button>
          )}
        </div>
      </div>

      <div className="message-pane-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <EmptyState message="No messages yet." />
        ) : messages.map((m) => {
          if (isDmThread) {
            return <DmBubble key={m.id} message={m} currentUserId={currentUser?.id} />;
          }
          // Internal team threads: every message is direction='internal' by definition.
          // External threads (sms/email) only carry direction='in'/'out' — the cross-channel
          // internal-note feature was removed in v26, so a chat bubble is always correct here.
          if (isInternalThread) {
            return <InternalBubble key={m.id} message={m} />;
          }
          return <ChatBubble key={m.id} message={m} />;
        })}
      </div>

      <form className="compose-bar" onSubmit={handleSend}>
        <div className="compose-row">
          <div
            className={`compose-input-wrap ${isResizingCompose ? 'is-resizing' : ''}`}
            style={{ height: `${composeHeight}px` }}
          >
            <textarea
              className="compose-input"
              placeholder={
                isDmThread
                  ? `Message ${dmOther ? dmOther.name.split(' ')[0] : 'teammate'}…  (Enter to send, Shift+Enter for newline)`
                  : composeChannel === 'internal'
                  ? 'Internal note — only your team can see this.'
                  : `Type a ${composeChannel === 'email' ? 'message' : 'text'}…  (Enter to send, Shift+Enter for newline)`
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              type="button"
              className="compose-input-resize"
              onPointerDown={onComposeResizeStart}
              title="Drag up to expand"
              aria-label="Resize compose box"
            >
              <Icon name="resizeGrip" size={12} />
            </button>
          </div>
          <div className="compose-row-actions">
            {!isDmThread && (
              <SnippetPicker channel={composeChannel} onInsert={handleInsertSnippet} />
            )}
            <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
