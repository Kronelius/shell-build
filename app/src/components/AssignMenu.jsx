import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';
import { useStore } from '../store';
import { selectActiveUsers, selectUserById } from '../store/selectors';

// Compact dropdown for picking an assignee. Disabled renders as a read-only label.
export default function AssignMenu({ conversation, onAssign, disabled = false }) {
  const state = useStore();
  const users = selectActiveUsers(state);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const assignee = conversation?.assignedUserId ? selectUserById(state, conversation.assignedUserId) : null;

  const pick = (userId) => {
    onAssign(userId);
    setOpen(false);
  };

  return (
    <div className="assign-menu" ref={wrapRef}>
      <button
        type="button"
        className={`btn btn-outline btn-sm assign-trigger ${assignee ? 'has-assignee' : ''}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        title={disabled ? 'You lack permission to assign conversations' : 'Assign this conversation'}
      >
        {assignee ? (
          <>
            <Avatar initials={assignee.initials} variant={assignee.avatar} size="xs" />
            <span>{assignee.name.split(' ')[0]}</span>
          </>
        ) : (
          <>
            <Icon name="user" size={14} />
            <span>Unassigned</span>
          </>
        )}
        {!disabled && <span className="assign-caret">▾</span>}
      </button>
      {open && (
        <div className="assign-popover">
          <button
            type="button"
            className={`assign-option ${!assignee ? 'on' : ''}`}
            onClick={() => pick(null)}
          >
            <span className="assign-unassigned-dot" aria-hidden />
            <span>Unassigned</span>
            {!assignee && <Icon name="check" size={12} />}
          </button>
          <div className="assign-divider" aria-hidden />
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              className={`assign-option ${assignee?.id === u.id ? 'on' : ''}`}
              onClick={() => pick(u.id)}
            >
              <Avatar initials={u.initials} variant={u.avatar} size="xs" />
              <span>{u.name}</span>
              {assignee?.id === u.id && <Icon name="check" size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
