import Link from 'next/link';
import type { ProductCardView } from '@ltv/contracts';
import type { PagedData } from '@/lib/api/envelope';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { ProductGrid } from './ProductGrid';

type TaxonomyRoute = 'products.category' | 'products.standard' | 'products.application';

export function TaxonomyProductListing({
  title,
  description,
  slug,
  route,
  products,
  dictionary,
}: {
  title: string;
  description: string | null;
  slug: string;
  route: TaxonomyRoute;
  products: PagedData<ProductCardView>;
  dictionary: Dictionary;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Breadcrumb
        label={dictionary.products.breadcrumb}
        items={[
          { label: dictionary.products.home, href: routePath('home') },
          { label: dictionary.products.products, href: routePath('products.landing') },
          { label: title },
        ]}
      />
      <header className="mt-6 max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-3 text-lg text-slate-600">
          {description ?? dictionary.products.taxonomyDescription}
        </p>
      </header>
      <div className="mt-8">
        {products.data.length === 0 ? (
          <EmptyState
            title={dictionary.products.emptyTitle}
            message={dictionary.products.emptyMessage}
            action={<Link href={routePath('products.all')}>{dictionary.products.browseAll}</Link>}
          />
        ) : (
          <ProductGrid products={products.data} dictionary={dictionary} />
        )}
      </div>
      <div className="mt-8">
        <Pagination
          page={products.meta.page}
          totalPages={products.meta.total_pages}
          previousLabel={dictionary.common.previousPage}
          nextLabel={dictionary.common.nextPage}
          pageLabel={dictionary.common.paginationLabel}
          hrefForPage={(page) =>
            routePath(route, {
              params: { slug },
              query: { page: page === 1 ? undefined : page },
            })
          }
        />
      </div>
    </div>
  );
}
