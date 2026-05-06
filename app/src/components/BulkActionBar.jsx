import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';
import { useStore } from '../store';
import { selectActiveUsers } from '../store/selectors';

// Appears at the top of the thread list when ≥1 conversation is selected.
// Action set varies by inbox: internal team threads expose Mark read / Mark unread / Delete only
// (assignment doesn't apply to staff-wide threads). External (Inbox) shows Assign + the three.
export default function BulkActionBar({
  selectedCount,
  onClear,
  onAssign,
  onMarkRead,
  onMarkUnread,
  onDelete,
  canAssign,
  canBulk,
  inbox = 'inbox',
}) {
  const state = useStore();
  const users = selectActiveUsers(state);
  const [assignOpen, setAssignOpen] = useState(false);
  const wrapRef = useRef(null);

  const showAssign = canAssign && inbox !== 'internal';

  useEffect(() => {
    if (!assignOpen) return;
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAssignOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setAssignOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [assignOpen]);

  const assignTo = (userId) => {
    onAssign(userId);
    setAssignOpen(false);
  };

  return (
    <div className="bulk-action-bar" role="toolbar" aria-label="Bulk actions">
      <span className="bulk-count">
        <strong>{selectedCount}</strong> selected
      </span>
      <div className="bulk-actions">
        {showAssign && (
          <div className="bulk-assign-wrap" ref={wrapRef}>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAssignOpen((v) => !v)}>
              <Icon name="user" size={12} />
              <span>Assign</span>
              <span className="bulk-caret">▾</span>
            </button>
            {assignOpen && (
              <div className="bulk-assign-popover">
                <button type="button" className="assign-option" onClick={() => assignTo(null)}>
                  <span className="assign-unassigned-dot" aria-hidden />
                  <span>Unassigned</span>
                </button>
                <div className="assign-divider" aria-hidden />
                {users.map((u) => (
                  <button key={u.id} type="button" className="assign-option" onClick={() => assignTo(u.id)}>
                    <Avatar initials={u.initials} variant={u.avatar} size="xs" />
                    <span>{u.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {canBulk && (
          <>
            <button type="button" className="btn btn-primary btn-sm" onClick={onMarkRead}>
              <Icon name="check" size={12} />
              <span>Mark read</span>
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onMarkUnread}>
              <span>Mark unread</span>
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
              <Icon name="trash" size={12} />
              <span>Delete</span>
            </button>
          </>
        )}
        <button type="button" className="btn btn-outline btn-sm bulk-clear" onClick={onClear} title="Clear selection">
          <Icon name="x" size={12} />
        </button>
      </div>
    </div>
  );
}
