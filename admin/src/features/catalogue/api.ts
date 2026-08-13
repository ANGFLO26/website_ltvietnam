'use client';

import type {
  AdminDocumentDetailView,
  AdminDocumentView,
  AdminDocumentWriteRequest,
  AdminMediaMetadataRequest,
  AdminProductDetailView,
  AdminProductListItemView,
  AdminProductWriteRequest,
  AdminTaxonomyDetailView,
  AdminTaxonomyKind,
  AdminTaxonomyListItemView,
  AdminTaxonomyWriteRequest,
  MediaAdminView,
} from '@ltv/contracts';
import { adminBrowserPage, adminBrowserRequest } from '@/lib/api/client.browser';

export const catalogueKeys = {
  media: (query = '') => ['catalogue', 'media', query] as const,
  taxonomy: (kind: AdminTaxonomyKind, query = '') =>
    ['catalogue', 'taxonomy', kind, query] as const,
  products: (query = '') => ['catalogue', 'products', query] as const,
  documents: (query = '') => ['catalogue', 'documents', query] as const,
};

export const listMedia = (query: string) =>
  adminBrowserPage<MediaAdminView>(`/admin/media${query}`);
export const getMedia = (id: string) => adminBrowserRequest<MediaAdminView>(`/admin/media/${id}`);
export const uploadMedia = (body: FormData) =>
  adminBrowserRequest<MediaAdminView>('/admin/media', { method: 'POST', body });
export const updateMedia = (id: string, body: AdminMediaMetadataRequest) =>
  adminBrowserRequest<MediaAdminView>(`/admin/media/${id}`, { method: 'PATCH', body });

export const taxonomyPath: Record<AdminTaxonomyKind, string> = {
  brand: 'brands',
  product_category: 'product-categories',
  standard: 'standards',
  application: 'applications',
  industry: 'industries',
};
export const listTaxonomy = (kind: AdminTaxonomyKind, query: string) =>
  adminBrowserPage<AdminTaxonomyListItemView>(`/admin/${taxonomyPath[kind]}${query}`);
export const getTaxonomy = (kind: AdminTaxonomyKind, id: string) =>
  adminBrowserRequest<AdminTaxonomyDetailView>(`/admin/${taxonomyPath[kind]}/${id}`);
export const createTaxonomy = (kind: AdminTaxonomyKind, body: AdminTaxonomyWriteRequest) =>
  adminBrowserRequest<AdminTaxonomyDetailView>(`/admin/${taxonomyPath[kind]}`, {
    method: 'POST',
    body,
  });
export const updateTaxonomy = (
  kind: AdminTaxonomyKind,
  id: string,
  body: AdminTaxonomyWriteRequest,
) =>
  adminBrowserRequest<AdminTaxonomyDetailView>(`/admin/${taxonomyPath[kind]}/${id}`, {
    method: 'PATCH',
    body,
  });

export const listProducts = (query: string) =>
  adminBrowserPage<AdminProductListItemView>(`/admin/products${query}`);
export const getProduct = (id: string) =>
  adminBrowserRequest<AdminProductDetailView>(`/admin/products/${id}`);
export const createProduct = (body: AdminProductWriteRequest) =>
  adminBrowserRequest<AdminProductDetailView>('/admin/products', { method: 'POST', body });
export const updateProduct = (id: string, body: AdminProductWriteRequest) =>
  adminBrowserRequest<AdminProductDetailView>(`/admin/products/${id}`, {
    method: 'PATCH',
    body,
  });

export const listDocuments = (query: string) =>
  adminBrowserPage<AdminDocumentView>(`/admin/documents${query}`);
export const getDocument = (id: string) =>
  adminBrowserRequest<AdminDocumentDetailView>(`/admin/documents/${id}`);
export const createDocument = (body: AdminDocumentWriteRequest) =>
  adminBrowserRequest<AdminDocumentView>('/admin/documents', { method: 'POST', body });
export const updateDocument = (id: string, body: AdminDocumentWriteRequest) =>
  adminBrowserRequest<AdminDocumentView>(`/admin/documents/${id}`, { method: 'PATCH', body });
