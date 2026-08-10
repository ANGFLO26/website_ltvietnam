import Link from 'next/link';
import type { ProductFilterOptions } from '@/lib/catalogue';
import {
  FILTER_DIMENSIONS,
  productFilterHref,
  removeFilterValue,
  type FilterDimension,
  type ProductFilters,
} from '@/lib/filter';
import type { Dictionary } from '@/lib/i18n';
import { routePath } from '@/lib/routes';

export function FilterChips({
  filters,
  options,
  dictionary,
}: {
  filters: ProductFilters;
  options: ProductFilterOptions;
  dictionary: Dictionary;
}) {
  const chips = FILTER_DIMENSIONS.flatMap((dimension) =>
    filters[dimension].map((value) => ({
      dimension,
      value,
      label: optionLabel(options, dimension, value),
    })),
  );

  if (chips.length === 0 && filters.q === '') return null;
  return (
    <section className="mb-5" aria-label={dictionary.products.activeFilters}>
      <div className="flex flex-wrap items-center gap-2">
        {filters.q === '' ? null : (
          <Link
            className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium no-underline"
            href={productFilterHref({ ...filters, q: '', page: 1 })}
            aria-label={dictionary.products.removeFilter.replace('{label}', filters.q)}
          >
            {filters.q} <span aria-hidden="true">{'×'}</span>
          </Link>
        )}
        {chips.map((chip) => (
          <Link
            key={`${chip.dimension}:${chip.value}`}
            className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium no-underline"
            href={productFilterHref(removeFilterValue(filters, chip.dimension, chip.value))}
            aria-label={dictionary.products.removeFilter.replace('{label}', chip.label)}
          >
            {chip.label} <span aria-hidden="true">{'×'}</span>
          </Link>
        ))}
        <Link className="ml-1 text-sm" href={routePath('products.all')}>
          {dictionary.products.clearFilters}
        </Link>
      </div>
    </section>
  );
}

function optionLabel(
  options: ProductFilterOptions,
  dimension: FilterDimension,
  value: string,
): string {
  return options[dimension].find((option) => option.value === value)?.label ?? value;
}
