import type { AdminMenuView, AdminSettingView } from '@ltv/contracts';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { MenuManager } from '@/features/operations/MenuManager';
import { loadOperationOptions } from '@/features/operations/options.server';
import { WebsiteTabs } from '@/features/operations/WebsiteTabs';
import { adminServerRequest } from '@/lib/api/client.server';
export default async function Page() {
  try {
    const [menus, company, options] = await Promise.all([
      adminServerRequest<AdminMenuView[]>('/admin/menus'),
      adminServerRequest<AdminSettingView[]>('/admin/settings/company'),
      loadOperationOptions(),
    ]);
    return (
      <>
        <PageHeader
          eyebrow="Website"
          title="Menu & footer"
          description="Tạo cấu trúc điều hướng tối đa hai cấp, chọn nội dung đích và sắp xếp trực quan."
        />
        <WebsiteTabs active="/website/menus" />
        <MenuManager initial={menus} targets={options.targets} companySettings={company} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Menu & footer" />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải dữ liệu.'} />
      </>
    );
  }
}
