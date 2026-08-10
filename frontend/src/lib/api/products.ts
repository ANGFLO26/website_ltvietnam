import type { ProductCardView, ProductDetailView, ProductLandingView } from '@ltv/contracts';
import { apiGet, apiGetPage } from './client.server';

export interface ProductListQuery {
  readonly brand?: readonly string[];
  readonly category?: readonly string[];
  readonly standard?: readonly string[];
  readonly application?: readonly string[];
  readonly industry?: readonly string[];
  readonly q?: string;
  readonly featured?: boolean;
  readonly sort?: 'default' | 'name' | 'newest';
  readonly page?: number;
  readonly pageSize?: number;
}

export function getProductLanding(): Promise<ProductLandingView> {
  return apiGet<ProductLandingView>('/products/landing', {
    revalidate: 30,
    tags: ['products'],
  });
}

export function getProducts(query: ProductListQuery = {}) {
  return apiGetPage<ProductCardView>('/products', {
    query: {
      brand: query.brand,
      category: query.category,
      standard: query.standard,
      application: query.application,
      industry: query.industry,
      q: query.q,
      featured: query.featured,
      sort: query.sort,
      page: query.page,
      page_size: query.pageSize,
    },
    revalidate: false,
  });
}

export function getProduct(slug: string): Promise<ProductDetailView> {
  return apiGet<ProductDetailView>(`/products/${encodeURIComponent(slug)}`, {
    revalidate: 60,
    tags: [`product:${slug}`],
  });
}
