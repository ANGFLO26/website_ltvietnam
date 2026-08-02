import type { EntityStatus } from '../brands/object.js';
import type { ContentBlock } from '../content.js';

/**
 * Danh muc san pham — CAY (ADR-015).
 *
 * ADR-010: mot san pham thuoc NHIEU danh muc nhung chi MOT la `primary`.
 * Bo loc theo danh muc cap 1 phai bat ca san pham gan o cap 2-3, nen moi truy
 * van loc di qua `ancestor_ids` chu khong qua `parent_id`.
 */
export interface ProductCategory {
  readonly id: string;
  readonly parentId: string | null;
  readonly ancestorIds: string[];
  readonly depth: number;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription: string | null;
  readonly description: ContentBlock[];
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly code: string | null;
  readonly featuredImageId: string | null;
  readonly iconId: string | null;
  readonly status: EntityStatus;
  readonly isFeatured: boolean;
  readonly displayOrder: number;
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

/** Dieu kien publish (`05` PHAN IV): name, slug, short_description. */
export interface PublishedProductCategory extends ProductCategory {
  readonly status: 'published';
  readonly shortDescription: string;
  readonly publishedAt: Date;
}

export interface CreateProductCategoryInput {
  readonly parentId?: string | null;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription?: string | null;
  readonly description?: ContentBlock[];
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly code?: string | null;
  readonly featuredImageId?: string | null;
  readonly iconId?: string | null;
}

export type UpdateProductCategoryInput = Partial<Omit<CreateProductCategoryInput, 'parentId'>> & {
  readonly isFeatured?: boolean;
  readonly displayOrder?: number;
};

export interface ProductCategoryFilter {
  readonly status?: EntityStatus;
  readonly isFeatured?: boolean;
  readonly parentId?: string | null;
  readonly includeDeleted?: boolean;
}
