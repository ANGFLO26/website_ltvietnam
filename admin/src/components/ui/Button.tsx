import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  readonly loading?: boolean;
  readonly icon?: ReactNode;
}

export function Button({
  variant = 'primary',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button--${variant} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="button__spinner" aria-hidden="true" /> : icon}
      <span>{loading ? 'Đang xử lý…' : children}</span>
    </button>
  );
}
