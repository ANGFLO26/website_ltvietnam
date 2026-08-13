import type { AdminSettingView } from '@ltv/contracts';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { SettingsManager } from '@/features/operations/SettingsManager';
import { adminServerRequest } from '@/lib/api/client.server';
export default async function Page() {
  try {
    const settings = await adminServerRequest<AdminSettingView[]>('/admin/settings');
    return (
      <>
        <PageHeader
          eyebrow="Hệ thống"
          title="Cài đặt"
          description="Quản lý cấu hình theo nhóm; giá trị bí mật luôn được che và không bị gửi lại ngoài ý muốn."
        />
        <SettingsManager initial={settings} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Cài đặt" />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải cài đặt.'} />
      </>
    );
  }
}
