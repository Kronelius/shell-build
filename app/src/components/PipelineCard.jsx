import { useStore } from '../store';
import { selectUserById, selectClientById, selectTagById } from '../store/selectors';
import { money, fmtDate } from '../lib/dates';
import Avatar from './Avatar';
import TagChip from './TagChip';

// Single card in the Kanban board. Draggable via native HTML5 DnD.
// Every row is always rendered (placeholder when empty) so every card has the same footprint.

export default function PipelineCard({ contact, onClick, onDragStart, onDragEnd, onDragOver, dragging = false }) {
  const state = useStore();
  const owner = contact.ownerUserId ? selectUserById(state, contact.ownerUserId) : null;
  const company = contact.companyId ? selectClientById(state, contact.companyId) : null;
  const companyName = company?.name || contact.customFields?.company || '—';
  const firstTag = contact.tagIds?.[0] ? selectTagById(state, contact.tagIds[0]) : null;

  return (
    <div
      className={`pipeline-card${dragging ? ' is-dragging' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', contact.id);
        onDragStart?.(contact);
      }}
      onDragEnd={() => onDragEnd?.()}
      onDragOver={onDragOver}
      onClick={() => onClick?.(contact)}
      role="button"
      tabIndex={0}
    >
      <div className="pipeline-card-head">
        <span className="pipeline-card-name" title={`${contact.firstName} ${contact.lastName}`}>
          {contact.firstName} {contact.lastName}
        </span>
        <span className="pipeline-card-tag-slot">
          {firstTag ? <TagChip tag={firstTag} size="xs" /> : null}
        </span>
      </div>
      <div className="pipeline-card-sub" title={companyName}>{companyName}</div>
      <div className="pipeline-card-meta">
        {contact.dealValue ? (
          <span className="pipeline-card-value">{money(contact.dealValue)}</span>
        ) : (
          <span className="pipeline-card-value pipeline-card-value-empty">—</span>
        )}
        <span className="text-xs text-muted">
          {contact.expectedCloseDate ? `Close ${fmtDate(contact.expectedCloseDate)}` : '\u00A0'}
        </span>
      </div>
      <div className="pipeline-card-owner">
        {owner ? (
          <>
            <Avatar initials={owner.initials} variant={owner.avatar} size="sm" />
            <span className="text-xs text-muted">{owner.name}</span>
          </>
        ) : (
          <span className="text-xs text-muted">Unassigned</span>
        )}
      </div>
    </div>
  );
}
