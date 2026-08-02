import type { Page, Paged } from '../helpers.js';
import type { TreeNode } from '../tree.dao.js';
import type {
  CreateProductCategoryInput,
  ProductCategory,
  ProductCategoryFilter,
  UpdateProductCategoryInput,
} from './object.js';

export interface ProductCategoryDao {
  findById(id: string): Promise<ProductCategory | null>;
  findBySlug(slug: string): Promise<ProductCategory | null>;
  list(filter: ProductCategoryFilter, page?: Partial<Page>): Promise<Paged<ProductCategory>>;

  insert(input: CreateProductCategoryInput): Promise<ProductCategory>;
  update(id: string, input: UpdateProductCategoryInput): Promise<ProductCategory>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<ProductCategory>;
  unpublish(id: string): Promise<ProductCategory>;

  // ── cay (ADR-015) ──
  /** Ca nhanh, KE CA chinh no. Day la ham ma bo loc danh muc dua vao. */
  findSubtreeIds(rootId: string): Promise<string[]>;
  findSubtreeIdsOfMany(rootIds: readonly string[]): Promise<string[]>;
  findAncestors(id: string): Promise<TreeNode[]>;
  findChildren(parentId: string | null): Promise<TreeNode[]>;
  moveNode(id: string, newParentId: string | null): Promise<void>;
  findInconsistentNodes(): Promise<string[]>;

  // ── slug (ADR-002) ──
  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean>;
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void>;
  wasEverPublished(id: string): Promise<boolean>;
  canHardDelete(id: string): Promise<boolean>;
}
