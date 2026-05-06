import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import FormField from './FormField';
import { useDispatch } from '../store';
import { ACTIONS } from '../store/reducer';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './Toast';
import { newId } from '../lib/ids';

// New internal team thread starter. Public-by-default — every staff member sees the
// new thread regardless of role. Permission gate (messaging.startInternalThread) is
// enforced at the call site (only admin / super admin see the trigger).
export default function NewInternalThreadModal({ open, onClose }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [firstMessage, setFirstMessage] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setFirstMessage('');
    }
  }, [open]);

  const trimmedTitle = title.trim();
  const canCreate = trimmedTitle.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canCreate) return;
    const id = newId('cv');
    dispatch({
      type: ACTIONS.ADD_INTERNAL_CONVERSATION,
      id,
      title: trimmedTitle,
      firstMessage: firstMessage.trim(),
      authorUserId: currentUser?.id || null,
    });
    onClose();
    toast.success(`Thread "${trimmedTitle}" created`);
    navigate(`/messaging/${id}?inbox=internal`);
  };

  return (
    <Modal open={open} onClose={onClose} title="New team thread">
      <form onSubmit={handleSubmit}>
        <div className="text-xs text-muted" style={{ marginBottom: 12 }}>
          Visible to every staff member. Use it for ops topics like time-off requests, account
          handoffs, or one-off coordination.
        </div>

        <FormField label="Title" required>
          <input
            className="input"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Holiday schedule planning"
            maxLength={120}
          />
        </FormField>

        <FormField label="First message (optional)">
          <textarea
            className="input"
            rows={4}
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
            placeholder="Kick off the discussion…"
          />
        </FormField>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!canCreate}>
            Create thread
          </button>
        </div>
      </form>
    </Modal>
  );
}
