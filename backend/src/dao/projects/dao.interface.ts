import type { Page, Paged } from '../helpers.js';
import type { AdminContentListFilter, AdminContentListRow } from '../admin-read-model.js';
import type {
  HreflangAlternate,
  Locale,
  TranslationStatus,
  PublicTranslationRow,
} from '../translation.support.js';
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
  listAdmin(
    filter: AdminContentListFilter<'project_type' | 'is_featured'>,
    page?: Partial<Page>,
  ): Promise<Paged<AdminContentListRow>>;

  insert(input: CreateProjectInput): Promise<Project>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
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
  replaceMedia(
    id: string,
    media: readonly { mediaId: string; caption?: string | null }[],
  ): Promise<void>;
  findMedia(
    id: string,
  ): Promise<readonly { mediaId: string; caption: string | null; displayOrder: number }[]>;
  findLinks(id: string): Promise<Required<ProjectLinks>>;
  countMedia(id: string): Promise<number>;

  /**
   * DANH SACH CONG KHAI theo locale — MOT truy van, khong N+1.
   *
   * Uy quyen cho `TranslationSupport.listPublicByLocale`: dieu kien HAI TRANG
   * THAI (cha `published` + ban dich `published`) viet mot lan cho ca bon nhom.
   * Ten cot trong `where` duoc kiem kieu: `'project_type' | 'is_featured'`.
   */
  listPublicByLocale(
    locale: Locale,
    page: { readonly limit: number; readonly offset: number },
    where?: Readonly<Partial<Record<'project_type' | 'is_featured', string | boolean | null>>>,
    restrictToIds?: readonly string[],
    search?: string,
  ): Promise<{ rows: PublicTranslationRow[]; total: number }>;
}
