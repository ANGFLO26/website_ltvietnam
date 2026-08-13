import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: string;
  readonly error?: string | undefined;
  readonly description?: ReactNode;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, description, id: suppliedId, className = '', required, ...props },
  ref,
) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const describedBy = [description ? `${id}-description` : '', error ? `${id}-error` : '']
    .filter(Boolean)
    .join(' ');
  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={id} className="field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {description ? (
        <div id={`${id}-description`} className="field__description">
          {description}
        </div>
      ) : null}
      <input
        ref={ref}
        id={id}
        className="field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        required={required}
        {...props}
      />
      {error ? (
        <div id={`${id}-error`} className="field__error" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
});
