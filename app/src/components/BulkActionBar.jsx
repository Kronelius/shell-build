import Icon from './Icon';

// Appears at the top of the thread list when ≥1 conversation is selected.
// Bulk actions are intentionally non-destructive: "Remove from view" hides selected
// threads from the current user only. Hard-delete (creator/Super Admin) is single-thread
// only and lives in the message-panel head with a heavy warning.
export default function BulkActionBar({
  selectedCount,
  onClear,
  onMarkRead,
  onMarkUnread,
  onRemoveFromView,
  canBulk,
}) {
  return (
    <div className="bulk-action-bar" role="toolbar" aria-label="Bulk actions">
      <span className="bulk-count">
        <strong>{selectedCount}</strong> selected
      </span>
      <div className="bulk-actions">
        {canBulk && (
          <>
            <button type="button" className="btn btn-primary btn-sm" onClick={onMarkRead}>
              <Icon name="check" size={12} />
              <span>Mark read</span>
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onMarkUnread}>
              <span>Mark unread</span>
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={onRemoveFromView} title="Hide selected threads from your view (does not delete the thread)">
              <Icon name="x" size={12} />
              <span>Remove from view</span>
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
