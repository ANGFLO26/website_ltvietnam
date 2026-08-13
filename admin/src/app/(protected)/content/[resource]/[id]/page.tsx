import type { AdminContentDetailView, AdminPostCategoryView } from '@ltv/contracts';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { ContentForm } from '@/features/content/ContentForm';
import { contentConfig } from '@/features/content/config';
import { loadContentOptions } from '@/features/content/options.server';
import { PostCategoryForm } from '@/features/content/PostCategoryForm';
import { adminServerRequest } from '@/lib/api/client.server';
import { AdminApiError } from '@/lib/api/errors';

export default async function ContentDetailPage({
  params,
}: {
  readonly params: Promise<{ resource: string; id: string }>;
}) {
  const { resource, id } = await params;
  const config = contentConfig(resource);
  if (!config) notFound();
  try {
    if (config.resource === 'post-categories') {
      const item = await adminServerRequest<AdminPostCategoryView>(`/admin/post-categories/${id}`);
      return (
        <>
          <PageHeader
            eyebrow="Danh mục bài viết"
            title={item.name}
            description={`/${item.slug}`}
            actions={
              <Link className="button button--secondary" href="/content/post-categories">
                Về danh sách
              </Link>
            }
          />
          <PostCategoryForm item={item} />
        </>
      );
    }
    const [detail, options] = await Promise.all([
      adminServerRequest<AdminContentDetailView>(`/admin/${config.resource}/${id}`),
      loadContentOptions(),
    ]);
    const translation =
      detail.translations.find((item) => item.locale === 'vi') ?? detail.translations[0];
    const title = translation && ('name' in translation ? translation.name : translation.title);
    return (
      <>
        <PageHeader
          eyebrow={config.label}
          title={title || `Bản nháp ${config.singular}`}
          description="Biên tập cấu hình chung và từng bản dịch VI/EN độc lập."
          actions={
            <Link className="button button--secondary" href={`/content/${config.resource}`}>
              Về danh sách
            </Link>
          }
        />
        <ContentForm detail={detail} config={config} options={options} />
      </>
    );
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 404) notFound();
    return (
      <>
        <PageHeader title={`Chỉnh sửa ${config.singular}`} />
        <ErrorState
          message={error instanceof Error ? error.message : 'Không thể tải nội dung.'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
}
