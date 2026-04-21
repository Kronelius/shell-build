import { useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import Icon from './Icon';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectMessageFolders } from '../store/selectors';
import { useToast } from './Toast';

const COLOR_OPTIONS = ['red', 'amber', 'green', 'blue', 'purple', 'slate'];

export default function FolderManager({ open, onClose }) {
  const state = useStore();
  const dispatch = useDispatch();
  const toast = useToast();
  const folders = selectMessageFolders(state);

  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('slate');

  const addFolder = (e) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    if (folders.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
      toast.error('A folder with that name already exists');
      return;
    }
    dispatch({ type: ACTIONS.ADD_MESSAGE_FOLDER, folder: { label, color: newColor } });
    setNewLabel('');
    setNewColor('slate');
  };

  const renameFolder = (folder, nextLabel) => {
    const label = nextLabel.trim();
    if (!label || label === folder.label) return;
    dispatch({ type: ACTIONS.UPDATE_MESSAGE_FOLDER, id: folder.id, patch: { label } });
  };

  const recolor = (folder, color) => {
    dispatch({ type: ACTIONS.UPDATE_MESSAGE_FOLDER, id: folder.id, patch: { color } });
  };

  const remove = (folder) => {
    if (!window.confirm(`Delete folder "${folder.label}"? Conversations will lose this folder tag.`)) return;
    dispatch({ type: ACTIONS.DELETE_MESSAGE_FOLDER, id: folder.id });
    toast.success('Folder deleted');
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage folders">
      <form onSubmit={addFolder} className="folder-add-row">
        <FormField label="New folder" name="newFolder">
          <input
            className="input"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Follow-ups"
          />
        </FormField>
        <div className="folder-color-row">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              className={`folder-color-dot folder-color-${c} ${newColor === c ? 'selected' : ''}`}
              aria-label={`Color ${c}`}
              onClick={() => setNewColor(c)}
            />
          ))}
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!newLabel.trim()}>
          <Icon name="plus" size={12} />
          Add folder
        </button>
      </form>

      <div className="folder-list">
        {folders.length === 0 ? (
          <div className="text-muted text-sm">No folders yet.</div>
        ) : folders.map((f) => (
          <div key={f.id} className="folder-row">
            <div className="folder-color-row">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`folder-color-dot folder-color-${c} ${f.color === c ? 'selected' : ''}`}
                  aria-label={`Set ${f.label} to ${c}`}
                  onClick={() => recolor(f, c)}
                />
              ))}
            </div>
            <input
              className="input folder-rename-input"
              defaultValue={f.label}
              onBlur={(e) => renameFolder(f, e.target.value)}
            />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => remove(f)}>
              <Icon name="trash" size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
