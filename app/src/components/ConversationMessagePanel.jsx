import { useEffect, useRef, useState } from 'react';
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
        <Icon name="lock" size={12} />
        <span className="internal-bubble-label">Internal</span>
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
  onRemoveFromView,
  onSetStatus,
  onSnooze,
  onToggleStar,
  onToggleFollow,
  onBack,
}) {
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const nav = useFromHere();
  const state = useStore();

  const composeChannel = conversation?.channel || 'sms';
  const [draft, setDraft] = useState('');
  const [snippetId, setSnippetId] = useState(null);

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

  const isFollowing = currentUser && (conversation.followedUserIds || []).includes(currentUser.id);
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
            <ChannelBadge channel={conversation.channel} />
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
              className={`icon-btn ${isFollowing ? 'following' : ''}`}
              onClick={onToggleFollow}
              title={isFollowing ? 'Unfollow' : 'Follow'}
              aria-label={isFollowing ? 'Unfollow' : 'Follow'}
            >
              <Icon name="bell" size={14} />
            </button>
          )}
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={onRemoveFromView}
            title="Hide this thread from your view (does not delete the thread)"
          >
            <Icon name="x" size={14} />
            Remove from view
          </button>
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
          if (m.direction === 'internal') {
            return <InternalBubble key={m.id} message={m} />;
          }
          return <ChatBubble key={m.id} message={m} />;
        })}
      </div>

      <form className="compose-bar" onSubmit={handleSend}>
        {!isDmThread && (
          <div className="compose-channel-row">
            <SnippetPicker channel={composeChannel} onInsert={handleInsertSnippet} />
            {snippetId && <span className="text-xs text-muted">Snippet inserted</span>}
          </div>
        )}
        <div className="compose-row">
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
            rows={2}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!draft.trim()}>
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
