import 'server-only';

import type {
  AdminContentListItemView,
  AdminProductListItemView,
  AdminTaxonomyListItemView,
} from '@ltv/contracts';
import { adminServerPage } from '@/lib/api/client.server';
import type { ProductFormOptions } from '@/features/products/ProductForm';
import type { DocumentFormOptions } from '@/features/documents/DocumentForm';

export async function loadProductOptions(): Promise<ProductFormOptions> {
  const [brands, categories, standards, applications, industries, products] = await Promise.all([
    adminServerPage<AdminTaxonomyListItemView>('/admin/brands?page_size=100'),
    adminServerPage<AdminTaxonomyListItemView>('/admin/product-categories?page_size=100'),
    adminServerPage<AdminTaxonomyListItemView>('/admin/standards?page_size=100'),
    adminServerPage<AdminTaxonomyListItemView>('/admin/applications?page_size=100'),
    adminServerPage<AdminTaxonomyListItemView>('/admin/industries?page_size=100'),
    adminServerPage<AdminProductListItemView>('/admin/products?page_size=100'),
  ]);
  return {
    brands: brands.data,
    categories: categories.data,
    standards: standards.data,
    applications: applications.data,
    industries: industries.data,
    products: products.data,
  };
}

export async function loadDocumentOptions(): Promise<DocumentFormOptions> {
  const [products, brands, services, posts] = await Promise.all([
    adminServerPage<AdminProductListItemView>('/admin/products?page_size=100'),
    adminServerPage<AdminTaxonomyListItemView>('/admin/brands?page_size=100'),
    adminServerPage<AdminContentListItemView>('/admin/services?page_size=100'),
    adminServerPage<AdminContentListItemView>('/admin/posts?page_size=100'),
  ]);
  return {
    products: products.data.map((item) => ({
      id: item.id,
      label: item.name,
      description: item.model ?? item.brand.label,
    })),
    brands: brands.data.map((item) => ({ id: item.id, label: item.label, description: item.slug })),
    services: services.data.map(contentOption),
    posts: posts.data.map(contentOption),
  };
}

function contentOption(item: AdminContentListItemView) {
  return {
    id: item.id,
    label: item.title ?? 'Chưa có bản dịch',
    description: item.slug ?? item.status,
  };
}
