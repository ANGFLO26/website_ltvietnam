import type { AdminOfficeView, MediaAdminView } from '@ltv/contracts';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { OfficeManager } from '@/features/operations/OfficeManager';
import { WebsiteTabs } from '@/features/operations/WebsiteTabs';
import { adminServerPage, adminServerRequest } from '@/lib/api/client.server';
export default async function Page() {
  try {
    const [offices, media] = await Promise.all([
      adminServerRequest<AdminOfficeView[]>('/admin/offices'),
      adminServerPage<MediaAdminView>('/admin/media?type=image&page_size=100'),
    ]);
    return (
      <>
        <PageHeader
          eyebrow="Website"
          title="Văn phòng"
          description="Quản lý địa chỉ, thông tin liên hệ và vị trí bản đồ công khai."
        />
        <WebsiteTabs active="/website/offices" />
        <OfficeManager initial={offices} media={media.data} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Văn phòng" />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải dữ liệu.'} />
      </>
    );
  }
}
