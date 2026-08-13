import type { AdminDocumentDetailView, MediaAdminView } from '@ltv/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { loadDocumentOptions } from '@/features/catalogue/options.server';
import { DocumentForm } from '@/features/documents/DocumentForm';
import { adminServerRequest } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';

export const metadata: Metadata = { title: 'Chỉnh sửa tài liệu' };
export default async function DocumentDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const [detail, options] = await Promise.all([
      adminServerRequest<AdminDocumentDetailView>(`/admin/documents/${id}`),
      loadDocumentOptions(),
    ]);
    const file = await loadMedia(detail.document.file_id);
    return (
      <>
        <PageHeader
          eyebrow="Tài liệu"
          title={detail.document.title}
          description={`/${detail.document.slug}`}
          actions={
            <Link className="button button--secondary" href="/documents">
              Về danh sách
            </Link>
          }
        />
        <DocumentForm detail={detail} file={file} options={options} />
      </>
    );
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) notFound();
    return (
      <>
        <PageHeader title="Chỉnh sửa tài liệu" />
        <ErrorState
          message={error instanceof Error ? error.message : 'Lỗi không xác định'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
}
async function loadMedia(id: string): Promise<MediaAdminView | null> {
  try {
    return await adminServerRequest<MediaAdminView>(`/admin/media/${id}`);
  } catch {
    return null;
  }
}
