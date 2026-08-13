'use client';

import { ErrorState } from '@/components/ui/States';
import { AdminApiError } from '@/lib/api/errors';

export default function ProtectedError({
  error,
  reset,
}: {
  readonly error: Error;
  readonly reset: () => void;
}) {
  return (
    <ErrorState
      message={error.message}
      requestId={error instanceof AdminApiError ? error.requestId : null}
      onRetry={reset}
    />
  );
}
