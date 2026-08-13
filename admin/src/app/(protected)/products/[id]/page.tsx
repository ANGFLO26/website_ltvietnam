import type { AdminProductDetailView, MediaAdminView } from '@ltv/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { loadProductOptions } from '@/features/catalogue/options.server';
import { ProductForm } from '@/features/products/ProductForm';
import { adminServerRequest } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';

export const metadata: Metadata = { title: 'Chỉnh sửa sản phẩm' };
export default async function ProductDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const [detail, options] = await Promise.all([
      adminServerRequest<AdminProductDetailView>(`/admin/products/${id}`),
      loadProductOptions(),
    ]);
    const [featured, ...gallery] = await Promise.all([
      loadMedia(detail.product.featured_image_id),
      ...detail.media.map((item) => loadMedia(item.id)),
    ]);
    return (
      <>
        <PageHeader
          eyebrow="Sản phẩm"
          title={detail.product.name}
          description={`${detail.brand.name}${detail.product.model ? ` · ${detail.product.model}` : ''}`}
          actions={
            <Link className="button button--secondary" href="/products">
              Về danh sách
            </Link>
          }
        />
        <ProductForm
          detail={detail}
          options={options}
          featured={featured}
          gallery={gallery.filter((item): item is MediaAdminView => item !== null)}
        />
      </>
    );
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) notFound();
    return (
      <>
        <PageHeader title="Chỉnh sửa sản phẩm" />
        <ErrorState
          message={error instanceof Error ? error.message : 'Lỗi không xác định'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
}
async function loadMedia(id: string | null): Promise<MediaAdminView | null> {
  if (!id) return null;
  try {
    return await adminServerRequest<MediaAdminView>(`/admin/media/${id}`);
  } catch {
    return null;
  }
}
