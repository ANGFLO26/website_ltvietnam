import Link from 'next/link';
import type { ReactNode } from 'react';

export interface CardProps {
  readonly title: string;
  readonly href?: string | undefined;
  readonly eyebrow?: string | null | undefined;
  readonly description?: string | null | undefined;
  readonly children?: ReactNode | undefined;
}

export function Card({ title, href, eyebrow, description, children }: CardProps) {
  const content = (
    <>
      {eyebrow === undefined || eyebrow === null ? null : (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{eyebrow}</p>
      )}
      <h3 className="mt-1 text-lg font-semibold text-slate-950">{title}</h3>
      {description === undefined || description === null ? null : (
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      )}
      {children}
    </>
  );

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(15,76,129,.12)]">
      <span
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-blue-700 to-cyan-400 transition duration-300 group-hover:scale-x-100"
        aria-hidden="true"
      />
      {href === undefined ? (
        content
      ) : (
        <Link className="block h-full no-underline" href={href}>
          {content}
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)]">
            <span>{title}</span>
            <span aria-hidden="true">&rarr;</span>
          </span>
        </Link>
      )}
    </article>
  );
}
