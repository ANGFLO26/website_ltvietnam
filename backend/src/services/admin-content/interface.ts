import type {
  AdminContentKind,
  AdminContentListItemView,
  AdminEntityStatus,
  Locale,
} from '@ltv/contracts';

export const ADMIN_CONTENT_SERVICE = Symbol('ADMIN_CONTENT_SERVICE');
export type { AdminContentKind } from '@ltv/contracts';

export interface AdminContentFilter {
  readonly status?: AdminEntityStatus | undefined;
  readonly translationStatus?: 'draft' | 'published' | 'hidden' | undefined;
  readonly locale?: Locale | undefined;
  readonly search?: string | undefined;
  readonly includeDeleted?: boolean | undefined;
  readonly isFeatured?: boolean | undefined;
  readonly projectType?: string | undefined;
  readonly categoryId?: string | undefined;
  readonly parentId?: string | null | undefined;
}

export interface AdminContentService {
  list(
    kind: AdminContentKind,
    filter: AdminContentFilter,
    page: { page: number; pageSize: number },
  ): Promise<{
    items: readonly AdminContentListItemView[];
    page: number;
    pageSize: number;
    totalItems: number;
  }>;
  findById(kind: AdminContentKind, id: string): Promise<unknown>;
  create(kind: AdminContentKind, input: Record<string, unknown>, actorId: string): Promise<unknown>;
  update(
    kind: AdminContentKind,
    id: string,
    input: Record<string, unknown>,
    actorId: string,
  ): Promise<unknown>;
  upsertTranslation(
    kind: AdminContentKind,
    id: string,
    locale: Locale,
    input: Record<string, unknown>,
  ): Promise<unknown>;
  delete(kind: AdminContentKind, id: string, hard: boolean): Promise<void>;
  restore(kind: AdminContentKind, id: string): Promise<unknown>;

  listPostCategories(
    filter: Record<string, unknown>,
    page: { page: number; pageSize: number },
  ): Promise<{
    items: readonly unknown[];
    page: number;
    pageSize: number;
    totalItems: number;
  }>;
  findPostCategory(id: string): Promise<unknown>;
  createPostCategory(input: Record<string, unknown>): Promise<unknown>;
  updatePostCategory(id: string, input: Record<string, unknown>): Promise<unknown>;
  publishPostCategory(id: string): Promise<unknown>;
  hidePostCategory(id: string): Promise<unknown>;
  deletePostCategory(id: string, hard: boolean): Promise<void>;
  restorePostCategory(id: string): Promise<unknown>;
}
