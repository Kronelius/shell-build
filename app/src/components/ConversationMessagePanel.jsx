import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFromHere } from '../hooks/useFromHere';
import Avatar from './Avatar';
import ChannelBadge from './ChannelBadge';
import EmptyState from './EmptyState';
import Icon from './Icon';
import SnippetPicker from './SnippetPicker';
import AssignMenu from './AssignMenu';
import { useStore } from '../store';
import { selectUserById } from '../store/selectors';
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

export default function ConversationMessagePanel({
  conversation,
  contact,
  messages,
  canInternalComment,
  canAssign,
  currentUser,
  onSend,
  onArchiveToggle,
  onAssign,
  onSetStatus,
  onSnooze,
  onToggleStar,
  onToggleFollow,
}) {
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const nav = useFromHere();

  // Compose state — channel defaults to the conversation's primary channel,
  // but the user can toggle Internal (team comments stay inline, not sent out).
  const defaultComposeChannel = conversation?.channel === 'internal' ? 'internal' : conversation?.channel;
  const [composeChannel, setComposeChannel] = useState(defaultComposeChannel || 'sms');
  const [draft, setDraft] = useState('');
  const [snippetId, setSnippetId] = useState(null);

  useEffect(() => {
    setComposeChannel(defaultComposeChannel || 'sms');
    setDraft('');
    setSnippetId(null);
  }, [conversation?.id, defaultComposeChannel]);

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
  const headerName = isInternalThread
    ? (conversation.title || 'Team discussion')
    : (contact ? `${contact.firstName} ${contact.lastName}` : 'Unlinked');
  const headerSub = isInternalThread
    ? 'Internal team thread'
    : (contact?.email || contact?.phone || 'No contact info');
  const initials = isInternalThread ? 'T' : initialsFor(contact);
  const avatarVariant = isInternalThread ? 3 : ((contact?.id?.length || 0) % 5) + 1;

  const composeOptions = isInternalThread
    ? [{ value: 'internal', label: 'Internal' }]
    : [
        { value: conversation.channel, label: conversation.channel === 'sms' ? 'SMS' : 'Email' },
        { value: 'internal', label: 'Internal', disabled: !canInternalComment },
      ];

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

  return (
    <section className="message-pane">
      <div className="message-pane-head">
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
          <button
            type="button"
            className={`icon-btn ${isFollowing ? 'following' : ''}`}
            onClick={onToggleFollow}
            title={isFollowing ? 'Unfollow' : 'Follow'}
            aria-label={isFollowing ? 'Unfollow' : 'Follow'}
          >
            <Icon name="bell" size={14} />
          </button>
          <AssignMenu conversation={conversation} onAssign={onAssign} disabled={!canAssign} />
          <button type="button" className="btn btn-outline btn-sm" onClick={onArchiveToggle}>
            <Icon name="archive" size={14} />
            {conversation.archived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>

      <div className="message-pane-scroll" ref={scrollRef}>
        {messages.length === 0 ? (
          <EmptyState message="No messages yet." />
        ) : messages.map((m) =>
          m.direction === 'internal'
            ? <InternalBubble key={m.id} message={m} />
            : <ChatBubble key={m.id} message={m} />
        )}
      </div>

      <form className="compose-bar" onSubmit={handleSend}>
        <div className="compose-channel-row">
          <div className="segmented segmented-sm">
            {composeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`segmented-btn ${composeChannel === opt.value ? 'active' : ''}`}
                onClick={() => setComposeChannel(opt.value)}
                disabled={opt.disabled}
                title={opt.disabled ? 'You lack permission to post internal comments' : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <SnippetPicker channel={composeChannel} onInsert={handleInsertSnippet} />
          {snippetId && <span className="text-xs text-muted">Snippet inserted</span>}
        </div>
        <div className="compose-row">
          <textarea
            className="compose-input"
            placeholder={composeChannel === 'internal'
              ? 'Internal note — only your team can see this.'
              : `Type a ${composeChannel === 'email' ? 'message' : 'text'}…  (Enter to send, Shift+Enter for newline)`}
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
