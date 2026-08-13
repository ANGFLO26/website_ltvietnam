import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { ContentQuickCreate } from '@/features/content/ContentQuickCreate';
import { contentConfig } from '@/features/content/config';
import { loadContentOptions } from '@/features/content/options.server';

export default async function NewContentPage({
  params,
}: {
  readonly params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  const config = contentConfig(resource);
  if (!config) notFound();
  try {
    const options = await loadContentOptions();
    return (
      <>
        <PageHeader
          eyebrow={config.label}
          title={`Tạo ${config.singular}`}
          description="Tạo bản nháp tối thiểu rồi chuyển sang màn hình biên tập đầy đủ."
          actions={
            <Link className="button button--secondary" href={`/content/${config.resource}`}>
              Về danh sách
            </Link>
          }
        />
        <ContentQuickCreate config={config} options={options} />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title={`Tạo ${config.singular}`} />
        <ErrorState message={error instanceof Error ? error.message : 'Không thể tải biểu mẫu.'} />
      </>
    );
  }
}
