import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectPipelineContacts, selectUsers } from '../store/selectors';
import { usePermission } from '../hooks/usePermission';
import { useToast } from './Toast';
import { money } from '../lib/dates';
import PipelineCard from './PipelineCard';
import FormField from './FormField';

export const PIPELINE_STAGES = [
  { key: 'new',        label: 'New' },
  { key: 'contacted',  label: 'Contacted' },
  { key: 'qualified',  label: 'Qualified' },
  { key: 'proposal',   label: 'Proposal' },
  { key: 'won',        label: 'Won' },
  { key: 'lost',       label: 'Lost' },
];

export default function PipelineBoard() {
  const state = useStore();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const canEdit = usePermission('pipeline.edit');
  const users = selectUsers(state);
  const contacts = selectPipelineContacts(state);

  const [ownerFilter, setOwnerFilter] = useState('all');
  // { stage: string, index: number } — index is the insertion slot (0..cards.length) in that column.
  const [dropTarget, setDropTarget] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.key, []]));
    contacts.forEach((c) => {
      if (ownerFilter !== 'all' && c.ownerUserId !== ownerFilter) return;
      if (!map[c.stage]) return;
      map[c.stage].push(c);
    });
    return map;
  }, [contacts, ownerFilter]);

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
      const label = PIPELINE_STAGES.find((s) => s.key === stageKey)?.label || stageKey;
      toast.success(`${current.firstName} ${current.lastName} → ${label}`);
    }
  };

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
      </div>
      <div className="pipeline-board">
        {PIPELINE_STAGES.map((stage) => {
          const cards = byStage[stage.key] || [];
          const sumValue = cards.reduce((acc, c) => acc + (c.dealValue || 0), 0);
          const isDropTargetCol = dropTarget?.stage === stage.key;
          return (
            <div
              key={stage.key}
              className={`pipeline-col ${isDropTargetCol ? 'drag-over' : ''} stage-${stage.key}`}
              onDragOver={(e) => onColDragOver(e, stage.key)}
              onDragLeave={onColDragLeave}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <div className="pipeline-col-head">
                <div className="pipeline-col-title">{stage.label}</div>
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
                      onClick={(contact) => navigate(`/clients/contact/${contact.id}`)}
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
