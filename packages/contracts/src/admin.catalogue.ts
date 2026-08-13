import type { ContentBlock } from './blocks.js';
import type { AdminEntityStatus, AdminTaxonomyKind } from './admin.view.js';

export type AdminBrandType =
  'manufacturer' | 'sub_brand' | 'global_partner' | 'service_partner' | 'supplier';

export interface AdminTaxonomyDetailView {
  readonly id: string;
  readonly kind?: AdminTaxonomyKind;
  readonly parent_id?: string | null;
  readonly ancestor_ids?: readonly string[];
  readonly depth?: number;
  readonly brand_type?: AdminBrandType;
  readonly name?: string | null;
  readonly slug: string;
  readonly short_description?: string | null;
  readonly description?: readonly ContentBlock[] | string | null;
  readonly code?: string | null;
  readonly organization?: string;
  readonly country_code?: string | null;
  readonly website_url?: string | null;
  readonly logo_id?: string | null;
  readonly cover_image_id?: string | null;
  readonly featured_image_id?: string | null;
  readonly icon_id?: string | null;
  readonly seo_title?: string | null;
  readonly seo_description?: string | null;
  readonly status: AdminEntityStatus;
  readonly is_featured: boolean;
  readonly display_order: number;
  readonly published_at: string | null;
  readonly first_published_at: string | null;
}

export interface AdminTaxonomyWriteRequest {
  readonly parent_id?: string | null;
  readonly brand_type?: AdminBrandType;
  readonly name?: string | null;
  readonly slug?: string;
  readonly short_description?: string | null;
  readonly description?: readonly ContentBlock[] | string | null;
  readonly code?: string | null;
  readonly organization?: string;
  readonly country_code?: string | null;
  readonly website_url?: string | null;
  readonly logo_id?: string | null;
  readonly cover_image_id?: string | null;
  readonly featured_image_id?: string | null;
  readonly icon_id?: string | null;
  readonly seo_title?: string | null;
  readonly seo_description?: string | null;
  readonly is_featured?: boolean;
  readonly display_order?: number;
}

export type AdminProductType =
  'equipment' | 'spare_part' | 'accessory' | 'consumable' | 'chemical' | 'other';
export type AdminComplianceType = 'compliance' | 'correlation' | 'specification' | 'reference';
export type AdminProductMediaRole =
  'gallery' | 'diagram' | 'application' | 'interface' | 'dimension';
export type AdminProductRelationType =
  'similar' | 'alternative' | 'accessory' | 'compatible' | 'recommended';

export interface AdminProductEntityView {
  readonly id: string;
  readonly brand_id: string;
  readonly featured_image_id: string | null;
  readonly name: string;
  readonly slug: string;
  readonly short_description: string | null;
  readonly overview: readonly ContentBlock[];
  readonly features: readonly ContentBlock[];
  readonly applications_text: readonly ContentBlock[];
  readonly principle: readonly ContentBlock[];
  readonly sample_types: readonly ContentBlock[];
  readonly operating_conditions: readonly ContentBlock[];
  readonly accessories_options: readonly ContentBlock[];
  readonly seo_title: string | null;
  readonly seo_description: string | null;
  readonly model: string | null;
  readonly internal_code: string | null;
  readonly sku: string | null;
  readonly product_type: AdminProductType;
  readonly price_visibility: 'hidden' | 'visible' | 'contact';
  readonly sale_mode: 'inquiry' | 'online';
  readonly requires_configuration: boolean;
  readonly warranty_months: number | null;
  readonly status: AdminEntityStatus;
  readonly is_featured: boolean;
  readonly display_order: number;
  readonly published_at: string | null;
  readonly first_published_at: string | null;
  readonly discontinued_at: string | null;
}

export interface AdminProductDetailView {
  readonly product: AdminProductEntityView;
  readonly brand: { readonly id: string; readonly name: string; readonly slug: string };
  readonly categories: readonly {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly is_primary: boolean;
  }[];
  readonly standards: readonly {
    readonly id: string;
    readonly organization: string;
    readonly code: string;
    readonly name: string | null;
    readonly slug: string;
    readonly compliance_type: AdminComplianceType;
    readonly note: string | null;
    readonly display_order: number;
  }[];
  readonly applications: readonly {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly is_primary: boolean;
  }[];
  readonly industries: readonly {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
  }[];
  readonly media: readonly {
    readonly id: string;
    readonly storage_path: string;
    readonly public_url: string | null;
    readonly alt_text: string | null;
    readonly caption: string | null;
    readonly width: number | null;
    readonly height: number | null;
    readonly media_role: AdminProductMediaRole;
    readonly display_order: number;
  }[];
  readonly specifications: readonly {
    readonly id: string;
    readonly group_key: string | null;
    readonly label: string;
    readonly value: string | null;
    readonly unit: string | null;
    readonly display_order: number;
  }[];
  readonly related: readonly {
    readonly relation_type: AdminProductRelationType;
    readonly display_order: number;
    readonly card: {
      readonly id: string;
      readonly name: string;
      readonly slug: string;
      readonly model: string | null;
    };
  }[];
}

