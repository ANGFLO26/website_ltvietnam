import type { AdminBannerView } from '@ltv/contracts';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { BannerManager } from '@/features/operations/BannerManager';
import { loadOperationOptions } from '@/features/operations/options.server';
import { WebsiteTabs } from '@/features/operations/WebsiteTabs';
import { adminServerRequest } from '@/lib/api/client.server';
export default async function Page() {
  try {
    const [banners, options] = await Promise.all([
      adminServerRequest<AdminBannerView[]>('/admin/banners'),
      loadOperationOptions(),
    ]);
    return (
      <>
        <PageHeader
          eyebrow="Website"
          title="Banner"
          description="Thiết lập ảnh desktop/mobile, lịch hiển thị và đích liên kết an toàn."
        />
        <WebsiteTabs active="/website/banners" />
        <BannerManager initial={banners} media={options.media} targets={options.targets} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Banner" />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải dữ liệu.'} />
      </>
    );
  }
}
