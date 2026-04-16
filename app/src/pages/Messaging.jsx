import { useState, useMemo, useEffect, useRef } from 'react';
import TabContainer from '../components/TabContainer';
import Avatar from '../components/Avatar';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { CONVERSATIONS } from '../data/sampleData';

export default function Messaging() {
  const [channel, setChannel] = useState('All');
  const [activeId, setActiveId] = useState(CONVERSATIONS[0].id);
  const [convs, setConvs] = useLocalStorage('pp.conversations', CONVERSATIONS);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  const filtered = useMemo(() => {
    if (channel === 'All') return convs;
    return convs.filter((c) => c.channel === channel);
  }, [convs, channel]);

  const activeConv = convs.find((c) => c.id === activeId) || filtered[0] || convs[0];

  // Keep active selection valid if filter hides it.
  useEffect(() => {
    if (filtered.length && !filtered.find((c) => c.id === activeId)) {
      setActiveId(filtered[0].id);
    }
  }, [filtered, activeId]);

  // Auto-scroll chat to bottom on new messages.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeConv?.messages.length, activeId]);

  const sendMessage = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeConv) return;
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const updated = convs.map((c) =>
      c.id === activeConv.id
        ? { ...c, lastTime: 'now', messages: [...c.messages, { id: `m${Date.now()}`, direction: 'outgoing', text, time }] }
        : c
    );
    setConvs(updated);
    setDraft('');
  };

  return (
    <>
      <div className="page-head">
        <h1>Messaging</h1>
        <span className="tier-badge">Add-on</span>
      </div>
      <TabContainer
        tabs={['All', 'SMS', 'Email']}
        active={channel}
        onChange={setChannel}
        className="mb-20"
      />

      <div className="card">
        <div className="msg-layout">
          <div className="msg-list">
            {filtered.length === 0 ? (
              <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
                No conversations in this channel.
              </div>
            ) : filtered.map((c) => {
              const last = c.messages[c.messages.length - 1]?.text || '';
              return (
                <div
                  key={c.id}
                  className={`msg-item ${c.id === activeConv?.id ? 'active' : ''}`}
                  onClick={() => setActiveId(c.id)}
                >
                  <Avatar initials={c.initials} variant={c.avatar} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm font-semi">{c.client}</div>
                    <div
                      className="text-xs text-muted"
                      style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {last}
                    </div>
                  </div>
                  <div className="text-xs text-muted">{c.lastTime}</div>
                </div>
              );
            })}
          </div>

          {activeConv && (
            <div className="chat-area">
              <div className="chat-header">
                <div className="flex-row">
                  <Avatar initials={activeConv.initials} variant={activeConv.avatar} size="sm" />
                  <strong className="text-sm">{activeConv.client}</strong>
                  <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>
                    {activeConv.channel}
                  </span>
                </div>
              </div>
              <div className="chat-messages" ref={scrollRef}>
                {activeConv.messages.map((m) => (
                  <div key={m.id} className={`chat-bubble ${m.direction}`}>
                    {m.text}
                    <div className="chat-time">{m.time}</div>
                  </div>
                ))}
              </div>
              <form className="chat-compose" onSubmit={sendMessage}>
                <input
                  className="chat-input"
                  placeholder="Type a message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">Send</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
