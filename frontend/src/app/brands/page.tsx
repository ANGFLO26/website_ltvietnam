import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPageHeader } from '@/components/content/ContentPageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { getBrands } from '@/lib/api/taxonomy';
import { getDictionary } from '@/lib/i18n';
import { pageNumber } from '@/lib/localized-content';
import { routePath } from '@/lib/routes';
import { buildMetadata } from '@/lib/seo';

const dictionary = getDictionary('en');

export const metadata: Metadata = buildMetadata('brands.list', {
  title: dictionary.content.brandsTitle,
  description: dictionary.content.brandsDescription,
});

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | readonly string[] }>;
}) {
  const page = pageNumber((await searchParams).page);
  const brands = await getBrands({ page, page_size: 24 });
  return (
    <div>
      <ContentPageHeader
        title={dictionary.content.brandsTitle}
        description={dictionary.content.brandsDescription}
        breadcrumbs={[
          { label: dictionary.content.home, href: routePath('home') },
          { label: dictionary.content.brandsTitle },
        ]}
        locale="en"
        dictionary={dictionary}
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {brands.data.length === 0 ? (
          <EmptyState
            title={dictionary.content.emptyTitle}
            message={dictionary.content.emptyMessage}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {brands.data.map((brand) => (
              <article
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                key={brand.slug}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
                  {brand.brand_type}
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">{brand.name}</h2>
                {brand.country_code === null ? null : (
                  <p className="mt-2 text-sm text-slate-600">
                    {dictionary.content.countryLabel}: {brand.country_code}
                  </p>
                )}
                <Link
                  className="mt-5 inline-block font-semibold"
                  href={routePath('brands.detail', { params: { slug: brand.slug } })}
                >
                  {dictionary.common.viewDetails}
                </Link>
              </article>
            ))}
          </div>
        )}
        <div className="mt-8">
          <Pagination
            page={brands.meta.page}
            totalPages={brands.meta.total_pages}
            previousLabel={dictionary.common.previousPage}
            nextLabel={dictionary.common.nextPage}
            pageLabel={dictionary.common.paginationLabel}
            hrefForPage={(next) =>
              routePath('brands.list', { ...(next <= 1 ? {} : { query: { page: next } }) })
            }
          />
        </div>
      </div>
    </div>
  );
}
