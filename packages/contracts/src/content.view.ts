import type { ContentBlock } from './blocks.js';
import type { Locale } from './routes.js';

/**
 * HINH DANG PHAN HOI cua noi dung CO BAN DICH — F3.
 *
 * Cung quy uoc voi `taxonomy.view.ts` / `product.view.ts`: `snake_case`, KHONG
 * co `id` cua thuc the (slug la khoa cong khai).
 *
 * Diem khac cua ca nhom nay: MOI phan hoi mang `locale`, va mang
 * `hreflang_alternates`.
 *
 * `locale` trong than phan hoi khong phai du thua du client da gui `?locale=`:
 * mot phan hoi tu ke ra ngon ngu cua no thi mot ban cache dat sai khoa se lo ra
 * ngay khi doc, thay vi hien noi dung sai ngon ngu ma khong ai biet tai sao.
 */

export interface HreflangAlternateView {
  readonly locale: Locale;
  readonly slug: string;
}

/**
 * Phan chung cua moi phan hoi co ban dich.
 *
 * `hreflang_alternates` RONG khi chi mot ngon ngu duoc xuat ban — ADR-004. Mot
 * the `<link hreflang>` la LOI HUA voi Google rang dia chi kia ton tai va doc
 * duoc; neu ban EN moi chi la ban nhap thi dia chi do tra 404, va Google khong
 * bao loi — no am tham ha do tin cay cua ca cum trang.
 */
export interface TranslatedBase {
  readonly slug: string;
  readonly locale: Locale;
  readonly hreflang_alternates: readonly HreflangAlternateView[];
}

// ─────────────────────────── the trong danh sach ───────────────────────────
export interface ContentCardView {
  readonly slug: string;
  readonly title: string;
  readonly published_at: string | null;
}

export interface PostCardView extends ContentCardView {
  readonly excerpt: string | null;
  readonly featured_image_id: string | null;
  readonly category: { readonly slug: string; readonly name: string } | null;
  readonly is_featured: boolean;
}

export interface ProjectCardView extends ContentCardView {
  readonly short_description: string | null;
  readonly featured_image_id: string | null;
  readonly project_type: string;
  readonly location_text: string | null;
  readonly completed_at: string | null;
  /**
   * Ten khach hang CHI khi ho cho phep cong bo.
   *
   * `customer_visibility` cua du an quyet dinh, va `resolvePublicCustomerName`
   * o tang dao la noi duy nhat biet luat do. `null` nghia la "khong duoc neu
   * ten" — KHONG phai "khong co khach hang". Frontend hien "Khach hang trong
   * nganh ..." thay vi de trong.
   */
  readonly customer_name: string | null;
  readonly is_featured: boolean;
}

export interface ServiceCardView extends ContentCardView {
  readonly short_description: string | null;
  readonly featured_image_id: string | null;
  readonly depth: number;
  readonly is_featured: boolean;
}

export interface ServiceTreeView extends ServiceCardView {
  readonly children: readonly ServiceTreeView[];
}

// ─────────────────────────── chi tiet ───────────────────────────
export interface PageDetailView extends TranslatedBase {
  readonly title: string;
  readonly page_type: string;
  readonly summary: string | null;
  readonly content: readonly ContentBlock[];
  readonly seo_title: string | null;
  readonly seo_description: string | null;
}

export interface PostDetailView extends TranslatedBase {
  readonly title: string;
  readonly excerpt: string | null;
  readonly content: readonly ContentBlock[];
  readonly featured_image_id: string | null;
  readonly category: { readonly slug: string; readonly name: string } | null;
  readonly published_at: string | null;
  readonly seo_title: string | null;
  readonly seo_description: string | null;
}

/**
 * BA truong block, khong phai mot truong `content`.
 *
 * `project_translations` co `scope_of_work`, `implementation`, `result` — ba
 * phan rieng vi mot ho so du an duoc doc theo ba cau hoi khac nhau ("lam gi",
 * "lam the nao", "duoc gi"). Gop chung thanh mot `content` o tang API se buoc
 * frontend tu tach lai bang tieu de, va viec do khong the lam dung.
 */
export interface ProjectDetailView extends TranslatedBase {
  readonly title: string;
  readonly short_description: string | null;
  readonly scope_of_work: readonly ContentBlock[];
  readonly implementation: readonly ContentBlock[];
  readonly result: readonly ContentBlock[];
  readonly featured_image_id: string | null;
  readonly project_type: string;
  readonly location_text: string | null;
  readonly country_code: string | null;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly customer_name: string | null;
  readonly published_at: string | null;
  readonly seo_title: string | null;
  readonly seo_description: string | null;
}

/** SAU truong block — cung ly do voi `ProjectDetailView`. */
export interface ServiceDetailView extends TranslatedBase {
  readonly title: string;
  readonly short_description: string | null;
  readonly overview: readonly ContentBlock[];
  readonly customer_problems: readonly ContentBlock[];
  readonly scope_of_work: readonly ContentBlock[];
  readonly process: readonly ContentBlock[];
  readonly benefits: readonly ContentBlock[];
  readonly faq: readonly ContentBlock[];
  readonly featured_image_id: string | null;
  readonly depth: number;
  readonly seo_title: string | null;
  readonly seo_description: string | null;
}

// ─────────── nhom KHONG co ban dich (ADR-014) ───────────
/**
 * `post_categories` va `documents` KHONG co bang dich — va do la mot quyet dinh
 * duoc ghi trong ADR-014, khong phai mot su bo sot:
 *
 *   "Mot bang translation chi dang ton tai neu se co nguoi ngoi xuong viet ban
 *    thu hai."
 *
 * Ten danh muc tin va ten tai lieu ky thuat khong duoc dich — `Catalogue`,
 * `Datasheet`, ten model may deu giu nguyen o ca hai ngon ngu. Nen chung khong
 * mang `locale` lan `hreflang_alternates`.
 */
export interface PostCategoryView {
  readonly slug: string;
  readonly name: string;
  readonly depth: number;
  readonly post_count: number;
}

export interface DocumentCardView {
  readonly slug: string;
  readonly title: string;
  readonly document_type: string;
  readonly file_size_bytes: number | null;
  readonly page_count: number | null;
  /** `true` khi tai duoc ma khong can dang nhap. */
  readonly is_public: boolean;
}

export interface DocumentDetailView extends DocumentCardView {
  readonly description: string | null;
  readonly download_count: number;
}
