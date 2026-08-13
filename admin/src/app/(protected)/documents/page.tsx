import type { AdminDocumentView } from '@ltv/contracts';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { DocumentList } from '@/features/documents/DocumentList';
import { adminServerPage } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';

export const metadata: Metadata = { title: 'Tài liệu' };
export default async function DocumentsPage() {
  try {
    const initial = await adminServerPage<AdminDocumentView>(
      '/admin/documents?page=1&page_size=20',
    );
    return (
      <>
        <PageHeader
          eyebrow="Catalogue"
          title="Tài liệu"
          description="Quản lý PDF, quyền tải và liên kết với sản phẩm, hãng, dịch vụ hoặc bài viết."
        />
        <DocumentList initial={initial} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Tài liệu" />
        <ErrorState
          message={error instanceof Error ? error.message : 'Lỗi không xác định'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
}
