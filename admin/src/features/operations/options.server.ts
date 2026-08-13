import 'server-only';

import type {
  AdminContentListItemView,
  AdminProductListItemView,
  AdminTaxonomyListItemView,
  MediaAdminView,
} from '@ltv/contracts';
import { adminServerPage } from '@/lib/api/client.server';

export interface OperationOption {
  readonly id: string;
  readonly label: string;
}
export interface OperationOptions {
  readonly media: readonly MediaAdminView[];
  readonly targets: Readonly<Record<string, readonly OperationOption[]>>;
}
export async function loadOperationOptions(): Promise<OperationOptions> {
  const [media, products, categories, brands, services, projects, posts, pages, postCategories] =
    await Promise.all([
      adminServerPage<MediaAdminView>('/admin/media?type=image&page_size=100'),
      adminServerPage<AdminProductListItemView>('/admin/products?page_size=100'),
      adminServerPage<AdminTaxonomyListItemView>('/admin/product-categories?page_size=100'),
      adminServerPage<AdminTaxonomyListItemView>('/admin/brands?page_size=100'),
      adminServerPage<AdminContentListItemView>('/admin/services?page_size=100'),
      adminServerPage<AdminContentListItemView>('/admin/projects?page_size=100'),
      adminServerPage<AdminContentListItemView>('/admin/posts?page_size=100'),
      adminServerPage<AdminContentListItemView>('/admin/pages?page_size=100'),
      adminServerPage<{ id: string; name: string }>('/admin/post-categories?page_size=100'),
    ]);
  const content = (items: readonly AdminContentListItemView[]) =>
    items.map((item) => ({
      id: item.id,
      label: item.title ?? `Chưa có bản dịch · ${item.id.slice(0, 8)}`,
    }));
  return {
    media: media.data,
    targets: {
      product: products.data.map((x) => ({ id: x.id, label: x.name })),
      product_category: categories.data.map((x) => ({ id: x.id, label: x.label })),
      brand: brands.data.map((x) => ({ id: x.id, label: x.label })),
      service: content(services.data),
      project: content(projects.data),
      post: content(posts.data),
      page: content(pages.data),
      post_category: postCategories.data.map((x) => ({ id: x.id, label: x.name })),
    },
  };
}
