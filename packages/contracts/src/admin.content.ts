import type { AdminEntityStatus } from './admin.view.js';
import type { ContentBlock, Faq } from './blocks.js';

export type AdminContentResource = 'services' | 'projects' | 'posts' | 'pages';
export type AdminContentDetailKind = 'service' | 'project' | 'post' | 'page';
export type AdminLocale = 'vi' | 'en';
export type AdminTranslationStatus = 'draft' | 'published' | 'hidden';

interface AdminTranslationBase {
  readonly id: string;
  readonly locale: AdminLocale;
  readonly slug: string;
  readonly seo_title: string | null;
  readonly seo_description: string | null;
  readonly status: AdminTranslationStatus;
  readonly published_at: string | null;
  readonly first_published_at: string | null;
}

export interface AdminServiceTranslationView extends AdminTranslationBase {
  readonly service_id: string;
  readonly name: string;
  readonly short_description: string | null;
  readonly overview: readonly ContentBlock[];
  readonly customer_problems: readonly ContentBlock[];
  readonly scope_of_work: readonly ContentBlock[];
  readonly process: readonly ContentBlock[];
  readonly benefits: readonly ContentBlock[];
  readonly faq: Faq;
}

export interface AdminProjectTranslationView extends AdminTranslationBase {
  readonly project_id: string;
  readonly title: string;
  readonly short_description: string | null;
  readonly scope_of_work: readonly ContentBlock[];
  readonly implementation: readonly ContentBlock[];
  readonly result: readonly ContentBlock[];
  readonly customer_display_name: string | null;
}

export interface AdminPostTranslationView extends AdminTranslationBase {
  readonly post_id: string;
  readonly title: string;
  readonly excerpt: string | null;
  readonly content: readonly ContentBlock[];
}

export interface AdminPageTranslationView extends AdminTranslationBase {
  readonly page_id: string;
  readonly title: string;
  readonly summary: string | null;
  readonly content: readonly ContentBlock[];
}

export type AdminContentTranslationView =
  | AdminServiceTranslationView
  | AdminProjectTranslationView
  | AdminPostTranslationView
  | AdminPageTranslationView;

export interface AdminServiceEntityView {
  readonly id: string;
  readonly parent_id: string | null;
  readonly ancestor_ids: readonly string[];
  readonly depth: number;
  readonly service_type: string | null;
  readonly featured_image_id: string | null;
  readonly status: AdminEntityStatus;
  readonly is_featured: boolean;
  readonly display_order: number;
  readonly published_at: string | null;
}

export interface AdminProjectEntityView {
  readonly id: string;
  readonly customer_id: string | null;
  readonly project_type:
    | 'installation'
    | 'commissioning'
    | 'handover'
    | 'training'
    | 'maintenance'
    | 'repair'
    | 'fabrication'
    | 'case_study'
    | 'other';
  readonly customer_visibility: 'public' | 'hide_name' | 'industry_only' | 'confidential';
  readonly location_text: string | null;
  readonly country_code: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly featured_image_id: string | null;
  readonly status: AdminEntityStatus;
  readonly is_featured: boolean;
  readonly published_at: string | null;
}

export interface AdminPostEntityView {
  readonly id: string;
  readonly category_id: string;
  readonly featured_image_id: string | null;
  readonly author_id: string | null;
  readonly status: AdminEntityStatus;
  readonly is_featured: boolean;
  readonly published_at: string | null;
}

export interface AdminPageEntityView {
  readonly id: string;
  readonly page_type: string;
  readonly featured_image_id: string | null;
  readonly status: AdminEntityStatus;
  readonly is_system_page: boolean;
  readonly display_order: number;
  readonly published_at: string | null;
}

export interface AdminContentLinksView {
  readonly product_ids?: readonly string[];
  readonly brand_ids?: readonly string[];
  readonly industry_ids?: readonly string[];
  readonly service_ids?: readonly string[];
  readonly project_ids?: readonly string[];
}

export interface AdminProjectMediaView {
  readonly media_id: string;
  readonly caption: string | null;
  readonly display_order: number;
}

export interface AdminPostMediaView {
  readonly media_id: string;
  readonly display_order: number;
}

export type AdminContentDetailView =
  | {
      readonly kind: 'service';
      readonly entity: AdminServiceEntityView;
      readonly translations: readonly AdminServiceTranslationView[];
      readonly links: AdminContentLinksView;
      readonly media: readonly [];
    }
  | {
      readonly kind: 'project';
      readonly entity: AdminProjectEntityView;
      readonly translations: readonly AdminProjectTranslationView[];
      readonly links: AdminContentLinksView;
      readonly media: readonly AdminProjectMediaView[];
    }
  | {
      readonly kind: 'post';
      readonly entity: AdminPostEntityView;
      readonly translations: readonly AdminPostTranslationView[];
      readonly links: AdminContentLinksView;
      readonly media: readonly AdminPostMediaView[];
    }
  | {
      readonly kind: 'page';
      readonly entity: AdminPageEntityView;
      readonly translations: readonly AdminPageTranslationView[];
      readonly links: Record<string, never>;
      readonly media: readonly [];
    };

export interface AdminContentEntityWriteRequest {
  readonly parent_id?: string | null;
  readonly service_type?: string | null;
  readonly project_type?: AdminProjectEntityView['project_type'];
  readonly customer_id?: string | null;
  readonly customer_visibility?: AdminProjectEntityView['customer_visibility'];
  readonly location_text?: string | null;
  readonly country_code?: string | null;
  readonly started_at?: string | null;
  readonly completed_at?: string | null;
  readonly category_id?: string;
  readonly author_id?: string | null;
  readonly page_type?: string;
  readonly featured_image_id?: string | null;
  readonly is_system_page?: boolean;
  readonly is_featured?: boolean;
  readonly display_order?: number;
  readonly product_ids?: readonly string[];
  readonly brand_ids?: readonly string[];
  readonly industry_ids?: readonly string[];
  readonly service_ids?: readonly string[];
  readonly project_ids?: readonly string[];
  readonly media?: readonly (
    { readonly media_id: string; readonly caption?: string | null } | string
  )[];
}

export interface AdminContentTranslationWriteRequest {
  readonly name?: string;
  readonly title?: string;
  readonly slug?: string;
  readonly short_description?: string | null;
  readonly summary?: string | null;
  readonly excerpt?: string | null;
  readonly overview?: readonly ContentBlock[];
  readonly customer_problems?: readonly ContentBlock[];
  readonly scope_of_work?: readonly ContentBlock[];
  readonly process?: readonly ContentBlock[];
  readonly benefits?: readonly ContentBlock[];
  readonly implementation?: readonly ContentBlock[];
  readonly result?: readonly ContentBlock[];
  readonly content?: readonly ContentBlock[];
  readonly faq?: Faq;
  readonly customer_display_name?: string | null;
  readonly seo_title?: string | null;
  readonly seo_description?: string | null;
  readonly status?: AdminTranslationStatus;
}

export interface AdminPostCategoryView {
  readonly id: string;
  readonly parent_id: string | null;
  readonly ancestor_ids: readonly string[];
  readonly depth: number;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly seo_title: string | null;
  readonly seo_description: string | null;
  readonly status: AdminEntityStatus;
  readonly display_order: number;
  readonly published_at: string | null;
  readonly first_published_at: string | null;
}

export interface AdminPostCategoryWriteRequest {
  readonly parent_id?: string | null;
  readonly name?: string;
  readonly slug?: string;
  readonly description?: string | null;
  readonly seo_title?: string | null;
  readonly seo_description?: string | null;
  readonly display_order?: number;
}
