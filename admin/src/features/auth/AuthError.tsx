import { CircleAlert } from 'lucide-react';
import { AdminApiError } from '@/lib/api/errors';

export function AuthError({ error }: { readonly error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Không thể hoàn tất yêu cầu.';
  const requestId = error instanceof AdminApiError ? error.requestId : null;
  return (
    <div className="form-error" role="alert">
      <CircleAlert size={18} aria-hidden="true" />
      <div>
        <strong>Chưa thể tiếp tục</strong>
        <p>{message}</p>
        {requestId ? <code>Mã yêu cầu: {requestId}</code> : null}
      </div>
    </div>
  );
}
