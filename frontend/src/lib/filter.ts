import { routePath } from './routes';

export const FILTER_DIMENSIONS = [
  'brand',
  'category',
  'standard',
  'application',
  'industry',
] as const;

export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];
export type ProductSortValue = 'default' | 'name' | 'newest';
export type SearchParams = Readonly<Record<string, string | readonly string[] | undefined>>;

export interface ProductFilters {
  readonly brand: readonly string[];
  readonly category: readonly string[];
  readonly standard: readonly string[];
  readonly application: readonly string[];
  readonly industry: readonly string[];
  readonly q: string;
  readonly sort: ProductSortValue;
  readonly page: number;
}

export function parseProductFilters(params: SearchParams): ProductFilters {
  return {
    brand: values(params.brand),
    category: values(params.category),
    standard: values(params.standard),
    application: values(params.application),
    industry: values(params.industry),
    q: first(params.q).trim(),
    sort: sortValue(first(params.sort)),
    page: positiveInteger(first(params.page)),
  };
}

export function isFiltered(filters: ProductFilters): boolean {
  return filters.q !== '' || FILTER_DIMENSIONS.some((dimension) => filters[dimension].length > 0);
}

export function hasCatalogueQuery(filters: ProductFilters): boolean {
  return isFiltered(filters) || filters.sort !== 'default' || filters.page !== 1;
}

export function productFilterHref(filters: ProductFilters): string {
  return routePath('products.all', { query: filterQuery(filters) });
}

export function filterQuery(
  filters: ProductFilters,
): Readonly<Record<string, string | readonly string[] | number | undefined>> {
  return {
    brand: filters.brand,
    category: filters.category,
    standard: filters.standard,
    application: filters.application,
    industry: filters.industry,
    q: filters.q === '' ? undefined : filters.q,
    sort: filters.sort === 'default' ? undefined : filters.sort,
    page: filters.page === 1 ? undefined : filters.page,
  };
}

export function toggleFilterValue(
  filters: ProductFilters,
  dimension: FilterDimension,
  value: string,
): ProductFilters {
  const current = filters[dimension];
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
  return { ...filters, [dimension]: next, page: 1 };
}

export function removeFilterValue(
  filters: ProductFilters,
  dimension: FilterDimension,
  value: string,
): ProductFilters {
  return {
    ...filters,
    [dimension]: filters[dimension].filter((item) => item !== value),
    page: 1,
  };
}

export function withPage(filters: ProductFilters, page: number): ProductFilters {
  return { ...filters, page: Math.max(1, Math.trunc(page)) };
}

export function withSort(filters: ProductFilters, sort: ProductSortValue): ProductFilters {
  return { ...filters, sort, page: 1 };
}

function values(value: string | readonly string[] | undefined): readonly string[] {
  const input = value === undefined ? [] : typeof value === 'string' ? [value] : value;
  return [...new Set(input.map((item) => item.trim()).filter(Boolean))];
}

function first(value: string | readonly string[] | undefined): string {
  return typeof value === 'string' ? value : (value?.[0] ?? '');
}

function sortValue(value: string): ProductSortValue {
  return value === 'name' || value === 'newest' ? value : 'default';
}

function positiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}
