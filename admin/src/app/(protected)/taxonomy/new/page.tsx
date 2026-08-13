import type { AdminTaxonomyKind, AdminTaxonomyListItemView } from '@ltv/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { TaxonomyForm } from '@/features/taxonomy/TaxonomyForm';
import { isTaxonomyKind, TAXONOMY_CONFIG } from '@/features/taxonomy/config';
import { adminServerPage } from '@/lib/api/client.server';

export const metadata: Metadata = { title: 'Thêm taxonomy' };

export default async function NewTaxonomyPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ kind?: string }>;
}) {
  const query = await searchParams;
  const kind: AdminTaxonomyKind = isTaxonomyKind(query.kind) ? query.kind : 'brand';
  try {
    const parents = TAXONOMY_CONFIG[kind].tree
      ? (await adminServerPage<AdminTaxonomyListItemView>(`/admin/${resource(kind)}?page_size=100`))
          .data
      : [];
    return (
      <>
        <PageHeader
          eyebrow="Taxonomy"
          title={`Thêm ${TAXONOMY_CONFIG[kind].label.toLowerCase()}`}
          description="Tạo bản nháp trước, bổ sung đủ dữ liệu rồi mới xuất bản."
          actions={
            <Link className="button button--secondary" href={`/taxonomy?kind=${kind}`}>
              Hủy
            </Link>
          }
        />
        <TaxonomyForm kind={kind} parents={parents} media={{}} />
      </>
    );
  } catch (error) {
    return <ErrorState message={error instanceof Error ? error.message : 'Không thể tải form.'} />;
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
