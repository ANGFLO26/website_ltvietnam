import type { MediaAdminView } from '@ltv/contracts';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { MediaLibrary } from '@/features/media/MediaLibrary';
import { adminServerPage } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';

export const metadata: Metadata = { title: 'Thư viện Media' };

export default async function MediaPage() {
  try {
    const initial = await adminServerPage<MediaAdminView>('/admin/media?page=1&page_size=20');
    return (
      <>
        <PageHeader
          eyebrow="Tài nguyên"
          title="Thư viện Media"
          description="Tải lên, chuẩn hóa metadata và kiểm soát nơi ảnh hoặc tài liệu đang được sử dụng."
        />
        <MediaLibrary initial={initial} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Thư viện Media" description="Không thể tải dữ liệu." />
        <ErrorState
          message={error instanceof Error ? error.message : 'Lỗi không xác định'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
}
