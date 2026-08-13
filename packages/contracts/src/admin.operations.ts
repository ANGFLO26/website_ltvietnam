import type { AdminEntityStatus } from './admin.view.js';

export interface AdminCustomerView {
  readonly id: string;
  readonly name: string;
  readonly short_description: string | null;
  readonly logo_id: string | null;
  readonly industry_id: string | null;
  readonly website_url: string | null;
  readonly is_public: boolean;
  readonly is_featured: boolean;
  readonly display_order: number;
  readonly status: AdminEntityStatus;
}
export interface AdminCustomerWriteRequest {
  readonly name?: string;
  readonly short_description?: string | null;
  readonly logo_id?: string | null;
  readonly industry_id?: string | null;
  readonly website_url?: string | null;
  readonly is_public?: boolean;
  readonly is_featured?: boolean;
  readonly display_order?: number;
}

export type AdminOfficeType =
  'head_office' | 'branch' | 'representative_office' | 'service_center' | 'workshop';
export interface AdminOfficeView {
  readonly id: string;
  readonly office_type: AdminOfficeType;
  readonly name: string;
  readonly address: string;
  readonly working_hours: string | null;
  readonly description: string | null;
  readonly phone: string | null;
  readonly fax: string | null;
  readonly email: string | null;
  readonly map_url: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly featured_image_id: string | null;
  readonly status: AdminEntityStatus;
  readonly display_order: number;
}
export type AdminOfficeWriteRequest = Partial<Omit<AdminOfficeView, 'id' | 'status'>>;

export type AdminBannerLinkType =
  | 'product'
  | 'product_category'
  | 'brand'
  | 'service'
  | 'project'
  | 'post'
  | 'page'
  | 'custom_url'
  | 'none';
export interface AdminBannerView {
  readonly id: string;
  readonly image_id: string;
  readonly mobile_image_id: string | null;
  readonly title: string;
  readonly subtitle: string | null;
  readonly button_label: string | null;
  readonly image_alt: string | null;
  readonly link_type: AdminBannerLinkType;
  readonly link_target_id: string | null;
  readonly custom_url: string | null;
  readonly open_new_tab: boolean;
  readonly status: 'draft' | 'published' | 'hidden';
  readonly display_order: number;
  readonly start_at: string | null;
  readonly end_at: string | null;
}
export type AdminBannerWriteRequest = Partial<Omit<AdminBannerView, 'id' | 'status'>>;

export const ADMIN_HOMEPAGE_SECTIONS = [
  'hero',
  'company_intro',
  'business_areas',
  'featured_categories',
  'featured_products',
  'featured_brands',
  'services',
  'capabilities',
  'projects',
  'posts',
  'customers',
  'contact_call_to_action',
  'offices',
] as const;
export type AdminHomepageSectionType = (typeof ADMIN_HOMEPAGE_SECTIONS)[number];
export const ADMIN_HOMEPAGE_SETTING_KEYS: Readonly<
  Record<AdminHomepageSectionType, readonly string[]>
