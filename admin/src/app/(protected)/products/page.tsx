import type { AdminProductListItemView } from '@ltv/contracts';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { loadProductOptions } from '@/features/catalogue/options.server';
import { ProductList } from '@/features/products/ProductList';
import { adminServerPage } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';

export const metadata: Metadata = { title: 'Sản phẩm' };
export default async function ProductsPage() {
  try {
    const [initial, options] = await Promise.all([
      adminServerPage<AdminProductListItemView>('/admin/products?page=1&page_size=20'),
      loadProductOptions(),
    ]);
    return (
      <>
        <PageHeader
          eyebrow="Catalogue"
          title="Sản phẩm"
          description="Quản lý dữ liệu kỹ thuật, taxonomy, media, thông số và trạng thái xuất bản."
        />
        <ProductList initial={initial} brands={options.brands} categories={options.categories} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Sản phẩm" />
        <ErrorState
          message={error instanceof Error ? error.message : 'Lỗi không xác định'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
}
