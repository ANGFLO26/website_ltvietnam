'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArchiveRestore, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { adminBrowserRequest } from '@/lib/api/client.browser';
import { AdminApiError } from '@/lib/api/errors';

type Action = 'publish' | 'hide' | 'delete' | 'restore';

export function LifecycleActions({
  resourcePath,
  status,
  deleted = false,
  returnTo,
  queryKey,
  allowPublish = true,
}: {
  readonly resourcePath: string;
  readonly status: string;
  readonly deleted?: boolean;
  readonly returnTo?: string;
  readonly queryKey: readonly unknown[];
  readonly allowPublish?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState<Action | null>(null);
  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (action === 'delete') {
        return adminBrowserRequest<void>(resourcePath, { method: 'DELETE' });
      }
      return adminBrowserRequest(`${resourcePath}/${action}`, { method: 'POST' });
    },
    onSuccess: async (_data, action) => {
      await queryClient.invalidateQueries({ queryKey });
      toast.show(actionMessage(action), 'success');
      setConfirming(null);
      if (action === 'delete' && returnTo) router.push(returnTo);
      else router.refresh();
    },
    onError: (error) => {
      toast.show(
        error instanceof AdminApiError ? error.message : 'Không thể thực hiện thao tác.',
        'danger',
      );
      setConfirming(null);
    },
  });

  if (deleted) {
    return (
      <Button
        type="button"
        variant="secondary"
        icon={<ArchiveRestore size={17} />}
        loading={mutation.isPending}
        onClick={() => mutation.mutate('restore')}
      >
        Khôi phục
      </Button>
    );
  }

  return (
    <div className="lifecycle-actions">
      {allowPublish && status !== 'published' ? (
        <Button type="button" icon={<Eye size={17} />} onClick={() => setConfirming('publish')}>
          Xuất bản
        </Button>
      ) : null}
      {status === 'published' ? (
        <Button
          type="button"
          variant="secondary"
          icon={<EyeOff size={17} />}
          onClick={() => setConfirming('hide')}
        >
          Ẩn
        </Button>
      ) : null}
      <Button
        type="button"
        variant="danger"
        icon={<Trash2 size={17} />}
        onClick={() => setConfirming('delete')}
      >
        Xóa
      </Button>
      <Dialog
        open={confirming !== null}
        title={confirmTitle(confirming)}
        onOpenChange={(open) => !open && setConfirming(null)}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirming(null)}>
              Hủy
            </Button>
            <Button
              type="button"
              variant={confirming === 'delete' ? 'danger' : 'primary'}
              loading={mutation.isPending}
              data-autofocus
              onClick={() => confirming && mutation.mutate(confirming)}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        <p>{confirmDescription(confirming)}</p>
      </Dialog>
    </div>
  );
}

function actionMessage(action: Action): string {
  return {
    publish: 'Đã xuất bản.',
    hide: 'Đã ẩn khỏi website.',
    delete: 'Đã chuyển vào thùng rác.',
    restore: 'Đã khôi phục.',
  }[action];
}

function confirmTitle(action: Action | null): string {
  return action === 'publish'
    ? 'Xác nhận xuất bản'
    : action === 'hide'
      ? 'Xác nhận ẩn'
      : 'Xác nhận xóa';
}

function confirmDescription(action: Action | null): string {
  if (action === 'publish')
    return 'Nội dung sẽ xuất hiện trên website sau khi vượt qua kiểm tra backend.';
  if (action === 'hide') return 'URL vẫn được giữ nhưng nội dung không còn hiển thị công khai.';
  return 'Bản ghi được xóa mềm và có thể khôi phục. Không dùng xóa vĩnh viễn trong thao tác nhanh.';
}
