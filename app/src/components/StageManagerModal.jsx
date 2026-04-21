import { useEffect, useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import Icon from './Icon';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectPipelineStages, selectContactsByStageKey } from '../store/selectors';
import { useToast } from './Toast';

// Inline-editable row. Owns its own input state so blurs don't thrash the whole modal.
function StageRow({ stage, count, index, total, onRename, onMove, onDelete }) {
  const [label, setLabel] = useState(stage.label);

  useEffect(() => { setLabel(stage.label); }, [stage.label]);

  const commit = () => {
    const trimmed = label.trim();
    if (!trimmed || trimmed === stage.label) { setLabel(stage.label); return; }
    onRename(stage.id, trimmed);
  };

  const blockDelete = count > 0;

  return (
    <div className="stage-row">
      <div className="stage-row-order">
        <button
          className="btn-icon-sm"
          disabled={index === 0}
          onClick={() => onMove(stage.id, -1)}
          aria-label="Move up"
          title="Move up"
        >↑</button>
        <button
          className="btn-icon-sm"
          disabled={index === total - 1}
          onClick={() => onMove(stage.id, 1)}
          aria-label="Move down"
          title="Move down"
        >↓</button>
      </div>
      <input
        className="input stage-row-label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setLabel(stage.label); e.currentTarget.blur(); } }}
      />
      <span className="stage-row-count text-xs text-muted">
        {count} contact{count === 1 ? '' : 's'}
      </span>
      <button
        className="btn-icon-sm stage-row-delete"
        disabled={blockDelete}
        onClick={() => onDelete(stage)}
        aria-label="Delete stage"
        title={blockDelete ? `Move the ${count} contact${count === 1 ? '' : 's'} out of this stage first` : 'Delete stage'}
      >
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
}

export default function StageManagerModal({ open, onClose }) {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const stages = selectPipelineStages(state);

  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    if (!open) setNewLabel('');
  }, [open]);

  const rename = (id, label) => {
    dispatch({ type: ACTIONS.UPDATE_PIPELINE_STAGE, id, patch: { label } });
  };

  const move = (id, delta) => {
    const i = stages.findIndex((s) => s.id === id);
    if (i < 0) return;
    const j = i + delta;
    if (j < 0 || j >= stages.length) return;
    const next = stages.slice();
    [next[i], next[j]] = [next[j], next[i]];
    dispatch({ type: ACTIONS.REORDER_PIPELINE_STAGES, ids: next.map((s) => s.id) });
  };

  const remove = (stage) => {
    const count = selectContactsByStageKey(state, stage.key).length;
    if (count > 0) {
      toast.error(`"${stage.label}" has ${count} contact${count === 1 ? '' : 's'} — move them out first.`);
      return;
    }
    dispatch({ type: ACTIONS.DELETE_PIPELINE_STAGE, id: stage.id });
    toast.success(`Stage "${stage.label}" deleted`);
  };

  const add = (e) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    if (stages.some((s) => s.label.toLowerCase() === label.toLowerCase())) {
      toast.error(`A stage named "${label}" already exists.`);
      return;
    }
    dispatch({ type: ACTIONS.ADD_PIPELINE_STAGE, label });
    toast.success(`Stage "${label}" added`);
    setNewLabel('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage Pipeline Stages">
      <p className="text-sm text-muted" style={{ marginTop: 0, marginBottom: 12 }}>
        Rename, reorder, add, or delete stages. Delete is blocked while a stage has contacts in it.
      </p>
      <div className="stage-list">
        {stages.map((stage, i) => (
          <StageRow
            key={stage.id}
            stage={stage}
            index={i}
            total={stages.length}
            count={selectContactsByStageKey(state, stage.key).length}
            onRename={rename}
            onMove={move}
            onDelete={remove}
          />
        ))}
      </div>

      <form onSubmit={add} className="stage-add">
        <FormField
          label=""
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New stage name (e.g. Negotiating)"
        />
        <button type="submit" className="btn btn-outline btn-sm" disabled={!newLabel.trim()}>
          <Icon name="plus" size={14} /> Add stage
        </button>
      </form>

      <div className="modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
