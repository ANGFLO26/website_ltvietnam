import type {
  ApplicationTreeView,
  BrandCardView,
  IndustryCardView,
  ProductCardView,
  ProductCategoryTreeView,
  StandardCardView,
} from '@ltv/contracts';
import type { PagedData } from './api/envelope';
import { getProducts } from './api/products';
import {
  getApplicationTree,
  getBrands,
  getIndustries,
  getProductCategoryTree,
  getStandards,
} from './api/taxonomy';
import type { ProductFilters } from './filter';

export const CATALOGUE_PAGE_SIZE = 12;

export interface FilterOption {
  readonly value: string;
  readonly label: string;
  readonly depth: number;
}

export interface ProductFilterOptions {
  readonly brand: readonly FilterOption[];
  readonly category: readonly FilterOption[];
  readonly standard: readonly FilterOption[];
  readonly application: readonly FilterOption[];
  readonly industry: readonly FilterOption[];
}

export interface CataloguePageData {
  readonly products: PagedData<ProductCardView>;
  readonly options: ProductFilterOptions;
}

export async function loadCataloguePage(filters: ProductFilters): Promise<CataloguePageData> {
  const [products, categoryTree, brands, standards, applicationTree, industries] =
    await Promise.all([
      getProducts({
        brand: filters.brand,
        category: filters.category,
        standard: filters.standard,
        application: filters.application,
        industry: filters.industry,
        ...(filters.q === '' ? {} : { q: filters.q }),
        sort: filters.sort,
        page: filters.page,
        pageSize: CATALOGUE_PAGE_SIZE,
      }),
      getProductCategoryTree(),
      getBrands({ page_size: 100 }),
      getStandards({ page_size: 100 }),
      getApplicationTree(),
      getIndustries({ page_size: 100 }),
    ]);

  return {
    products,
    options: {
      brand: brands.data.map(plainOption),
      category: flattenTree(categoryTree),
      standard: standards.data.map(standardOption),
      application: flattenTree(applicationTree),
      industry: industries.data.map(plainOption),
    },
  };
}

function plainOption(item: BrandCardView | IndustryCardView): FilterOption {
  return { value: item.slug, label: item.name, depth: 0 };
}

function standardOption(item: StandardCardView): FilterOption {
  return { value: item.slug, label: `${item.organization} ${item.code}`, depth: 0 };
}

function flattenTree(
  tree: readonly (ProductCategoryTreeView | ApplicationTreeView)[],
): readonly FilterOption[] {
  return tree.flatMap((node) => [
    { value: node.slug, label: node.name, depth: node.depth },
    ...flattenTree(node.children),
  ]);
}
