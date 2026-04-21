import { useState, useMemo, useRef, useEffect } from 'react';
import { useDispatch, useStore } from '../store';
import { ACTIONS } from '../store/reducer';
import { selectTags } from '../store/selectors';
import { usePermission } from '../hooks/usePermission';
import TagChip from './TagChip';

// Multi-select popover for attaching tags to a contact.
// Controlled: parent passes `value` (array of tagIds) + `onChange(tagIds)`.
// `canCreate` adds an inline "New tag" affordance.

const COLORS = ['blue', 'green', 'amber', 'red', 'slate'];

export default function TagPicker({ value = [], onChange, canCreate = true, placeholder = 'Add tag…' }) {
  const state = useStore();
  const dispatch = useDispatch();
  const allTags = selectTags(state);
  const canManage = usePermission('tags.manage');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [newColor, setNewColor] = useState('slate');
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const selected = useMemo(() => value.map((id) => allTags.find((t) => t.id === id)).filter(Boolean), [value, allTags]);

  const visibleTags = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTags.filter((t) => !q || t.label.toLowerCase().includes(q));
  }, [allTags, query]);

  const toggle = (tag) => {
    if (value.includes(tag.id)) {
      onChange(value.filter((id) => id !== tag.id));
    } else {
      onChange([...value, tag.id]);
    }
  };

  const createNew = () => {
    const label = query.trim();
    if (!label) return;
    // Simulate a round-trip: dispatch + append id once reducer creates it.
    // Since reducer uses newId, we grab the incoming snapshot synchronously.
    const fakeId = `ct_tmp_${Date.now()}`;
    dispatch({ type: ACTIONS.ADD_TAG, tag: { id: fakeId, label, color: newColor, scope: 'contact' } });
    onChange([...value, fakeId]);
    setQuery('');
  };

  return (
    <div className="tag-picker" ref={wrapRef}>
      <div className="tag-picker-row" onClick={() => setOpen(true)}>
        {selected.length === 0 && <span className="text-muted text-xs">{placeholder}</span>}
        {selected.map((t) => (
          <TagChip key={t.id} tag={t} onRemove={() => toggle(t)} />
        ))}
        <button type="button" className="tag-picker-trigger" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
          +
        </button>
      </div>
      {open && (
        <div className="tag-picker-menu">
          <input
            className="input tag-picker-search"
            placeholder="Search or create tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="tag-picker-list">
            {visibleTags.length === 0 && <div className="tag-picker-empty">No matches</div>}
            {visibleTags.map((t) => {
              const on = value.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`tag-picker-option ${on ? 'on' : ''}`}
                  onClick={() => toggle(t)}
                >
                  <TagChip tag={t} size="xs" />
                  {on && <span className="tag-check">✓</span>}
                </button>
              );
            })}
          </div>
          {canCreate && canManage && query.trim() && !allTags.some((t) => t.label.toLowerCase() === query.trim().toLowerCase()) && (
            <div className="tag-picker-create">
              <span className="text-xs text-muted">Create</span>
              <div className="tag-picker-create-row">
                <span className="tag-label-preview">“{query.trim()}”</span>
                <div className="tag-color-row">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      className={`tag-color-dot tag-color-${c} ${newColor === c ? 'selected' : ''}`}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={createNew}>Add</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
