import type { AdminHomepageSectionView } from '@ltv/contracts';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { HomepageManager } from '@/features/operations/HomepageManager';
import { WebsiteTabs } from '@/features/operations/WebsiteTabs';
import { adminServerRequest } from '@/lib/api/client.server';
export default async function Page() {
  try {
    const sections = await adminServerRequest<AdminHomepageSectionView[]>('/admin/homepage');
    return (
      <>
        <PageHeader
          eyebrow="Website"
          title="Trang chủ"
          description="Điều khiển bố cục trang chủ công khai mà không phải chỉnh JSON."
        />
        <WebsiteTabs active="/website/homepage" />
        <HomepageManager initial={sections} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Trang chủ" />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải cấu hình.'} />
      </>
    );
  }
}
