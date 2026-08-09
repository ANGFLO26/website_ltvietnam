import type { ContentBlock } from '@ltv/contracts';
import type { Application } from '../../dao/applications/object.js';
import type { Brand, BrandType, EntityStatus } from '../../dao/brands/object.js';
import type { Industry } from '../../dao/industries/object.js';
import type { ProductCategory } from '../../dao/product-categories/object.js';
import type { Standard } from '../../dao/standards/object.js';

export const ADMIN_TAXONOMY_SERVICE = Symbol('ADMIN_TAXONOMY_SERVICE');

export type AdminTaxonomyKind =
  'brand' | 'product_category' | 'standard' | 'application' | 'industry';

export type AdminTaxonomyEntity = Brand | ProductCategory | Standard | Application | Industry;

export interface AdminTaxonomyPage {
  readonly items: readonly AdminTaxonomyEntity[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
}

export interface AdminTaxonomyFilter {
  readonly status?: EntityStatus | undefined;
  readonly isFeatured?: boolean | undefined;
  readonly parentId?: string | null | undefined;
  readonly includeDeleted?: boolean | undefined;
  readonly organization?: string | undefined;
  readonly search?: string | undefined;
}

export interface AdminTaxonomyWrite {
  readonly parentId?: string | null | undefined;
  readonly brandType?: BrandType | undefined;
  readonly name?: string | null | undefined;
  readonly slug?: string | undefined;
  readonly shortDescription?: string | null | undefined;
  readonly description?: ContentBlock[] | string | null | undefined;
  readonly code?: string | null | undefined;
  readonly organization?: string | undefined;
  readonly countryCode?: string | null | undefined;
  readonly websiteUrl?: string | null | undefined;
  readonly logoId?: string | null | undefined;
  readonly coverImageId?: string | null | undefined;
  readonly featuredImageId?: string | null | undefined;
  readonly iconId?: string | null | undefined;
  readonly seoTitle?: string | null | undefined;
  readonly seoDescription?: string | null | undefined;
  readonly isFeatured?: boolean | undefined;
  readonly displayOrder?: number | undefined;
}

export interface AdminTaxonomyService {
  list(
    kind: AdminTaxonomyKind,
    filter: AdminTaxonomyFilter,
    page: { readonly page: number; readonly pageSize: number },
  ): Promise<AdminTaxonomyPage>;
  findById(kind: AdminTaxonomyKind, id: string): Promise<AdminTaxonomyEntity>;
  create(kind: AdminTaxonomyKind, input: AdminTaxonomyWrite): Promise<AdminTaxonomyEntity>;
  update(
    kind: AdminTaxonomyKind,
    id: string,
    input: AdminTaxonomyWrite,
  ): Promise<AdminTaxonomyEntity>;
  publish(kind: AdminTaxonomyKind, id: string): Promise<AdminTaxonomyEntity>;
  hide(kind: AdminTaxonomyKind, id: string): Promise<AdminTaxonomyEntity>;
  delete(kind: AdminTaxonomyKind, id: string, hard: boolean): Promise<void>;
  restore(kind: AdminTaxonomyKind, id: string): Promise<AdminTaxonomyEntity>;
}
