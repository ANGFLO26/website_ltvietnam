import type { Page, Paged } from '../helpers.js';
import type { TreeNode } from '../tree.dao.js';
import type {
  CreatePostCategoryInput,
  PostCategory,
  PostCategoryFilter,
  UpdatePostCategoryInput,
} from './object.js';

export interface PostCategoryDao {
  findById(id: string): Promise<PostCategory | null>;
  findBySlug(slug: string): Promise<PostCategory | null>;
  list(filter: PostCategoryFilter, page?: Partial<Page>): Promise<Paged<PostCategory>>;

  insert(input: CreatePostCategoryInput): Promise<PostCategory>;
  update(id: string, input: UpdatePostCategoryInput): Promise<PostCategory>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<PostCategory>;
  unpublish(id: string): Promise<PostCategory>;

  /**
   * Con bai viet nao dang tro toi khong.
   *
   * `posts.category_id` la NOT NULL + RESTRICT, nen xoa danh muc con bai viet
   * se bi PostgreSQL tu choi. Ham nay de giao dien noi duoc LY DO thay vi
   * de nguoi dung nhan mot loi rang buoc kho hieu.
   */
  countPosts(id: string): Promise<number>;

  findSubtreeIds(rootId: string): Promise<string[]>;
  findAncestors(id: string): Promise<TreeNode[]>;
  findChildren(parentId: string | null): Promise<TreeNode[]>;
  moveNode(id: string, newParentId: string | null): Promise<void>;
  findInconsistentNodes(): Promise<string[]>;

  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean>;
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void>;
  canHardDelete(id: string): Promise<boolean>;
}
