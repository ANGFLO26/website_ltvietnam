import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  readonly label: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, id: suppliedId, className = '', ...props },
  ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <label className={`checkbox ${className}`.trim()} htmlFor={id}>
      <input ref={ref} id={id} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
});
