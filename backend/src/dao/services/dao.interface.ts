import type { Page, Paged } from '../helpers.js';
import type { TreeNode } from '../tree.dao.js';
import type { HreflangAlternate, Locale, TranslationStatus } from '../translation.support.js';
import type {
  CreateServiceInput,
  Service,
  ServiceFilter,
  ServiceTranslation,
  ServiceWithTranslation,
  UpdateServiceInput,
  UpsertServiceTranslationInput,
} from './object.js';

export interface ServiceDao {
  findById(id: string): Promise<Service | null>;
  list(filter: ServiceFilter, page?: Partial<Page>): Promise<Paged<Service>>;

  insert(input: CreateServiceInput): Promise<Service>;
  update(id: string, input: UpdateServiceInput): Promise<Service>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<Service>;
  unpublish(id: string): Promise<Service>;

  // ── cay ──
  findSubtreeIds(rootId: string): Promise<string[]>;
  findAncestors(id: string): Promise<TreeNode[]>;
  findChildren(parentId: string | null): Promise<TreeNode[]>;
  moveNode(id: string, newParentId: string | null): Promise<void>;
  findInconsistentNodes(): Promise<string[]>;

  // ── ban dich ──
  /**
   * Giai URL cong khai. Tra ve ca thuc the lan ban dich trong MOT truy van —
   * trang chi tiet khong phai hoi hai lan.
   */
  findBySlug(locale: Locale, slug: string): Promise<ServiceWithTranslation | null>;
  findTranslation(id: string, locale: Locale): Promise<ServiceTranslation | null>;
  listTranslations(id: string): Promise<TranslationStatus[]>;
  upsertTranslation(id: string, input: UpsertServiceTranslationInput): Promise<ServiceTranslation>;
  publishTranslation(id: string, locale: Locale, at: Date): Promise<void>;
  unpublishTranslation(id: string, locale: Locale): Promise<void>;
  deleteTranslation(id: string, locale: Locale): Promise<void>;

  /** CHI sinh khi ca cha lan ban dich deu published, va co tu hai ngon ngu. */
  hreflangAlternates(id: string): Promise<HreflangAlternate[]>;
  publishedLocales(id: string): Promise<Locale[]>;

  isLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<boolean>;
  assertLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<void>;
}
