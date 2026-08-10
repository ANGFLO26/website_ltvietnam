import Link from 'next/link';
import type { PagedData } from '@/lib/api/envelope';
import type { ProductCardView } from '@ltv/contracts';
import type { ProductFilterOptions } from '@/lib/catalogue';
import {
  productFilterHref,
  withPage,
  withSort,
  type ProductFilters,
  type ProductSortValue,
} from '@/lib/filter';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { FilterChips } from '@/components/filter/FilterChips';
import { FilterSidebar } from '@/components/filter/FilterSidebar';
import { MobileFilterDrawer } from '@/components/filter/MobileFilterDrawer';
import { ProductGrid } from './ProductGrid';

export function ProductCatalogue({
  products,
  options,
  filters,
  dictionary,
}: {
  products: PagedData<ProductCardView>;
  options: ProductFilterOptions;
  filters: ProductFilters;
  dictionary: Dictionary;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="hidden lg:block">
        <FilterSidebar filters={filters} options={options} dictionary={dictionary} />
      </div>
      <div className="min-w-0">
        <MobileFilterDrawer filters={filters} options={options} dictionary={dictionary} />
        <FilterChips filters={filters} options={options} dictionary={dictionary} />
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <p className="font-semibold text-slate-700">
            {dictionary.products.resultCount.replace('{count}', String(products.meta.total_items))}
          </p>
          <SortLinks filters={filters} dictionary={dictionary} />
        </div>
        {products.data.length === 0 ? (
          <EmptyState
            title={dictionary.products.emptyTitle}
            message={dictionary.products.emptyMessage}
            action={<Link href={routePath('products.all')}>{dictionary.products.emptyAction}</Link>}
          />
        ) : (
          <ProductGrid products={products.data} dictionary={dictionary} />
        )}
        <div className="mt-8">
          <Pagination
            page={products.meta.page}
            totalPages={products.meta.total_pages}
            previousLabel={dictionary.common.previousPage}
            nextLabel={dictionary.common.nextPage}
            pageLabel={dictionary.common.paginationLabel}
            hrefForPage={(page) => productFilterHref(withPage(filters, page))}
          />
        </div>
      </div>
    </div>
  );
}

function SortLinks({ filters, dictionary }: { filters: ProductFilters; dictionary: Dictionary }) {
  const choices: readonly [ProductSortValue, string][] = [
    ['default', dictionary.products.sortDefault],
    ['name', dictionary.products.sortName],
    ['newest', dictionary.products.sortNewest],
  ];
  return (
    <nav className="flex flex-wrap gap-2" aria-label={dictionary.products.sortLabel}>
      {choices.map(([value, label]) => (
        <Link
          key={value}
          className={`rounded border px-3 py-1.5 text-sm no-underline ${filters.sort === value ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white'}`}
          href={productFilterHref(withSort(filters, value))}
          aria-current={filters.sort === value ? 'true' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
