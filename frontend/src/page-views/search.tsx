import Link from 'next/link';
import type { Locale } from '@ltv/contracts';
import type { Metadata } from 'next';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { SearchForm } from '@/components/search/SearchForm';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { searchSite } from '@/lib/api/site';
import { getDictionary } from '@/lib/i18n';
import { localizedRouteAlternates, pageNumber } from '@/lib/localized-content';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

const PAGE_SIZE = 20;

type SearchParams = Promise<{
  q?: string | readonly string[];
  page?: string | readonly string[];
}>;

export function searchMetadata(locale: Locale): Metadata {
  const dictionary = getDictionary(locale);
  return buildMetadata('search', {
    title: dictionary.search.title,
    description: dictionary.search.description,
    locale,
    hreflangAlternates: localizedRouteAlternates('search'),
  });
}

export async function renderSearchPage(locale: Locale, searchParams: SearchParams) {
  const dictionary = getDictionary(locale);
  const params = await searchParams;
  const query = first(params.q).trim();
  const page = pageNumber(params.page);
  const results =
    query.length >= 2 && query.length <= 120
      ? await searchSite({ q: query, locale, page, pageSize: PAGE_SIZE })
      : null;

  return (
    <div>
      <ContentPageHeader
        title={dictionary.search.title}
        description={dictionary.search.description}
        breadcrumbs={[
          { label: dictionary.content.home, href: routePath('home') },
          { label: dictionary.search.title },
        ]}
        locale={locale}
        alternates={localizedRouteAlternates('search')}
        dictionary={dictionary}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-7">
          <SearchForm locale={locale} dictionary={dictionary} defaultQuery={query} />
        </div>

        <div className="mt-10">
          {query.length === 0 ? (
            <EmptyState
              title={dictionary.search.initialTitle}
              message={dictionary.search.initialMessage}
            />
          ) : query.length < 2 ? (
            <EmptyState
              title={dictionary.search.shortTitle}
              message={dictionary.search.shortMessage}
            />
          ) : query.length > 120 ? (
            <EmptyState
              title={dictionary.search.longTitle}
              message={dictionary.search.longMessage}
            />
          ) : results === null || results.data.length === 0 ? (
            <EmptyState
              title={dictionary.search.emptyTitle}
              message={`${dictionary.search.emptyMessage} ${dictionary.search.emptySuggestion}`}
              action={<SearchEmptyActions locale={locale} />}
            />
          ) : (
            <section aria-labelledby="search-results-title">
              <h2 id="search-results-title" className="text-2xl font-bold text-slate-950">
                {dictionary.search.resultsTitle}
              </h2>
              <p className="mt-2 text-slate-600">
                {dictionary.search.resultCount
                  .replace('{count}', String(results.meta.total_items))
                  .replace('{query}', query)}
              </p>
              <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {results.data.map((result) => (
                  <SearchResultCard
                    key={`${result.type}:${result.slug}`}
                    result={result}
                    locale={locale}
                    dictionary={dictionary}
                  />
                ))}
              </div>
              <div className="mt-8">
                <Pagination
                  page={results.meta.page}
                  totalPages={results.meta.total_pages}
                  previousLabel={dictionary.common.previousPage}
                  nextLabel={dictionary.common.nextPage}
                  pageLabel={dictionary.common.paginationLabel}
                  hrefForPage={(targetPage) =>
                    routePath('search', {
                      locale,
                      query: { q: query, ...(targetPage <= 1 ? {} : { page: targetPage }) },
                    })
                  }
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchEmptyActions({ locale }: { locale: Locale }) {
  const dictionary = getDictionary(locale);
  return (
    <div className="flex flex-wrap justify-center gap-4">
      <Link className="font-semibold text-blue-800" href={routePath('products.landing')}>
        {dictionary.search.browseProducts}
      </Link>
      <Link className="font-semibold text-blue-800" href={routePath('contact', { locale })}>
        {dictionary.search.contactAction}
      </Link>
    </div>
  );
}

function first(value: string | readonly string[] | undefined): string {
  return typeof value === 'string' ? value : (value?.[0] ?? '');
}
