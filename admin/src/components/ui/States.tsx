import { CircleAlert, Inbox, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export function EmptyState({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="state-panel">
      <Inbox size={30} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  requestId,
  onRetry,
}: {
  readonly message: string;
  readonly requestId?: string | null;
  readonly onRetry?: () => void;
}) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <CircleAlert size={30} aria-hidden="true" />
      <h2>Không tải được dữ liệu</h2>
      <p>{message}</p>
      {requestId ? <code>Mã yêu cầu: {requestId}</code> : null}
      {onRetry ? (
        <Button type="button" variant="secondary" icon={<RefreshCw size={16} />} onClick={onRetry}>
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = 'Đang tải dữ liệu…' }: { readonly label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
