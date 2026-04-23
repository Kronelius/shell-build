import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFromHere } from '../hooks/useFromHere';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectPipelineContacts, selectUsers, selectPipelineStages } from '../store/selectors';
import { usePermission } from '../hooks/usePermission';
import { useToast } from './Toast';
import { money } from '../lib/dates';
import PipelineCard from './PipelineCard';
import FormField from './FormField';
import Icon from './Icon';
import StageManagerModal from './StageManagerModal';

export default function PipelineBoard() {
  const state = useStore();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const nav = useFromHere();
  const toast = useToast();
  const canEdit = usePermission('pipeline.edit');
  const canAssignOwner = usePermission('contacts.assignOwner');
  const canDelete = usePermission('contacts.delete');
  const users = selectUsers(state);
  const contacts = selectPipelineContacts(state);
  const stages = selectPipelineStages(state);

  const [ownerFilter, setOwnerFilter] = useState('all');
  const [manageStagesOpen, setManageStagesOpen] = useState(false);
  // { stage: string, index: number } — index is the insertion slot (0..cards.length) in that column.
  const [dropTarget, setDropTarget] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  // Multi-select for bulk actions.
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const byStage = useMemo(() => {
    const map = Object.fromEntries(stages.map((s) => [s.key, []]));
    contacts.forEach((c) => {
      if (ownerFilter !== 'all' && c.ownerUserId !== ownerFilter) return;
      if (!map[c.stage]) return;
      map[c.stage].push(c);
    });
    return map;
  }, [contacts, ownerFilter, stages]);

  const visibleIds = useMemo(() => {
    const out = new Set();
    stages.forEach((s) => (byStage[s.key] || []).forEach((c) => out.add(c.id)));
    return out;
  }, [byStage]);

  // Drop new/prune selection to only contain currently-visible cards
  // (e.g. owner filter change removes cards from view).
  const effectiveSelected = useMemo(() => {
    const out = new Set();
    selectedIds.forEach((id) => { if (visibleIds.has(id)) out.add(id); });
    return out;
  }, [selectedIds, visibleIds]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectStage = (stageKey) => {
    const cards = byStage[stageKey] || [];
    const allChecked = cards.length > 0 && cards.every((c) => effectiveSelected.has(c.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) cards.forEach((c) => next.delete(c.id));
      else cards.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkMoveStage = (stageKey) => {
    if (!stageKey || !canEdit) return;
    effectiveSelected.forEach((id) => {
      dispatch({ type: ACTIONS.SET_CONTACT_STAGE, id, stage: stageKey });
    });
    const label = stages.find((s) => s.key === stageKey)?.label || stageKey;
    toast.success(`Moved ${effectiveSelected.size} to ${label}`);
    clearSelection();
  };

  const bulkAssignOwner = (userId) => {
    if (!canAssignOwner) return;
    const resolved = userId === 'unassigned' ? null : userId;
    effectiveSelected.forEach((id) => {
      dispatch({ type: ACTIONS.ASSIGN_CONTACT_OWNER, id, userId: resolved });
    });
    toast.success(`Owner assigned to ${effectiveSelected.size} contact${effectiveSelected.size === 1 ? '' : 's'}`);
    clearSelection();
  };

  const bulkArchive = () => {
    if (!canDelete) return;
    const count = effectiveSelected.size;
    effectiveSelected.forEach((id) => {
      dispatch({ type: ACTIONS.ARCHIVE_CONTACT, id });
    });
    toast.success(`Archived ${count} contact${count === 1 ? '' : 's'}`);
    clearSelection();
  };

  // Decide whether the drop-slot should render before card at index `i` in stage `stageKey`.
  const slotActive = (stageKey, i) =>
    dropTarget && dropTarget.stage === stageKey && dropTarget.index === i;

  const clearDrag = () => {
    setDropTarget(null);
    setDraggingId(null);
  };

  // Card-level drag-over: pick before/after this card based on mouse Y vs card midpoint.
  const onCardDragOver = (e, stageKey, cardIndex) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const index = before ? cardIndex : cardIndex + 1;
    setDropTarget((prev) => (prev && prev.stage === stageKey && prev.index === index ? prev : { stage: stageKey, index }));
  };

  // Column-level drag-over only fires in empty space (card handlers stop propagation) → drop at end.
  const onColDragOver = (e, stageKey) => {
    if (!canEdit) return;
    e.preventDefault();
    const endIndex = (byStage[stageKey] || []).length;
    setDropTarget((prev) => (prev && prev.stage === stageKey && prev.index === endIndex ? prev : { stage: stageKey, index: endIndex }));
  };

  const onColDragLeave = (e) => {
    // Only clear when the cursor truly leaves the column (not when it moves into a child card).
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget((prev) => (prev ? null : prev));
    }
  };

  const handleDrop = (e, stageKey) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const target = dropTarget;
    clearDrag();
    if (!canEdit || !id) return;
    const current = contacts.find((c) => c.id === id);
    if (!current) return;

    // Resolve the insertion anchor: the contact currently at the target index in the target stage (if any).
    const stageCards = (byStage[stageKey] || []).filter((c) => c.id !== id);
    const targetIndex = target && target.stage === stageKey ? target.index : stageCards.length;
    const insertBeforeId = targetIndex < stageCards.length ? stageCards[targetIndex].id : null;

    // Skip no-op: same stage AND would land in the same visual position.
    if (current.stage === stageKey) {
      const beforeOriginal = (byStage[stageKey] || []);
      const originalIdx = beforeOriginal.findIndex((c) => c.id === id);
      if (originalIdx === targetIndex || originalIdx === targetIndex - 1) return;
    }

    dispatch({ type: ACTIONS.SET_CONTACT_STAGE, id, stage: stageKey, insertBeforeId });
    if (current.stage !== stageKey) {
      const label = stages.find((s) => s.key === stageKey)?.label || stageKey;
      toast.success(`${current.firstName} ${current.lastName} → ${label}`);
    }
  };

  const selectionCount = effectiveSelected.size;

  return (
    <div className="pipeline-wrap">
      <div className="pipeline-toolbar">
        <FormField
          label="Owner"
          as="select"
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          options={[{ value: 'all', label: 'All owners' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
        />
        <div className="pipeline-hint text-xs text-muted">
          {canEdit ? 'Drag cards between columns to advance stages. Drop between cards to reorder.' : 'Read-only — pipeline.edit permission required to move cards.'}
        </div>
        {canEdit && (
          <button className="btn btn-outline btn-sm" onClick={() => setManageStagesOpen(true)}>
            <Icon name="settings" size={14} /> Manage Stages
          </button>
        )}
      </div>

      {selectionCount > 0 && (
        <div className="bulk-bar">
          <span className="text-sm font-semi">{selectionCount} selected</span>
          <div style={{ flex: 1 }} />
          {canEdit && (
            <FormField
              label=""
              as="select"
              value=""
              onChange={(e) => bulkMoveStage(e.target.value)}
              options={[{ value: '', label: 'Move to stage…' }, ...stages.map((s) => ({ value: s.key, label: s.label }))]}
            />
          )}
          {canAssignOwner && (
            <FormField
              label=""
              as="select"
              value=""
              onChange={(e) => bulkAssignOwner(e.target.value)}
              options={[{ value: '', label: 'Assign owner…' }, { value: 'unassigned', label: 'Unassigned' }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
            />
          )}
          {canDelete && (
            <button className="btn btn-outline btn-sm" onClick={bulkArchive}>Archive</button>
          )}
          <button className="btn btn-outline btn-sm" onClick={clearSelection}>Cancel</button>
        </div>
      )}

      <StageManagerModal open={manageStagesOpen} onClose={() => setManageStagesOpen(false)} />

      <div className="pipeline-board">
        {stages.map((stage) => {
          const cards = byStage[stage.key] || [];
          const sumValue = cards.reduce((acc, c) => acc + (c.dealValue || 0), 0);
          const isDropTargetCol = dropTarget?.stage === stage.key;
          const stageSelectedCount = cards.filter((c) => effectiveSelected.has(c.id)).length;
          const allSelected = cards.length > 0 && stageSelectedCount === cards.length;
          const someSelected = stageSelectedCount > 0 && !allSelected;
          return (
            <div
              key={stage.key}
              className={`pipeline-col ${isDropTargetCol ? 'drag-over' : ''} stage-${stage.key}`}
              onDragOver={(e) => onColDragOver(e, stage.key)}
              onDragLeave={onColDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <div className="pipeline-col-head">
                <div className="pipeline-col-title">
                  {cards.length > 0 && (
                    <input
                      type="checkbox"
                      className="pipeline-col-check"
                      aria-label={`Select all in ${stage.label}`}
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={() => toggleSelectStage(stage.key)}
                    />
                  )}
                  {stage.label}
                </div>
                <div className="pipeline-col-meta">
                  <span className="pipeline-col-count">{cards.length}</span>
                  <span className="pipeline-col-sum">{money(sumValue)}</span>
                </div>
              </div>
              <div className="pipeline-col-body">
                {cards.length === 0 && !slotActive(stage.key, 0) && (
                  <div className="pipeline-col-empty">
                    <span className="text-xs text-muted">No contacts</span>
                  </div>
                )}
                {cards.length === 0 && slotActive(stage.key, 0) && (
                  <div className="pipeline-drop-slot" aria-hidden="true" />
                )}
                {cards.map((c, i) => (
                  <div key={c.id} className="pipeline-card-wrap">
                    {slotActive(stage.key, i) && <div className="pipeline-drop-slot" aria-hidden="true" />}
                    <PipelineCard
                      contact={c}
                      dragging={draggingId === c.id}
                      selected={effectiveSelected.has(c.id)}
                      onToggleSelect={toggleSelect}
                      onClick={(contact) => navigate(`/clients/contact/${contact.id}`, { state: nav })}
                      onDragStart={(contact) => setDraggingId(contact.id)}
                      onDragEnd={clearDrag}
                      onDragOver={(e) => onCardDragOver(e, stage.key, i)}
                    />
                    {i === cards.length - 1 && slotActive(stage.key, cards.length) && (
                      <div className="pipeline-drop-slot" aria-hidden="true" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
