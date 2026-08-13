import type {
  AdminTaxonomyDetailView,
  AdminTaxonomyKind,
  AdminTaxonomyListItemView,
  MediaAdminView,
} from '@ltv/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { TaxonomyForm } from '@/features/taxonomy/TaxonomyForm';
import { isTaxonomyKind, TAXONOMY_CONFIG } from '@/features/taxonomy/config';
import { adminServerPage, adminServerRequest } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';

export const metadata: Metadata = { title: 'Chỉnh sửa taxonomy' };

export default async function TaxonomyDetailPage({
  params,
}: {
  readonly params: Promise<{ kind: string; id: string }>;
}) {
  const input = await params;
  if (!isTaxonomyKind(input.kind)) notFound();
  const kind: AdminTaxonomyKind = input.kind;
  try {
    const detail = await adminServerRequest<AdminTaxonomyDetailView>(
      `/admin/${resource(kind)}/${input.id}`,
    );
    const parents = TAXONOMY_CONFIG[kind].tree
      ? (await adminServerPage<AdminTaxonomyListItemView>(`/admin/${resource(kind)}?page_size=100`))
          .data
      : [];
    const [logo, cover, featured, icon] = await Promise.all([
      loadMedia(detail.logo_id),
      loadMedia(detail.cover_image_id),
      loadMedia(detail.featured_image_id),
      loadMedia(detail.icon_id),
    ]);
    return (
      <>
        <PageHeader
          eyebrow={TAXONOMY_CONFIG[kind].plural}
          title={label(detail, kind)}
          description={`Chỉnh sửa ${TAXONOMY_CONFIG[kind].label.toLowerCase()} và trạng thái hiển thị.`}
          actions={
            <Link className="button button--secondary" href={`/taxonomy?kind=${kind}`}>
              Về danh sách
            </Link>
          }
        />
        <TaxonomyForm
          kind={kind}
          detail={detail}
          parents={parents}
          media={{ logo, cover, featured, icon }}
        />
      </>
    );
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) notFound();
    return (
      <>
        <PageHeader title="Chỉnh sửa taxonomy" />
        <ErrorState
          message={error instanceof Error ? error.message : 'Lỗi không xác định'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
}
async function loadMedia(id: string | null | undefined): Promise<MediaAdminView | null> {
  if (!id) return null;
  try {
    return await adminServerRequest<MediaAdminView>(`/admin/media/${id}`);
  } catch {
    return null;
  }
}
function label(detail: AdminTaxonomyDetailView, kind: AdminTaxonomyKind): string {
  return kind === 'standard'
    ? `${detail.organization ?? ''} ${detail.code ?? ''}`.trim()
    : (detail.name ?? detail.slug);
}
function resource(kind: AdminTaxonomyKind): string {
  return {
    brand: 'brands',
    product_category: 'product-categories',
    standard: 'standards',
    application: 'applications',
    industry: 'industries',
  }[kind];
}
