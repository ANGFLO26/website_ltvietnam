'use client';

import type {
  AdminContentDetailView,
  AdminContentEntityWriteRequest,
  AdminContentListItemView,
  AdminContentTranslationView,
  AdminContentTranslationWriteRequest,
  AdminLocale,
  AdminPostCategoryView,
  AdminPostCategoryWriteRequest,
} from '@ltv/contracts';
import { adminBrowserPage, adminBrowserRequest } from '@/lib/api/client.browser';
import type { ContentResource } from './config';

export const contentKeys = {
  list: (resource: ContentResource, query = '') => ['content', resource, query] as const,
  detail: (resource: ContentResource, id: string) => ['content', resource, id] as const,
};

export function listContent(resource: Exclude<ContentResource, 'post-categories'>, query: string) {
  return adminBrowserPage<AdminContentListItemView>(`/admin/${resource}${query}`);
}
export function listPostCategories(query: string) {
  return adminBrowserPage<AdminPostCategoryView>(`/admin/post-categories${query}`);
}
export function getContent(resource: Exclude<ContentResource, 'post-categories'>, id: string) {
  return adminBrowserRequest<AdminContentDetailView>(`/admin/${resource}/${id}`);
}
export function createContent(
  resource: Exclude<ContentResource, 'post-categories'>,
  body: AdminContentEntityWriteRequest,
) {
  return adminBrowserRequest<AdminContentDetailView>(`/admin/${resource}`, {
    method: 'POST',
    body,
  });
}
export function updateContent(
  resource: Exclude<ContentResource, 'post-categories'>,
  id: string,
  body: AdminContentEntityWriteRequest,
) {
  return adminBrowserRequest<AdminContentDetailView>(`/admin/${resource}/${id}`, {
    method: 'PATCH',
    body,
  });
}
export function saveTranslation(
  resource: Exclude<ContentResource, 'post-categories'>,
  id: string,
  locale: AdminLocale,
  body: AdminContentTranslationWriteRequest,
) {
  return adminBrowserRequest<AdminContentTranslationView>(
    `/admin/${resource}/${id}/translations/${locale}`,
    { method: 'PATCH', body },
  );
}
export function getPostCategory(id: string) {
  return adminBrowserRequest<AdminPostCategoryView>(`/admin/post-categories/${id}`);
}
export function createPostCategory(body: AdminPostCategoryWriteRequest) {
  return adminBrowserRequest<AdminPostCategoryView>('/admin/post-categories', {
    method: 'POST',
    body,
  });
}
export function updatePostCategory(id: string, body: AdminPostCategoryWriteRequest) {
  return adminBrowserRequest<AdminPostCategoryView>(`/admin/post-categories/${id}`, {
    method: 'PATCH',
    body,
  });
}
