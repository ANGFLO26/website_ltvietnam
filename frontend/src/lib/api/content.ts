import type {
  DocumentCardView,
  DocumentDetailView,
  Locale,
  PageDetailView,
  PostCardView,
  PostCategoryView,
  PostDetailView,
  ProjectCardView,
  ProjectDetailView,
  ServiceCardView,
  ServiceDetailView,
  ServiceTreeView,
} from '@ltv/contracts';
import { apiGet, apiGetPage, type ApiQuery } from './client.server';

const translatedQuery = (locale: Locale, query: ApiQuery = {}): ApiQuery => ({
  ...query,
  locale,
});

export const getPage = (slug: string, locale: Locale = 'en') =>
  apiGet<PageDetailView>(`/pages/${part(slug)}`, { query: { locale } });

export const getServices = (locale: Locale = 'en', query: ApiQuery = {}) =>
  apiGetPage<ServiceCardView>('/services', { query: translatedQuery(locale, query) });
export const getServiceTree = (locale: Locale = 'en') =>
  apiGet<readonly ServiceTreeView[]>('/services/tree', { query: { locale } });
export const getService = (slug: string, locale: Locale = 'en') =>
  apiGet<ServiceDetailView>(`/services/${part(slug)}`, { query: { locale } });

export const getProjects = (locale: Locale = 'en', query: ApiQuery = {}) =>
  apiGetPage<ProjectCardView>('/projects', { query: translatedQuery(locale, query) });
export const getProject = (slug: string, locale: Locale = 'en') =>
  apiGet<ProjectDetailView>(`/projects/${part(slug)}`, { query: { locale } });

export const getPosts = (locale: Locale = 'en', query: ApiQuery = {}) =>
  apiGetPage<PostCardView>('/posts', { query: translatedQuery(locale, query) });
export const getPost = (slug: string, locale: Locale = 'en') =>
  apiGet<PostDetailView>(`/posts/${part(slug)}`, { query: { locale } });
export const getPostCategories = (query: ApiQuery = {}) =>
  apiGetPage<PostCategoryView>('/post-categories', { query });
export const getPostsByCategory = (slug: string, locale: Locale = 'en', query: ApiQuery = {}) =>
  apiGetPage<PostCardView>(`/post-categories/${part(slug)}/posts`, {
    query: translatedQuery(locale, query),
  });

export const getDocuments = (query: ApiQuery = {}) =>
  apiGetPage<DocumentCardView>('/documents', { query });
export const getDocument = (slug: string) => apiGet<DocumentDetailView>(`/documents/${part(slug)}`);

export const getIndustryServices = (slug: string, locale: Locale = 'en', query: ApiQuery = {}) =>
  apiGetPage<ServiceCardView>(`/industries/${part(slug)}/services`, {
    query: translatedQuery(locale, query),
  });

function part(value: string): string {
  return encodeURIComponent(value);
}
