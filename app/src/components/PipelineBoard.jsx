import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFromHere } from '../hooks/useFromHere';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectPipelineContacts, selectPipelineStages, selectPipelines, selectActivePipeline } from '../store/selectors';
import { usePermission } from '../hooks/usePermission';
import { money } from '../lib/dates';
import PipelineCard from './PipelineCard';
import FormField from './FormField';
import Icon from './Icon';
import StageManagerModal from './StageManagerModal';
import AddContactsToStageModal from './AddContactsToStageModal';
import Modal from './Modal';
import { useToast } from './Toast';

const EDGE_ZONE = 80;
const MAX_SPEED = 18;
const MIN_SPEED = 3;

export default function PipelineBoard() {
  const state = useStore();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const nav = useFromHere();
  const toast = useToast();
  const canEdit = usePermission('pipeline.edit');
  const canDelete = usePermission('contacts.delete');
  const contacts = selectPipelineContacts(state);
  const stages = selectPipelineStages(state);
  const pipelines = selectPipelines(state);
  const activePipeline = selectActivePipeline(state);

  const [manageStagesOpen, setManageStagesOpen] = useState(false);
  const [dropTarget, setDropTarget] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [addContactsStage, setAddContactsStage] = useState(null);

  // Auto-scroll refs
  const boardRef = useRef(null);
  const scrollRafRef = useRef(null);
  const scrollVelocityRef = useRef(0);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(stages.map((s) => [s.key, []]));
    contacts.forEach((c) => {
      if (!map[c.stage]) return;
      map[c.stage].push(c);
    });
    return map;
  }, [contacts, stages]);

  const visibleIds = useMemo(() => {
    const out = new Set();
    stages.forEach((s) => (byStage[s.key] || []).forEach((c) => out.add(c.id)));
    return out;
  }, [byStage]);

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
      dispatch({ type: ACTIONS.SET_CONTACT_STAGE, id, stage: stageKey, pipelineId: activePipeline?.id });
    });
    clearSelection();
  };

  const bulkDelete = () => {
    if (!canDelete) return;
    effectiveSelected.forEach((id) => {
      dispatch({ type: ACTIONS.DELETE_CONTACT, id });
    });
    clearSelection();
  };

  const slotActive = (stageKey, i) =>
    dropTarget && dropTarget.stage === stageKey && dropTarget.index === i;

  // --- Auto-scroll ---
  const updateAutoScroll = (clientX) => {
    const el = boardRef.current;
    if (!el) { scrollVelocityRef.current = 0; return; }
    const rect = el.getBoundingClientRect();
    const leftDist = clientX - rect.left;
    const rightDist = rect.right - clientX;
    if (leftDist < EDGE_ZONE && el.scrollLeft > 0) {
      const ratio = 1 - (leftDist / EDGE_ZONE);
      scrollVelocityRef.current = -(MIN_SPEED + ratio * (MAX_SPEED - MIN_SPEED));
    } else if (rightDist < EDGE_ZONE && el.scrollLeft < el.scrollWidth - el.clientWidth) {
      const ratio = 1 - (rightDist / EDGE_ZONE);
      scrollVelocityRef.current = MIN_SPEED + ratio * (MAX_SPEED - MIN_SPEED);
    } else {
      scrollVelocityRef.current = 0;
    }
  };

  const startScrollLoop = () => {
    if (scrollRafRef.current) return;
    const tick = () => {
      const el = boardRef.current;
      if (el && scrollVelocityRef.current !== 0) {
        el.scrollLeft += scrollVelocityRef.current;
      }
      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);
  };

  const stopScrollLoop = () => {
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
    scrollVelocityRef.current = 0;
  };

  const clearDrag = () => {
    setDropTarget(null);
    setDraggingId(null);
    stopScrollLoop();
  };

  const onCardDragOver = (e, stageKey, cardIndex) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    updateAutoScroll(e.clientX);
    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const index = before ? cardIndex : cardIndex + 1;
    setDropTarget((prev) => (prev && prev.stage === stageKey && prev.index === index ? prev : { stage: stageKey, index }));
  };

  const onColDragOver = (e, stageKey) => {
    if (!canEdit) return;
    e.preventDefault();
    updateAutoScroll(e.clientX);
    const endIndex = (byStage[stageKey] || []).length;
    setDropTarget((prev) => (prev && prev.stage === stageKey && prev.index === endIndex ? prev : { stage: stageKey, index: endIndex }));
  };

  const onColDragLeave = (e) => {
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

    const stageCards = (byStage[stageKey] || []).filter((c) => c.id !== id);
    const targetIndex = target && target.stage === stageKey ? target.index : stageCards.length;
    const insertBeforeId = targetIndex < stageCards.length ? stageCards[targetIndex].id : null;

    if (current.stage === stageKey) {
      const beforeOriginal = (byStage[stageKey] || []);
      const originalIdx = beforeOriginal.findIndex((c) => c.id === id);
      if (originalIdx === targetIndex || originalIdx === targetIndex - 1) return;
    }

    dispatch({ type: ACTIONS.SET_CONTACT_STAGE, id, stage: stageKey, pipelineId: activePipeline?.id, insertBeforeId });
  };

  const handleCreatePipeline = (e) => {
    e.preventDefault();
    const label = newPipelineName.trim();
    if (!label) return;
    if (pipelines.some((p) => p.label.toLowerCase() === label.toLowerCase())) {
      toast.error(`A pipeline named "${label}" already exists.`);
      return;
    }
    dispatch({ type: ACTIONS.ADD_PIPELINE, label });
    toast.success(`Pipeline "${label}" created and saved`);
    setNewPipelineName('');
    setCreatePipelineOpen(false);
  };

  const selectionCount = effectiveSelected.size;

  return (
    <div className="pipeline-wrap">
      <div className="pipeline-toolbar">
        <FormField
          label="Pipeline"
          as="select"
          value={activePipeline?.id || ''}
          onChange={(e) => dispatch({ type: ACTIONS.SET_ACTIVE_PIPELINE, id: e.target.value })}
          options={pipelines.map((p) => ({ value: p.id, label: p.label }))}
        />
        {canEdit && (
          <div className="pipeline-toolbar-actions">
            <button className="btn btn-success" onClick={() => setCreatePipelineOpen(true)}>Add Pipeline</button>
            <button className="btn btn-primary" onClick={() => setManageStagesOpen(true)}>Manage Stages</button>
          </div>
        )}
      </div>

      <div className={`bulk-bar ${selectionCount === 0 ? 'is-empty' : ''}`}>
        <span className="text-sm font-semi">
          {selectionCount > 0 ? `${selectionCount} selected` : 'Select cards for bulk actions'}
        </span>
        {selectionCount > 0 && (
          <>
            {canEdit && (
              <FormField
                label=""
                as="select"
                value=""
                onChange={(e) => bulkMoveStage(e.target.value)}
                options={[{ value: '', label: 'Move to stage…' }, ...stages.map((s) => ({ value: s.key, label: s.label }))]}
              />
            )}
            {canDelete && (
              <button className="btn btn-danger btn-sm" onClick={bulkDelete}>Delete</button>
            )}
            <button className="btn btn-outline btn-sm" onClick={clearSelection}>Cancel</button>
          </>
        )}
      </div>

      <StageManagerModal open={manageStagesOpen} onClose={() => setManageStagesOpen(false)} />

      <AddContactsToStageModal
        open={!!addContactsStage}
        onClose={() => setAddContactsStage(null)}
        pipelineId={activePipeline?.id}
        stageKey={addContactsStage?.key}
        stageLabel={addContactsStage?.label || ''}
      />

      <Modal open={createPipelineOpen} onClose={() => setCreatePipelineOpen(false)} title="Create Pipeline" size="sm">
        <form onSubmit={handleCreatePipeline}>
          <FormField
            label="Pipeline name"
            value={newPipelineName}
            onChange={(e) => setNewPipelineName(e.target.value)}
            placeholder="e.g. Recruiting, Partnerships"
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setCreatePipelineOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!newPipelineName.trim()}>Create</button>
          </div>
        </form>
      </Modal>

      <div
        className="pipeline-board"
        ref={boardRef}
        style={{ '--pipeline-col-count': stages.length || 1 }}
        onDragOver={(e) => { e.preventDefault(); updateAutoScroll(e.clientX); }}
        onDragEnter={() => startScrollLoop()}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) stopScrollLoop(); }}
      >
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
                  <span className="pipeline-col-label">{stage.label}</span>
                </div>
                <div className="pipeline-col-meta">
                  <span className="pipeline-col-count">{cards.length}</span>
                  <span className="pipeline-col-sum">{money(sumValue)}</span>
                </div>
              </div>
              <div className="pipeline-col-body">
                {cards.length === 0 && !slotActive(stage.key, 0) && (
                  canEdit ? (
                    <button
                      type="button"
                      className="pipeline-col-empty pipeline-col-empty-clickable"
                      onClick={() => setAddContactsStage({ key: stage.key, label: stage.label })}
                    >
                      Add Contacts
                    </button>
                  ) : (
                    <div className="pipeline-col-empty">
                      <span className="text-xs text-muted">No contacts</span>
                    </div>
                  )
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