> = {
  hero: ['limit', 'autoplay_ms'],
  company_intro: [],
  business_areas: ['limit'],
  featured_categories: ['limit'],
  featured_products: ['limit'],
  featured_brands: ['limit'],
  services: ['limit'],
  capabilities: [],
  projects: ['limit'],
  posts: ['limit'],
  customers: ['limit'],
  contact_call_to_action: [],
  offices: [],
};
export interface AdminHomepageSectionView {
  readonly id: string;
  readonly section_type: AdminHomepageSectionType;
  readonly is_enabled: boolean;
  readonly display_order: number;
  readonly settings: Readonly<Record<string, unknown>>;
}
export interface AdminHomepageSectionWriteRequest {
  readonly is_enabled?: boolean;
  readonly display_order?: number;
  readonly settings?: Readonly<Record<string, unknown>>;
}
export function adminHomepageSettingsIssues(
  sectionType: string,
  settings: Readonly<Record<string, unknown>>,
): readonly string[] {
  if (!ADMIN_HOMEPAGE_SECTIONS.includes(sectionType as AdminHomepageSectionType)) {
    return [`Loại section không được hỗ trợ: ${sectionType}`];
  }
  const allowed = ADMIN_HOMEPAGE_SETTING_KEYS[sectionType as AdminHomepageSectionType];
  const issues = Object.keys(settings)
    .filter((key) => !allowed.includes(key))
    .map((key) => `Cấu hình không được phép: ${sectionType}.${key}`);
  if ('limit' in settings) {
    const value = settings.limit;
    if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 24)
      issues.push('limit phải là số nguyên từ 1 đến 24');
  }
  if ('autoplay_ms' in settings) {
    const value = settings.autoplay_ms;
    if (!Number.isInteger(value) || Number(value) < 2_000 || Number(value) > 30_000)
      issues.push('autoplay_ms phải là số nguyên từ 2000 đến 30000');
  }
  return issues;
}

export type AdminMenuLocation =
  'header' | 'mobile' | 'footer_company' | 'footer_products' | 'footer_services' | 'footer_legal';
export type AdminMenuLinkType =
  | 'page'
  | 'product_category'
  | 'brand'
  | 'service'
  | 'post_category'
  | 'product'
  | 'post'
  | 'custom_url'
  | 'none';
export interface AdminMenuItemView {
  readonly id: string;
  readonly menu_id: string;
  readonly parent_id: string | null;
  readonly label: string;
  readonly label_i18n_key: string | null;
  readonly title_attribute: string | null;
  readonly link_type: AdminMenuLinkType;
  readonly link_target_id: string | null;
  readonly custom_url: string | null;
  readonly icon_id: string | null;
  readonly open_new_tab: boolean;
  readonly display_order: number;
  readonly status: 'active' | 'hidden';
}
export interface AdminMenuView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly location: AdminMenuLocation;
  readonly status: 'active' | 'hidden';
  readonly items: readonly AdminMenuItemView[];
}
export interface AdminMenuWriteRequest {
  readonly code?: string;
  readonly name?: string;
  readonly location?: AdminMenuLocation;
  readonly status?: 'active' | 'hidden';
}
export interface AdminMenuItemWriteRequest {
  readonly parent_id?: string | null;
  readonly label?: string;
  readonly label_i18n_key?: string | null;
  readonly title_attribute?: string | null;
  readonly link_type?: AdminMenuLinkType;
  readonly link_target_id?: string | null;
  readonly custom_url?: string | null;
  readonly icon_id?: string | null;
  readonly open_new_tab?: boolean;
  readonly display_order?: number;
  readonly status?: 'active' | 'hidden';
}

export interface AdminSettingView {
  readonly id: string;
  readonly group: string;
  readonly key: string;
  readonly value: string | null;
  readonly value_type: 'string' | 'integer' | 'boolean' | 'json' | 'encrypted';
  readonly is_public: boolean;
  readonly is_encrypted: boolean;
  readonly masked: boolean;
}
export interface AdminRedirectView {
  readonly id: string;
  readonly source_path: string;
  readonly target_path: string;
  readonly redirect_type: 301 | 302;
  readonly status: 'active' | 'disabled';
  readonly hit_count: number;
  readonly last_hit_at: string | null;
  readonly created_at: string;
}
export interface AdminRedirectWriteRequest {
  readonly source_path?: string;
  readonly target_path?: string;
  readonly redirect_type?: 301 | 302;
  readonly status?: 'active' | 'disabled';
}
export interface AdminManagedUserView {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: 'admin';
  readonly status: 'active' | 'disabled' | 'locked';
  readonly last_login_at: string | null;
  readonly password_changed_at: string | null;
  readonly created_at: string;
}
export interface AdminManagedUserCreateRequest {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}
