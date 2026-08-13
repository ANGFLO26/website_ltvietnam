import type {
  DocumentCardView,
  DocumentDetailView,
  Locale,
  PageDetailView,
  PostCardView,
  PostCategoryView,
  PostDetailView,
  ProjectCardView,
  ProjectDetailView,
  ServiceCardView,
  ServiceDetailView,
  ServiceTreeView,
} from '@ltv/contracts';
import type { PageArg, PagedResult } from '../taxonomy/interface.js';

export const CONTENT_SERVICE = Symbol('CONTENT_SERVICE');

/** Mot ket qua tim kiem thuoc nhom noi dung co ban dich. */
export interface ContentSearchHit {
  readonly type: 'service' | 'project' | 'post';
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string | null;
}

/**
 * DUONG DOC CONG KHAI cua noi dung CO BAN DICH — F3.
 *
 * Cung nguyen tac cau truc voi `TaxonomyService`: khong phuong thuc nao nhan
 * `status`. Nhung o day co MOT diem khac va no la diem de sai nhat cua ca phase:
 *
 *   `locale` la THAM SO BAT BUOC cua moi phuong thuc.
 *
 * Khong dat mac dinh trong interface. Neu `locale?: Locale` thi mot controller
 * quen truyen se lang le doc tieng Anh cho nguoi dung Viet — trang hien ra binh
 * thuong, khong loi nao, va chi nguoi doc phat hien. Bat buoc thi cho quen la
 * loi bien dich.
 *
 * `doc/06` PHAN XIII: luong doc cong khai la
 * `locale + published + not deleted + filter`. Bon nhom o day can CA HAI dieu
 * kien publish (thuc the VA ban dich) — xem `TranslationSupport.listPublicByLocale`.
 */
export interface ContentService {
  // ── pages (co ban dich) ──
  findPage(locale: Locale, slug: string): Promise<PageDetailView | null>;

  /**
   * `featured` la MO RONG CUA F4, khong phai cua trang danh sach.
   *
   * Trang chu can "dich vu noi bat" va "du an noi bat". Hai cach lam:
   *
   *   a. `SiteService` goi thang `services.listPublicByLocale(locale, p,
   *      { is_featured: true })` roi tu dung the
   *   b. them mot bo loc vao day
   *
   * Chon (b) vi (a) nghia la ham dung THE dich vu (`serviceCards`) — cai biet
   * dieu kien hai trang thai, biet cach lay anh dai dien theo lo, biet `depth`
   * lay tu bang cha — bi viet lan thu hai o mot service khac. Hai ban se lech,
   * va ban o trang chu se lech theo huong "thieu mot dieu kien".
   *
   * `featured` la mot bo loc THAT tren `services.is_featured`, khong phai mot
   * duong rieng cho trang chu: `GET /services?featured=true` la mot cau hoi hop
   * le, va F8 se can no cho man hinh quan tri.
   */
  // ── services (co ban dich + CAY) ──
  listServices(
    locale: Locale,
    filter?: { readonly featured?: boolean | undefined },
    page?: PageArg,
  ): Promise<PagedResult<ServiceCardView>>;
  serviceTree(locale: Locale): Promise<readonly ServiceTreeView[]>;
  findService(locale: Locale, slug: string): Promise<ServiceDetailView | null>;

  // ── projects (co ban dich) ──
  listProjects(
    locale: Locale,
    filter?: {
      readonly projectType?: string | undefined;
      readonly featured?: boolean | undefined;
    },
    page?: PageArg,
  ): Promise<PagedResult<ProjectCardView>>;
  findProject(locale: Locale, slug: string): Promise<ProjectDetailView | null>;

  // ── posts (co ban dich) ──
  listPosts(
    locale: Locale,
    filter?: { readonly categorySlug?: string | undefined },
    page?: PageArg,
  ): Promise<PagedResult<PostCardView> | null>;
  findPost(locale: Locale, slug: string): Promise<PostDetailView | null>;

  // ── post categories (KHONG co ban dich — ADR-014) ──
  listPostCategories(page?: PageArg): Promise<PagedResult<PostCategoryView>>;
  /** `null` khi danh muc khong ton tai -> 404, khac voi "chua co bai" (mang rong). */
  postsOfCategory(
    locale: Locale,
    slug: string,
    page?: PageArg,
  ): Promise<PagedResult<PostCardView> | null>;

  // ── documents (KHONG co ban dich — ADR-014) ──
  listDocuments(
    filter?: { readonly documentType?: string | undefined },
    page?: PageArg,
  ): Promise<PagedResult<DocumentCardView>>;
  findDocument(slug: string): Promise<DocumentDetailView | null>;

  /**
   * TIM KIEM tren ba nhom co ban dich — dich vu, du an, bai viet.
   *
   * La mot phuong thuc RIENG chu khong phai mot bo loc them vao ba ham
   * `listX`: them `search` vao ba chu ky do se keo no ra toi ba controller
   * cong khai, ba DTO va man hinh quan tri — trong khi khong endpoint nao
   * trong so do can tim kiem. `/tim-kiem` la noi goi duy nhat.
   *
   * Tra ve `total` cua tung nhom de `SiteService` phan trang duoc tren tap
   * hop nhat ma khong phai dem lai.
   */
  searchContent(
    locale: Locale,
    q: string,
    limit: number,
  ): Promise<{ readonly items: readonly ContentSearchHit[]; readonly total: number }>;

  /** `/industries/:slug/services` — chuyen tu F1 sang day vi can duong dich. */
  servicesOfIndustry(
    locale: Locale,
    industrySlug: string,
    page?: PageArg,
  ): Promise<PagedResult<ServiceCardView> | null>;
}
