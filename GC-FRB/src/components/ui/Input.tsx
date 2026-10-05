import { forwardRef, useId, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; }
const Input = forwardRef<HTMLInputElement, Props>(({ label, error, ...rest }, ref) => {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} ref={ref} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...rest} />
      {error && <p id={`${id}-e`} className="field__error">{error}</p>}
    </div>
  );
});
export default Input;
