'use client';

import type { AdminPublishCheckRequest, AdminPublishCheckView } from '@ltv/contracts';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, ListChecks, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { adminBrowserRequest } from '@/lib/api/client.browser';
import { AdminApiError } from '@/lib/api/errors';

export function PublishPreflightPanel({
  target,
  onReady,
}: {
  readonly target: AdminPublishCheckRequest;
  readonly onReady?: () => void;
}) {
  const check = useMutation({
    mutationFn: () =>
      adminBrowserRequest<AdminPublishCheckView>('/admin/publish-check', {
        method: 'POST',
        body: target,
      }),
    onSuccess: (result) => {
      if (result.ok) onReady?.();
    },
  });
  return (
    <section className="publish-panel" aria-live="polite">
      <div className="publish-panel__heading">
        <div>
          <p>Kiểm tra xuất bản</p>
          <h2>Sẵn sàng đưa nội dung lên website?</h2>
        </div>
        <Button
          type="button"
          variant="secondary"
          loading={check.isPending}
          icon={<ListChecks size={17} />}
          onClick={() => check.mutate()}
        >
          Kiểm tra điều kiện
        </Button>
      </div>
      {check.data?.ok ? (
        <div className="publish-result publish-result--success">
          <CheckCircle2 size={19} />
          <span>Đã đạt mọi điều kiện xuất bản.</span>
        </div>
      ) : null}
      {check.data && !check.data.ok ? (
        <div className="publish-result publish-result--danger">
          <XCircle size={19} />
          <div>
            <strong>Còn {check.data.blockers.length} mục cần hoàn thiện</strong>
            <ul>
              {check.data.blockers.map((blocker) => (
                <li key={`${blocker.field}:${blocker.message}`}>
                  <a href={`#${blocker.field}`}>{blocker.message}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {check.error ? (
        <div className="publish-result publish-result--danger" role="alert">
          <XCircle size={19} />
          <span>
            {check.error instanceof AdminApiError
              ? check.error.message
              : 'Không thể kiểm tra điều kiện xuất bản.'}
          </span>
        </div>
      ) : null}
    </section>
  );
}
