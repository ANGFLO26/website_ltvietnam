import type { AdminDashboardView } from '@ltv/contracts';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { DashboardOverview } from '@/features/dashboard/DashboardOverview';
import { adminServerRequest } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  try {
    const dashboard = await adminServerRequest<AdminDashboardView>('/admin/dashboard');
    return (
      <>
        <PageHeader
          eyebrow="Tổng quan vận hành"
          title="Dashboard"
          description="Những việc cần chú ý hôm nay và quy mô nội dung hiện tại."
        />
        <DashboardOverview dashboard={dashboard} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Dashboard" description="Không thể tải dữ liệu vận hành." />
        <ErrorState
          message={error instanceof Error ? error.message : 'Lỗi không xác định'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
}
