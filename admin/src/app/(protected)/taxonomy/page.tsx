import type { AdminTaxonomyKind, AdminTaxonomyListItemView } from '@ltv/contracts';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { TaxonomyManager } from '@/features/taxonomy/TaxonomyManager';
import { isTaxonomyKind, TAXONOMY_CONFIG } from '@/features/taxonomy/config';
import { adminServerPage } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';

export const metadata: Metadata = { title: 'Taxonomy' };

export default async function TaxonomyPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ kind?: string }>;
}) {
  const query = await searchParams;
  const kind: AdminTaxonomyKind = isTaxonomyKind(query.kind) ? query.kind : 'brand';
  try {
    const initial = await adminServerPage<AdminTaxonomyListItemView>(
      `/admin/${resource(kind)}?page=1&page_size=20`,
    );
    return (
      <>
        <PageHeader
          eyebrow="Catalogue"
          title="Taxonomy"
          description={`Quản lý ${TAXONOMY_CONFIG[kind].plural.toLowerCase()}, quan hệ cha–con và dữ liệu dùng trong bộ lọc sản phẩm.`}
        />
        <TaxonomyManager kind={kind} initial={initial} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Taxonomy" />
        <ErrorState
          message={error instanceof Error ? error.message : 'Lỗi không xác định'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
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
