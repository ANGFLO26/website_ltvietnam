import type { ReactNode } from 'react';

export function FormSection({
  id,
  title,
  description,
  children,
}: {
  readonly id?: string;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}) {
  return (
    <section id={id} className="form-section panel">
      <header className="form-section__header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="form-section__body">{children}</div>
    </section>
  );
}
