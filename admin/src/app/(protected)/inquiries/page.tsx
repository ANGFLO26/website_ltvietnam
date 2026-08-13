import type { InquiryView } from '@ltv/contracts';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { InquiryInbox } from '@/features/operations/InquiryInbox';
import { adminServerPage } from '@/lib/api/client.server';

export const metadata: Metadata = { title: 'Yêu cầu khách hàng' };
export default async function Page() {
  try {
    const initial = await adminServerPage<InquiryView>(
      '/admin/inquiries?handled=false&page=1&page_size=20',
    );
    return (
      <>
        <PageHeader
          eyebrow="Vận hành"
          title="Yêu cầu khách hàng"
          description="Theo dõi yêu cầu từ website, phát hiện lỗi email và xác nhận khi đã xử lý."
        />
        <InquiryInbox initial={initial} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Yêu cầu khách hàng" />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải dữ liệu.'} />
      </>
    );
  }
}
