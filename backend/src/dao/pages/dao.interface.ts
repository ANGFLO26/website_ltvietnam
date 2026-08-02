import type { HreflangAlternate, Locale, TranslationStatus } from '../translation.support.js';
import type {
  AppPage,
  CreatePageInput,
  PageTranslation,
  PageWithTranslation,
  UpdatePageInput,
  UpsertPageTranslationInput,
} from './object.js';

export interface PageDao {
  findById(id: string): Promise<AppPage | null>;
  /** Tra cuu theo khoa nghiep vu — cach ma nguon tro toi mot trang. */
  findByType(pageType: string): Promise<AppPage | null>;
  listAll(): Promise<AppPage[]>;

  insert(input: CreatePageInput): Promise<AppPage>;
  update(id: string, input: UpdatePageInput): Promise<AppPage>;
  publish(id: string, at: Date): Promise<AppPage>;
  unpublish(id: string): Promise<AppPage>;
  softDelete(id: string, at: Date): Promise<void>;

  /**
   * Trang he thong co duoc xoa khong.
   *
   * Luon `false` cho `is_system_page`. Dat o tang dao chu khong chi o giao
   * dien: nut xoa co the bi an di, nhung API van goi duoc, va mot trang
   * chinh sach bao mat bien mat la van de tuan thu chu khong phai loi hien thi.
   */
  canDelete(id: string): Promise<boolean>;

  findBySlug(locale: Locale, slug: string): Promise<PageWithTranslation | null>;
  findTranslation(id: string, locale: Locale): Promise<PageTranslation | null>;
  listTranslations(id: string): Promise<TranslationStatus[]>;
  upsertTranslation(id: string, input: UpsertPageTranslationInput): Promise<PageTranslation>;
  publishTranslation(id: string, locale: Locale, at: Date): Promise<void>;
  unpublishTranslation(id: string, locale: Locale): Promise<void>;

  /**
   * Trang he thong BAT BUOC co ban `en` da xuat ban (`05` PHAN IV).
   * Tra ve danh sach `page_type` chua dat — dung cho lenh kiem tra truoc khi
   * len song, va cho canh bao trong man hinh quan tri.
   */
  findSystemPagesMissingEnglish(): Promise<string[]>;

  hreflangAlternates(id: string): Promise<HreflangAlternate[]>;
  publishedLocales(id: string): Promise<Locale[]>;
  isLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<boolean>;
  assertLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<void>;
}
