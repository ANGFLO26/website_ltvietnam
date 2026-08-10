import type { Metadata } from 'next';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { DocumentCard } from '@/components/content/DocumentCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { getDocuments } from '@/lib/api/content';
import { getDictionary } from '@/lib/i18n';
import { pageNumber } from '@/lib/localized-content';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

const dictionary = getDictionary('en');

export const metadata: Metadata = buildMetadata('resources.list', {
  title: dictionary.content.resourcesTitle,
  description: dictionary.content.resourcesDescription,
});

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  const page = pageNumber((await searchParams).page);
  const documents = await getDocuments({ page, page_size: 24 });
  return (
    <div>
      <ContentPageHeader
        title={dictionary.content.resourcesTitle}
        description={dictionary.content.resourcesDescription}
        breadcrumbs={[
          { label: dictionary.content.home, href: routePath('home') },
          { label: dictionary.content.resourcesTitle },
        ]}
        locale="en"
        dictionary={dictionary}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {documents.data.length === 0 ? (
          <EmptyState
            title={dictionary.content.emptyTitle}
            message={dictionary.content.emptyMessage}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {documents.data.map((document) => (
              <DocumentCard key={document.slug} document={document} dictionary={dictionary} />
            ))}
          </div>
        )}
        <div className="mt-8">
          <Pagination
            page={documents.meta.page}
            totalPages={documents.meta.total_pages}
            previousLabel={dictionary.common.previousPage}
            nextLabel={dictionary.common.nextPage}
            pageLabel={dictionary.common.paginationLabel}
            hrefForPage={(next) =>
              routePath('resources.list', { ...(next <= 1 ? {} : { query: { page: next } }) })
            }
          />
        </div>
      </div>
    </div>
  );
}
