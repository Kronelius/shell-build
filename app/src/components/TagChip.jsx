// Small pill rendering a single tag. Uses existing Badge color tokens.
// onRemove (optional) renders an × affordance.

export default function TagChip({ tag, onRemove, size = 'sm' }) {
  if (!tag) return null;
  const cls = `tag-chip tag-${tag.color || 'slate'} ${size === 'xs' ? 'tag-xs' : ''}`;
  return (
    <span className={cls}>
      <span className="tag-dot" aria-hidden />
      <span className="tag-label">{tag.label}</span>
      {onRemove && (
        <button
          type="button"
          className="tag-remove"
          aria-label={`Remove ${tag.label}`}
          onClick={(e) => { e.stopPropagation(); onRemove(tag); }}
        >
          ×
        </button>
      )}
    </span>
  );
}
