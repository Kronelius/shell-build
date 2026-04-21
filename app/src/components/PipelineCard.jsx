import { useStore } from '../store';
import { selectUserById, selectClientById, selectTagById } from '../store/selectors';
import { money, fmtDate } from '../lib/dates';
import Avatar from './Avatar';
import TagChip from './TagChip';

// Single card in the Kanban board. Draggable via native HTML5 DnD.
// Parent passes onClick for navigation + onDragStart to track which card is moving.

export default function PipelineCard({ contact, onClick, onDragStart, onDragEnd }) {
  const state = useStore();
  const owner = contact.ownerUserId ? selectUserById(state, contact.ownerUserId) : null;
  const company = contact.companyId ? selectClientById(state, contact.companyId) : null;
  const companyName = company?.name || contact.customFields?.company || '—';
  const firstTag = contact.tagIds?.[0] ? selectTagById(state, contact.tagIds[0]) : null;

  return (
    <div
      className="pipeline-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', contact.id);
        onDragStart?.(contact);
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={() => onClick?.(contact)}
      role="button"
      tabIndex={0}
    >
      <div className="pipeline-card-head">
        <span className="pipeline-card-name">{contact.firstName} {contact.lastName}</span>
        {firstTag && <TagChip tag={firstTag} size="xs" />}
      </div>
      <div className="pipeline-card-sub">{companyName}</div>
      <div className="pipeline-card-meta">
        {contact.dealValue ? <span className="pipeline-card-value">{money(contact.dealValue)}</span> : <span className="text-xs text-muted">—</span>}
        {contact.expectedCloseDate && <span className="text-xs text-muted">Close {fmtDate(contact.expectedCloseDate)}</span>}
      </div>
      {owner && (
        <div className="pipeline-card-owner">
          <Avatar initials={owner.initials} variant={owner.avatar} size="sm" />
          <span className="text-xs text-muted">{owner.name}</span>
        </div>
      )}
    </div>
  );
}
