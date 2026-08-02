import type { Page, Paged } from '../helpers.js';
import type { HreflangAlternate, Locale, TranslationStatus } from '../translation.support.js';
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
  findLinks(id: string): Promise<Required<PostLinks>>;
}
