import type { EntityStatus } from '../brands/object.js';
import type { ContentBlock } from '../content.js';

/**
 * Ung dung / phep thu — CAY (ADR-015).
 *
 * Vi du that tu website: "Phan tich dau mo" -> "Chung cat" -> "Diem soi dau".
 * Loc theo nut cha phai bat het nhanh con, nen di qua `ancestor_ids`.
 *
 * `isFeatured` co that trong so do: API cong khai hua truong `popular_*`,
 * ma khong co cot nay thi khong co gi de xep hang.
 */
export interface Application {
  readonly id: string;
  readonly parentId: string | null;
  readonly ancestorIds: string[];
  readonly depth: number;
  readonly name: string;
  readonly slug: string;
  readonly description: ContentBlock[];
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly iconId: string | null;
  readonly status: EntityStatus;
  readonly isFeatured: boolean;
  readonly displayOrder: number;
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

export interface CreateApplicationInput {
  readonly parentId?: string | null;
  readonly name: string;
  readonly slug: string;
  readonly description?: ContentBlock[];
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly iconId?: string | null;
}

export type UpdateApplicationInput = Partial<Omit<CreateApplicationInput, 'parentId'>> & {
  readonly isFeatured?: boolean;
  readonly displayOrder?: number;
};

export interface ApplicationFilter {
  readonly status?: EntityStatus;
  readonly isFeatured?: boolean;
  readonly parentId?: string | null;
  readonly includeDeleted?: boolean;
}
