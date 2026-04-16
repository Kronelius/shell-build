// Thin wrapper. Consumer supplies the input/select/textarea as children,
// or uses the `as` convenience prop for simple cases.

export default function FormField({
  label,
  name,
  as = 'input',
  value,
  onChange,
  type = 'text',
  placeholder,
  options,
  required,
  error,
  help,
  rows = 3,
  children,
  ...rest
}) {
  const id = name ? `ff-${name}` : undefined;
  const inputProps = { id, name, value, onChange, placeholder, required, ...rest };

  let input = children;
  if (!input) {
    if (as === 'textarea') {
      input = <textarea className="input" rows={rows} {...inputProps} />;
    } else if (as === 'select') {
      input = (
        <select className="input" {...inputProps}>
          {options?.map((o) => (
            typeof o === 'string'
              ? <option key={o} value={o}>{o}</option>
              : <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    } else {
      input = <input className="input" type={type} {...inputProps} />;
    }
  }

  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      {label && (
        <label className="form-label" htmlFor={id}>
          {label}
          {required && <span className="form-required" aria-hidden> *</span>}
        </label>
      )}
      {input}
      {error && <div className="form-error">{error}</div>}
      {help && !error && <div className="form-help">{help}</div>}
    </div>
  );
}
