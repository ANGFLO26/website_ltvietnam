import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label: string;
  readonly description?: string | undefined;
  readonly error?: string | undefined;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, description, error, id: suppliedId, className = '', children, ...props },
  ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return (
    <div className={`field ${className}`.trim()}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        className="field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [description ? `${id}-description` : '', error ? `${id}-error` : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
        {...props}
      >
        {children}
      </select>
      {description ? (
        <small id={`${id}-description`} className="field__description">
          {description}
        </small>
      ) : null}
      {error ? (
        <div id={`${id}-error`} className="field__error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
});
