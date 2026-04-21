// 3-way visibility segmented control.

const OPTIONS = [
  { value: 'org',     label: 'Organization', hint: 'Everyone with Contacts access' },
  { value: 'team',    label: 'Team',         hint: 'Admins + anyone with view-all' },
  { value: 'private', label: 'Private',      hint: 'Only the owner + Super Admin' },
];

export default function VisibilitySelect({ value = 'org', onChange }) {
  return (
    <div className="visibility-select" role="radiogroup" aria-label="Visibility">
      {OPTIONS.map((opt) => {
        const on = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={`visibility-option ${on ? 'on' : ''}`}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
