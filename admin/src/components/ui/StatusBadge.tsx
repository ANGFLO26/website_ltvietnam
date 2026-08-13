import type { ReactNode } from 'react';

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  readonly tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  readonly children: ReactNode;
}) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
