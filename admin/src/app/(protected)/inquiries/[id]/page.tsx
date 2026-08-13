import type { InquiryView } from '@ltv/contracts';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { InquiryDetail } from '@/features/operations/InquiryDetail';
import { adminServerRequest } from '@/lib/api/client.server';

export default async function Page({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const inquiry = await adminServerRequest<InquiryView>(`/admin/inquiries/${id}`);
    return (
      <>
        <PageHeader
          eyebrow="Yêu cầu khách hàng"
          title="Chi tiết yêu cầu"
          actions={
            <Link href="/inquiries" className="button button--secondary">
              Quay lại hộp thư
            </Link>
          }
        />
        <InquiryDetail initial={inquiry} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Chi tiết yêu cầu" />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải yêu cầu.'} />
      </>
    );
  }
}
