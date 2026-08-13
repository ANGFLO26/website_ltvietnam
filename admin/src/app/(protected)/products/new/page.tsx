import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { loadProductOptions } from '@/features/catalogue/options.server';
import { ProductQuickCreate } from '@/features/products/ProductQuickCreate';

export const metadata: Metadata = { title: 'Tạo sản phẩm' };
export default async function NewProductPage() {
  try {
    const options = await loadProductOptions();
    return (
      <>
        <PageHeader
          eyebrow="Sản phẩm"
          title="Tạo sản phẩm"
          description="Bắt đầu bằng thông tin tối thiểu, sau đó hoàn thiện từng section trước khi xuất bản."
          actions={
            <Link className="button button--secondary" href="/products">
              Hủy
            </Link>
          }
        />
        <ProductQuickCreate options={options} />
      </>
    );
  } catch (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Không thể tải form sản phẩm.'}
      />
    );
  }
}
