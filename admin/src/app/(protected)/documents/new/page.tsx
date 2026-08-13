import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { loadDocumentOptions } from '@/features/catalogue/options.server';
import { DocumentForm } from '@/features/documents/DocumentForm';

export const metadata: Metadata = { title: 'Thêm tài liệu' };
export default async function NewDocumentPage() {
  try {
    const options = await loadDocumentOptions();
    return (
      <>
        <PageHeader
          eyebrow="Tài liệu"
          title="Thêm tài liệu"
          description="Chọn PDF đã upload, khai báo metadata và liên kết nội dung."
          actions={
            <Link className="button button--secondary" href="/documents">
              Hủy
            </Link>
          }
        />
        <DocumentForm file={null} options={options} />
      </>
    );
  } catch (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Không thể tải form tài liệu.'}
      />
    );
  }
}
