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
  const [dragOverStage, setDragOverStage] = useState(null);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.key, []]));
    contacts.forEach((c) => {
      if (ownerFilter !== 'all' && c.ownerUserId !== ownerFilter) return;
      if (!map[c.stage]) return;
      map[c.stage].push(c);
    });
    return map;
  }, [contacts, ownerFilter]);

  const handleDrop = (e, stageKey) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!canEdit) return;
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const current = contacts.find((c) => c.id === id);
    if (!current || current.stage === stageKey) return;
    dispatch({ type: ACTIONS.SET_CONTACT_STAGE, id, stage: stageKey });
    const label = PIPELINE_STAGES.find((s) => s.key === stageKey)?.label || stageKey;
    toast.success(`${current.firstName} ${current.lastName} → ${label}`);
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
          {canEdit ? 'Drag cards between columns to advance stages.' : 'Read-only — pipeline.edit permission required to move cards.'}
        </div>
      </div>
      <div className="pipeline-board">
        {PIPELINE_STAGES.map((stage) => {
          const cards = byStage[stage.key] || [];
          const sumValue = cards.reduce((acc, c) => acc + (c.dealValue || 0), 0);
          return (
            <div
              key={stage.key}
              className={`pipeline-col ${dragOverStage === stage.key ? 'drag-over' : ''} stage-${stage.key}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
              onDragLeave={() => setDragOverStage((s) => (s === stage.key ? null : s))}
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
                {cards.length === 0 && (
                  <div className="pipeline-col-empty">
                    <span className="text-xs text-muted">No contacts</span>
                  </div>
                )}
                {cards.map((c) => (
                  <PipelineCard
                    key={c.id}
                    contact={c}
                    onClick={(contact) => navigate(`/clients/contact/${contact.id}`)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
