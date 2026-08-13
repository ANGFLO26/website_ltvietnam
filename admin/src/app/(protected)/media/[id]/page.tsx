import type { MediaAdminView } from '@ltv/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { MediaDetailForm } from '@/features/media/MediaDetailForm';
import { adminServerRequest } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';

export const metadata: Metadata = { title: 'Chi tiết Media' };

export default async function MediaDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const media = await adminServerRequest<MediaAdminView>(`/admin/media/${id}`);
    return (
      <>
        <PageHeader
          eyebrow="Thư viện Media"
          title={media.title ?? media.original_name}
          description="Metadata, thông tin kỹ thuật và các vị trí đang sử dụng tệp."
          actions={
            <Link className="button button--secondary" href="/media">
              Về thư viện
            </Link>
          }
        />
        <MediaDetailForm media={media} />
      </>
    );
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) notFound();
    return (
      <>
        <PageHeader title="Chi tiết Media" />
        <ErrorState
          message={error instanceof Error ? error.message : 'Lỗi không xác định'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
}
