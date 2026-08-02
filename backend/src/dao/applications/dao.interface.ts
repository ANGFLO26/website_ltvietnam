import type { Page, Paged } from '../helpers.js';
import type { TreeNode } from '../tree.dao.js';
import type {
  Application,
  ApplicationFilter,
  CreateApplicationInput,
  UpdateApplicationInput,
} from './object.js';

export interface ApplicationDao {
  findById(id: string): Promise<Application | null>;
  findBySlug(slug: string): Promise<Application | null>;
  list(filter: ApplicationFilter, page?: Partial<Page>): Promise<Paged<Application>>;

  insert(input: CreateApplicationInput): Promise<Application>;
  update(id: string, input: UpdateApplicationInput): Promise<Application>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<Application>;
  unpublish(id: string): Promise<Application>;

  findSubtreeIds(rootId: string): Promise<string[]>;
  findSubtreeIdsOfMany(rootIds: readonly string[]): Promise<string[]>;
  findAncestors(id: string): Promise<TreeNode[]>;
  findChildren(parentId: string | null): Promise<TreeNode[]>;
  moveNode(id: string, newParentId: string | null): Promise<void>;
  findInconsistentNodes(): Promise<string[]>;

  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean>;
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void>;
  wasEverPublished(id: string): Promise<boolean>;
  canHardDelete(id: string): Promise<boolean>;
}