export interface AdminProductWriteRequest {
  readonly brand_id?: string;
  readonly name?: string;
  readonly slug?: string;
  readonly short_description?: string | null;
  readonly model?: string | null;
  readonly internal_code?: string | null;
  readonly sku?: string | null;
  readonly product_type?: AdminProductType;
  readonly featured_image_id?: string | null;
  readonly overview?: readonly ContentBlock[];
  readonly features?: readonly ContentBlock[];
  readonly applications_text?: readonly ContentBlock[];
  readonly principle?: readonly ContentBlock[];
  readonly sample_types?: readonly ContentBlock[];
  readonly operating_conditions?: readonly ContentBlock[];
  readonly accessories_options?: readonly ContentBlock[];
  readonly seo_title?: string | null;
  readonly seo_description?: string | null;
  readonly price_visibility?: 'hidden' | 'visible' | 'contact';
  readonly sale_mode?: 'inquiry' | 'online';
  readonly requires_configuration?: boolean;
  readonly warranty_months?: number | null;
  readonly is_featured?: boolean;
  readonly display_order?: number;
  readonly discontinued_at?: string | null;
  readonly categories?: readonly { readonly category_id: string; readonly is_primary?: boolean }[];
  readonly standards?: readonly {
    readonly standard_id: string;
    readonly compliance_type?: AdminComplianceType;
    readonly note?: string | null;
    readonly display_order?: number;
  }[];
  readonly applications?: readonly {
    readonly application_id: string;
    readonly is_primary?: boolean;
  }[];
  readonly industries?: readonly { readonly industry_id: string }[];
  readonly media?: readonly {
    readonly media_id: string;
    readonly media_role?: AdminProductMediaRole;
    readonly display_order?: number;
  }[];
  readonly related_products?: readonly {
    readonly related_product_id: string;
    readonly relation_type: AdminProductRelationType;
    readonly display_order?: number;
  }[];
  readonly specifications?: readonly {
    readonly id?: string;
    readonly group_key?: string | null;
    readonly label: string;
    readonly value?: string | null;
    readonly unit?: string | null;
    readonly display_order?: number;
  }[];
}

export type AdminDocumentType =
  | 'catalogue'
  | 'brochure'
  | 'datasheet'
  | 'application_note'
  | 'company_profile'
  | 'manual'
  | 'certificate'
  | 'other';
export type AdminDocumentVisibility =
  'public' | 'hidden' | 'email_required' | 'customer_only' | 'staff_only';

export interface AdminDocumentView {
  readonly id: string;
  readonly document_type: AdminDocumentType;
  readonly file_id: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string | null;
  readonly seo_title: string | null;
  readonly seo_description: string | null;
  readonly language: 'vi' | 'en' | 'multi';
  readonly version: string | null;
  readonly publication_date: string | null;
  readonly status: AdminEntityStatus;
  readonly visibility: AdminDocumentVisibility;
  readonly download_count: number;
  readonly published_at: string | null;
  readonly first_published_at: string | null;
}

export interface AdminDocumentDetailView {
  readonly document: AdminDocumentView;
  readonly links: {
    readonly product_ids: readonly string[];
    readonly brand_ids: readonly string[];
    readonly service_ids: readonly string[];
    readonly post_ids: readonly string[];
  };
}

export interface AdminDocumentWriteRequest {
  readonly document_type?: AdminDocumentType;
  readonly file_id?: string;
  readonly title?: string;
  readonly slug?: string;
  readonly description?: string | null;
  readonly language?: 'vi' | 'en' | 'multi';
  readonly version?: string | null;
  readonly publication_date?: string | null;
  readonly visibility?: AdminDocumentVisibility;
  readonly seo_title?: string | null;
  readonly seo_description?: string | null;
  readonly product_ids?: readonly string[];
  readonly brand_ids?: readonly string[];
  readonly service_ids?: readonly string[];
  readonly post_ids?: readonly string[];
}

export interface AdminMediaMetadataRequest {
  readonly title?: string | null;
  readonly alt_text?: string | null;
  readonly caption?: string | null;
  readonly credit?: string | null;
}
