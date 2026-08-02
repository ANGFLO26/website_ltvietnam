import type { EntityStatus } from '../brands/object.js';

/**
 * Danh muc bai viet — CAY, va co slug KHONG phan theo locale.
 *
 * Khac `posts`: bai viet co bang dich vi noi dung dai va se duoc viet hai
 * thu tieng; danh muc thi chi la mot cai nhan ngan. ADR-014: "mot bang
 * translation chi dang ton tai neu se co nguoi ngoi xuong viet ban thu hai" —
 * khong ai ngoi xuong dich chu "Tin tuc" thanh mot bai viet rieng.
 */
export interface PostCategory {
  readonly id: string;
  readonly parentId: string | null;
  readonly ancestorIds: string[];
  readonly depth: number;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly status: EntityStatus;
  readonly displayOrder: number;
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

export interface CreatePostCategoryInput {
  readonly parentId?: string | null;
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
}

export type UpdatePostCategoryInput = Partial<Omit<CreatePostCategoryInput, 'parentId'>> & {
  readonly displayOrder?: number;
};

export interface PostCategoryFilter {
  readonly status?: EntityStatus;
  readonly parentId?: string | null;
  readonly includeDeleted?: boolean;
}
