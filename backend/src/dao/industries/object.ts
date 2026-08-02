import type { EntityStatus } from '../brands/object.js';
import type { ContentBlock } from '../content.js';

/**
 * Nganh hang — PHANG, khong phai cay.
 *
 * "Dau khi", "Hoa chat", "Duoc pham", "Thuc pham". Danh sach nay ngan va it
 * doi; khong co nhu cau phan cap nao trong du lieu that, nen khong dung
 * `TreeDao`. Neu ngay nao do can phan cap thi them ba cot va doi lop cha —
 * re hon la mang san mot cai cay khong ai dung.
 */
export interface Industry {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: ContentBlock[];
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly featuredImageId: string | null;
  readonly iconId: string | null;
  readonly status: EntityStatus;
  readonly isFeatured: boolean;
  readonly displayOrder: number;
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

export interface CreateIndustryInput {
  readonly name: string;
  readonly slug: string;
  readonly description?: ContentBlock[];
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly featuredImageId?: string | null;
  readonly iconId?: string | null;
}

export type UpdateIndustryInput = Partial<CreateIndustryInput> & {
  readonly isFeatured?: boolean;
  readonly displayOrder?: number;
};

export interface IndustryFilter {
  readonly status?: EntityStatus;
  readonly isFeatured?: boolean;
  readonly includeDeleted?: boolean;
}
