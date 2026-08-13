import type { AdminCustomerView, AdminTaxonomyListItemView, MediaAdminView } from '@ltv/contracts';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { CustomerManager } from '@/features/operations/CustomerManager';
import { WebsiteTabs } from '@/features/operations/WebsiteTabs';
import { adminServerPage } from '@/lib/api/client.server';
export default async function Page() {
  try {
    const [customers, media, industries] = await Promise.all([
      adminServerPage<AdminCustomerView>('/admin/customers?page_size=100'),
      adminServerPage<MediaAdminView>('/admin/media?type=image&page_size=100'),
      adminServerPage<AdminTaxonomyListItemView>('/admin/industries?page_size=100'),
    ]);
    return (
      <>
        <PageHeader
          eyebrow="Website"
          title="Khách hàng"
          description="Quản lý logo khách hàng nổi bật với bước xác nhận quyền công khai bắt buộc."
        />
        <WebsiteTabs active="/website/customers" />
        <CustomerManager initial={customers} media={media.data} industries={industries.data} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Khách hàng" />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải dữ liệu.'} />
      </>
    );
  }
}
