import 'server-only';

import type {
  AdminContentListItemView,
  AdminDocumentView,
  AdminProductListItemView,
  AdminTaxonomyListItemView,
  MediaAdminView,
} from '@ltv/contracts';
import type { RelationOption } from '@/components/forms/RelationSelector';
import { adminServerPage } from '@/lib/api/client.server';

export interface ContentFormOptions {
  readonly products: readonly RelationOption[];
  readonly brands: readonly RelationOption[];
  readonly industries: readonly RelationOption[];
  readonly services: readonly RelationOption[];
  readonly projects: readonly RelationOption[];
  readonly postCategories: readonly RelationOption[];
  readonly customers: readonly RelationOption[];
  readonly documents: readonly { readonly id: string; readonly label: string }[];
  readonly media: readonly MediaAdminView[];
}

export async function loadContentOptions(): Promise<ContentFormOptions> {
  const [
    products,
    brands,
    industries,
    services,
    projects,
    categories,
    customers,
    documents,
    media,
  ] = await Promise.all([
    adminServerPage<AdminProductListItemView>('/admin/products?page_size=100'),
    adminServerPage<AdminTaxonomyListItemView>('/admin/brands?page_size=100'),
    adminServerPage<AdminTaxonomyListItemView>('/admin/industries?page_size=100'),
    adminServerPage<AdminContentListItemView>('/admin/services?page_size=100'),
    adminServerPage<AdminContentListItemView>('/admin/projects?page_size=100'),
    adminServerPage<{ id: string; name: string; slug: string }>(
      '/admin/post-categories?page_size=100',
    ),
    adminServerPage<{ id: string; name: string; customer_type?: string }>(
      '/admin/customers?page_size=100',
    ),
    adminServerPage<AdminDocumentView>('/admin/documents?page_size=100'),
    adminServerPage<MediaAdminView>('/admin/media?type=image&page_size=100'),
  ]);
  return {
    products: products.data.map((item) => ({
      id: item.id,
      label: item.name,
      description: item.model ?? item.slug,
    })),
    brands: brands.data.map(option),
    industries: industries.data.map(option),
    services: services.data.map(contentOption),
    projects: projects.data.map(contentOption),
    postCategories: categories.data.map((item) => ({
      id: item.id,
      label: item.name,
      description: item.slug,
    })),
    customers: customers.data.map((item) => ({
      id: item.id,
      label: item.name,
      ...(item.customer_type ? { description: item.customer_type } : {}),
    })),
    documents: documents.data.map((item) => ({ id: item.id, label: item.title })),
    media: media.data,
  };
}

function option(item: AdminTaxonomyListItemView): RelationOption {
  return { id: item.id, label: item.label, description: item.slug };
}
function contentOption(item: AdminContentListItemView): RelationOption {
  return {
    id: item.id,
    label: item.title ?? 'Chưa có bản dịch',
    description: item.slug ?? item.status,
  };
}
