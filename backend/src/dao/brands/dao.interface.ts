import type { Paged, Page } from '../helpers.js';
import type { TreeNode } from '../tree.dao.js';
import type { Brand, BrandFilter, CreateBrandInput, UpdateBrandInput } from './object.js';

/**
 * Hop dong truy cap du lieu cho bang `brands`.
 * KHONG co tham so executor — DAO lay tu `tx` da gan san transaction.
 */
export interface BrandDao {
  findById(id: string): Promise<Brand | null>;
  findBySlug(slug: string): Promise<Brand | null>;
  list(filter: BrandFilter, page?: Partial<Page>): Promise<Paged<Brand>>;

  insert(input: CreateBrandInput): Promise<Brand>;
  update(id: string, input: UpdateBrandInput): Promise<Brand>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;

  publish(id: string, at: Date): Promise<Brand>;
  unpublish(id: string): Promise<Brand>;

  // ── cay (ADR-015) ─────────────────────────────────────────────
  /** Toan bo id trong nhanh, KE CA chinh no. Dung cho bo loc theo hang me. */
  findSubtreeIds(rootId: string): Promise<string[]>;
  findSubtreeIdsOfMany(rootIds: readonly string[]): Promise<string[]>;
  findAncestors(id: string): Promise<TreeNode[]>;
  findChildren(parentId: string | null): Promise<TreeNode[]>;
  /** Doi cha va tinh lai ca nhanh con. Phai goi trong transaction. */
  moveNode(id: string, newParentId: string | null): Promise<void>;
  findInconsistentNodes(): Promise<string[]>;

  // ── slug (ADR-002) ────────────────────────────────────────────
  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean>;
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void>;
  wasEverPublished(id: string): Promise<boolean>;
  canHardDelete(id: string): Promise<boolean>;
}
