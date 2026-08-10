import Link from 'next/link';
import type { ProductFilterOptions, FilterOption } from '@/lib/catalogue';
import {
  FILTER_DIMENSIONS,
  filterQuery,
  productFilterHref,
  toggleFilterValue,
  type FilterDimension,
  type ProductFilters,
} from '@/lib/filter';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export interface FilterProps {
  readonly filters: ProductFilters;
  readonly options: ProductFilterOptions;
  readonly dictionary: Dictionary;
}

export function FilterSidebar({ filters, options, dictionary }: FilterProps) {
  const labels: Record<FilterDimension, string> = {
    brand: dictionary.products.brandFilter,
    category: dictionary.products.categoryFilter,
    standard: dictionary.products.standardFilter,
    application: dictionary.products.applicationFilter,
    industry: dictionary.products.industryFilter,
  };

  return (
    <aside
      className="rounded-xl border border-slate-200 bg-white p-5"
      aria-label={dictionary.products.filters}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{dictionary.products.filters}</h2>
        <Link className="text-sm" href={routePath('products.all')}>
          {dictionary.products.clearFilters}
        </Link>
      </div>
      <SearchForm filters={filters} dictionary={dictionary} />
      <div className="mt-6 space-y-6">
        {FILTER_DIMENSIONS.map((dimension) => (
          <FilterGroup
            key={dimension}
            dimension={dimension}
            label={labels[dimension]}
            options={options[dimension]}
            filters={filters}
          />
        ))}
      </div>
    </aside>
  );
}

function SearchForm({ filters, dictionary }: Pick<FilterProps, 'filters' | 'dictionary'>) {
  const query = filterQuery(filters);
  return (
    <form className="mt-5" action={routePath('products.all')} method="get">
      <label className="block text-sm font-semibold" htmlFor="product-search">
        {dictionary.products.searchLabel}
      </label>
      {FILTER_DIMENSIONS.flatMap((dimension) =>
        filters[dimension].map((value) => (
          <input key={`${dimension}:${value}`} type="hidden" name={dimension} value={value} />
        )),
      )}
      {query.sort === undefined ? null : <input type="hidden" name="sort" value={filters.sort} />}
      <input
        className="mt-2 w-full rounded border border-slate-300 px-3 py-2"
        id="product-search"
        name="q"
        defaultValue={filters.q}
        placeholder={dictionary.products.searchPlaceholder}
      />
      <button
        className="mt-2 w-full rounded bg-[var(--color-primary)] px-4 py-2 font-semibold text-white"
        type="submit"
      >
        {dictionary.products.searchAction}
      </button>
    </form>
  );
}

function FilterGroup({
  dimension,
  label,
  options,
  filters,
}: {
  dimension: FilterDimension;
  label: string;
  options: readonly FilterOption[];
  filters: ProductFilters;
}) {
  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">{label}</h3>
      <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
        {options.map((option) => {
          const selected = filters[dimension].includes(option.value);
          return (
            <li key={option.value} style={{ paddingInlineStart: `${option.depth * 0.75}rem` }}>
              <Link
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm no-underline ${selected ? 'bg-blue-50 font-semibold' : 'hover:bg-slate-50'}`}
                href={productFilterHref(toggleFilterValue(filters, dimension, option.value))}
                aria-current={selected ? 'true' : undefined}
              >
                <span
                  className={`inline-flex size-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-400'}`}
                  aria-hidden="true"
                >
                  {selected ? '✓' : null}
                </span>
                <span>{option.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
