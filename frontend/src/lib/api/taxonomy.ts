import type {
  ApplicationCardView,
  ApplicationDetailView,
  ApplicationTreeView,
  BrandCardView,
  BrandDetailView,
  IndustryCardView,
  IndustryDetailView,
  ProductCardView,
  ProductCategoryCardView,
  ProductCategoryDetailView,
  ProductCategoryTreeView,
  StandardCardView,
  StandardDetailView,
} from '@ltv/contracts';
import { apiGet, apiGetPage, type ApiQuery } from './client.server';

export const getBrands = (query: ApiQuery = {}) => apiGetPage<BrandCardView>('/brands', { query });
export const getBrand = (slug: string) => apiGet<BrandDetailView>(`/brands/${part(slug)}`);
export const getBrandChildren = (slug: string) =>
  apiGet<readonly BrandCardView[]>(`/brands/${part(slug)}/children`);

export const getProductCategories = (query: ApiQuery = {}) =>
  apiGetPage<ProductCategoryCardView>('/product-categories', { query });
export const getProductCategoryTree = () =>
  apiGet<readonly ProductCategoryTreeView[]>('/product-categories/tree');
export const getProductCategory = (slug: string) =>
  apiGet<ProductCategoryDetailView>(`/product-categories/${part(slug)}`);

export const getStandards = (query: ApiQuery = {}) =>
  apiGetPage<StandardCardView>('/standards', { query });
export const getStandard = (slug: string) => apiGet<StandardDetailView>(`/standards/${part(slug)}`);

export const getApplications = (query: ApiQuery = {}) =>
  apiGetPage<ApplicationCardView>('/applications', { query });
export const getApplicationTree = () =>
  apiGet<readonly ApplicationTreeView[]>('/applications/tree');
export const getApplication = (slug: string) =>
  apiGet<ApplicationDetailView>(`/applications/${part(slug)}`);

export const getIndustries = (query: ApiQuery = {}) =>
  apiGetPage<IndustryCardView>('/industries', { query });
export const getIndustry = (slug: string) =>
  apiGet<IndustryDetailView>(`/industries/${part(slug)}`);

export function getTaxonomyProducts(
  dimension: 'product-categories' | 'standards' | 'applications' | 'industries',
  slug: string,
  query: ApiQuery = {},
) {
  return apiGetPage<ProductCardView>(`/${dimension}/${part(slug)}/products`, { query });
}

function part(value: string): string {
  return encodeURIComponent(value);
}
