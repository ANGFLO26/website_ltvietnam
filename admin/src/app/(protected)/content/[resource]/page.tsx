import type { AdminContentListItemView, AdminPostCategoryView } from '@ltv/contracts';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shell/PageHeader';
import { ErrorState } from '@/components/ui/States';
import { ContentList } from '@/features/content/ContentList';
import { contentConfig } from '@/features/content/config';
import { adminServerPage } from '@/lib/api/client.server';
import type { AdminPage } from '@/lib/api/envelope';
import { AdminApiError } from '@/lib/api/errors';

export default async function ContentResourcePage({
  params,
}: {
  readonly params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  const config = contentConfig(resource);
  if (!config) notFound();
  try {
    const initial =
      config.resource === 'post-categories'
        ? await adminServerPage<AdminPostCategoryView>('/admin/post-categories?page=1&page_size=20')
        : await adminServerPage<AdminContentListItemView>(
            `/admin/${config.resource}?page=1&page_size=20`,
          );
    return (
      <>
        <PageHeader eyebrow="Nội dung" title={config.label} description={config.description} />
        <ContentList
          config={config}
          initial={initial as AdminPage<AdminContentListItemView | AdminPostCategoryView>}
        />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title={config.label} />
        <ErrorState
          message={error instanceof Error ? error.message : 'Không thể tải nội dung.'}
          requestId={error instanceof AdminApiError ? error.requestId : null}
        />
      </>
    );
  }
}
