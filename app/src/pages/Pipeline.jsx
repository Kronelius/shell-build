import { useState } from 'react';
import PipelineBoard from '../components/PipelineBoard';
import StageManagerModal from '../components/StageManagerModal';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectPipelines } from '../store/selectors';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../components/Toast';

export default function Pipeline() {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const canEdit = usePermission('pipeline.edit');
  const pipelines = selectPipelines(state);

  const [manageStagesOpen, setManageStagesOpen] = useState(false);
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

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

  return (
    <>
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-head-title">Pipeline</h1>
          <p className="page-head-subtitle">
            Deals in flight. Drag contacts between stages to advance them.
          </p>
        </div>
        {canEdit && (
          <div className="page-head-actions">
            <button className="btn btn-success" onClick={() => setCreatePipelineOpen(true)}>Add Pipeline</button>
            <button className="btn btn-primary" onClick={() => setManageStagesOpen(true)}>Manage Stages</button>
          </div>
        )}
      </div>
      <PipelineBoard />

      <StageManagerModal open={manageStagesOpen} onClose={() => setManageStagesOpen(false)} />

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
    </>
  );
}
