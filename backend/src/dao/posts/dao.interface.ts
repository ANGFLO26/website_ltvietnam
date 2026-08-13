import type { Page, Paged } from '../helpers.js';
import type { AdminContentListFilter, AdminContentListRow } from '../admin-read-model.js';
import type {
  HreflangAlternate,
  Locale,
  TranslationStatus,
  PublicTranslationRow,
} from '../translation.support.js';
import type {
  CreatePostInput,
  Post,
  PostFilter,
  PostLinks,
  PostTranslation,
  PostWithTranslation,
  UpdatePostInput,
  UpsertPostTranslationInput,
} from './object.js';

export interface PostDao {
  findById(id: string): Promise<Post | null>;
  list(filter: PostFilter, page?: Partial<Page>): Promise<Paged<Post>>;
  listAdmin(
    filter: AdminContentListFilter<'category_id' | 'is_featured'>,
    page?: Partial<Page>,
  ): Promise<Paged<AdminContentListRow>>;

  insert(input: CreatePostInput): Promise<Post>;
  update(id: string, input: UpdatePostInput): Promise<Post>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<Post>;
  unpublish(id: string): Promise<Post>;

  findBySlug(locale: Locale, slug: string): Promise<PostWithTranslation | null>;
  findTranslation(id: string, locale: Locale): Promise<PostTranslation | null>;
  listTranslations(id: string): Promise<TranslationStatus[]>;
  upsertTranslation(id: string, input: UpsertPostTranslationInput): Promise<PostTranslation>;
  publishTranslation(id: string, locale: Locale, at: Date): Promise<void>;
  unpublishTranslation(id: string, locale: Locale): Promise<void>;
  hreflangAlternates(id: string): Promise<HreflangAlternate[]>;
  publishedLocales(id: string): Promise<Locale[]>;
  isLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<boolean>;
  assertLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<void>;

  /** Thay ca tap quan he trong mot lan goi (ADR-008). */
  replaceLinks(id: string, links: PostLinks): Promise<void>;
  replaceMedia(id: string, mediaIds: readonly string[]): Promise<void>;
  findMedia(id: string): Promise<readonly { mediaId: string; displayOrder: number }[]>;
  findLinks(id: string): Promise<Required<PostLinks>>;

  /**
   * DANH SACH CONG KHAI theo locale — MOT truy van, khong N+1.
   *
   * Uy quyen cho `TranslationSupport.listPublicByLocale`: dieu kien HAI TRANG
   * THAI (cha `published` + ban dich `published`) viet mot lan cho ca bon nhom.
   * Ten cot trong `where` duoc kiem kieu: `'category_id' | 'is_featured'`.
   */
  listPublicByLocale(
    locale: Locale,
    page: { readonly limit: number; readonly offset: number },
    where?: Readonly<Partial<Record<'category_id' | 'is_featured', string | boolean | null>>>,
    restrictToIds?: readonly string[],
  ): Promise<{ rows: PublicTranslationRow[]; total: number }>;
}
