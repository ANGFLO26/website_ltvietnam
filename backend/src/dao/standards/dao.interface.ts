import type { Page, Paged } from '../helpers.js';
import type {
  CreateStandardInput,
  Standard,
  StandardFilter,
  UpdateStandardInput,
} from './object.js';

export interface StandardDao {
  findById(id: string): Promise<Standard | null>;
  findBySlug(slug: string): Promise<Standard | null>;

  /** Tra cuu theo dinh danh nghiep vu. Khong phan biet hoa thuong. */
  findByCode(organization: string, code: string): Promise<Standard | null>;

  /** Nhieu cap cung luc — dung khi nhap `product_standards` tu du lieu cu. */
  findManyByCodes(pairs: readonly { organization: string; code: string }[]): Promise<Standard[]>;

  list(filter: StandardFilter, page?: Partial<Page>): Promise<Paged<Standard>>;

  /** Danh sach to chuc dang co, kem so luong — dung dung mat bo loc. */
  listOrganizations(): Promise<{ organization: string; count: number }[]>;

  insert(input: CreateStandardInput): Promise<Standard>;
  update(id: string, input: UpdateStandardInput): Promise<Standard>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<Standard>;
  unpublish(id: string): Promise<Standard>;

  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean>;
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void>;
  wasEverPublished(id: string): Promise<boolean>;
  canHardDelete(id: string): Promise<boolean>;
}
