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

  // ── services (co ban dich + CAY) ──
  listServices(locale: Locale, page?: PageArg): Promise<PagedResult<ServiceCardView>>;
  serviceTree(locale: Locale): Promise<readonly ServiceTreeView[]>;
  findService(locale: Locale, slug: string): Promise<ServiceDetailView | null>;

  // ── projects (co ban dich) ──
  listProjects(
    locale: Locale,
    filter?: { readonly projectType?: string | undefined },
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

  /** `/industries/:slug/services` — chuyen tu F1 sang day vi can duong dich. */
  servicesOfIndustry(
    locale: Locale,
    industrySlug: string,
    page?: PageArg,
  ): Promise<PagedResult<ServiceCardView> | null>;
}
