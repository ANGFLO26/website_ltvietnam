import type { Page, Paged } from '../helpers.js';
import type { HreflangAlternate, Locale, TranslationStatus } from '../translation.support.js';
import type {
  CreateProjectInput,
  Project,
  ProjectFilter,
  ProjectLinks,
  ProjectTranslation,
  ProjectWithTranslation,
  UpdateProjectInput,
  UpsertProjectTranslationInput,
} from './object.js';

export interface ProjectDao {
  findById(id: string): Promise<Project | null>;
  list(filter: ProjectFilter, page?: Partial<Page>): Promise<Paged<Project>>;

  insert(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<Project>;
  unpublish(id: string): Promise<Project>;

  findBySlug(locale: Locale, slug: string): Promise<ProjectWithTranslation | null>;
  findTranslation(id: string, locale: Locale): Promise<ProjectTranslation | null>;
  listTranslations(id: string): Promise<TranslationStatus[]>;
  upsertTranslation(id: string, input: UpsertProjectTranslationInput): Promise<ProjectTranslation>;
  publishTranslation(id: string, locale: Locale, at: Date): Promise<void>;
  unpublishTranslation(id: string, locale: Locale): Promise<void>;
  hreflangAlternates(id: string): Promise<HreflangAlternate[]>;
  publishedLocales(id: string): Promise<Locale[]>;
  isLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<boolean>;
  assertLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<void>;

  /**
   * Ten khach hang DUOC PHEP hien cong khai, da ap `customer_visibility`.
   *
   * `null` nghia la khong duoc neu gi ca — giao dien phai chap nhan `null`
   * chu khong duoc tu di lay `customers.name`. Ham nay la cong duy nhat, va
   * su ton tai cua no lam cho moi lan doc ten khach thanh mot lua chon co y.
   */
  resolvePublicCustomerName(id: string, locale: Locale): Promise<string | null>;

  replaceLinks(id: string, links: ProjectLinks): Promise<void>;
  replaceMedia(id: string, media: readonly { mediaId: string; caption?: string | null }[]): Promise<void>;
  findLinks(id: string): Promise<Required<ProjectLinks>>;
  countMedia(id: string): Promise<number>;
}
