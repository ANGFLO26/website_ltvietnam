import type { AdminRedirectView } from '@ltv/contracts';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { RedirectManager } from '@/features/operations/RedirectManager';
import { adminServerPage } from '@/lib/api/client.server';
export default async function Page() {
  try {
    const redirects = await adminServerPage<AdminRedirectView>(
      '/admin/redirects?page=1&page_size=100',
    );
    return (
      <>
        <PageHeader
          eyebrow="Website"
          title="Chuyển hướng URL"
          description="Giữ liên kết cũ hoạt động an toàn khi thay đổi cấu trúc website."
        />
        <RedirectManager initial={redirects} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Chuyển hướng URL" />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải dữ liệu.'} />
      </>
    );
  }
}
