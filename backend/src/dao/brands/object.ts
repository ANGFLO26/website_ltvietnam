/**
 * Thuc the nghiep vu `Brand`.
 *
 * Hang mang cau truc cay: PAC -> HERZOG/ISL/ALCOR/ANTEK/AC (ADR-015).
 * `ancestorIds` va `depth` do `TreeDao` duy tri, DAO con khong tu tinh.
 */
export type BrandType = 'manufacturer' | 'sub_brand' | 'global_partner' | 'service_partner' | 'supplier';
export type EntityStatus = 'draft' | 'published' | 'hidden' | 'archived';

export interface Brand {
  readonly id: string;
  readonly parentId: string | null;
  readonly ancestorIds: string[];
  readonly depth: number;
  readonly brandType: BrandType;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription: string | null;
  readonly code: string | null;
  readonly countryCode: string | null;
  readonly websiteUrl: string | null;
  readonly logoId: string | null;
  readonly coverImageId: string | null;
  readonly status: EntityStatus;
  readonly isFeatured: boolean;
  readonly displayOrder: number;
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

/**
 * Hang da xuat ban — bat bien manh hon.
 * Dieu kien publish o `05` PHAN IV: name, slug, logo, short_description, brand_type.
 */
export interface PublishedBrand extends Brand {
  readonly status: 'published';
  readonly shortDescription: string;
  readonly logoId: string;
  readonly publishedAt: Date;
}

export interface CreateBrandInput {
  readonly parentId?: string | null;
  readonly brandType: BrandType;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription?: string | null;
  readonly code?: string | null;
  readonly countryCode?: string | null;
  readonly websiteUrl?: string | null;
  readonly logoId?: string | null;
  readonly coverImageId?: string | null;
}

export type UpdateBrandInput = Partial<Omit<CreateBrandInput, 'parentId'>> & {
  readonly isFeatured?: boolean;
  readonly displayOrder?: number;
};

export interface BrandFilter {
  readonly status?: EntityStatus;
  readonly isFeatured?: boolean;
  readonly parentId?: string | null;
  readonly includeDeleted?: boolean;
}
