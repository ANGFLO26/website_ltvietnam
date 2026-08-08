/**
 * HINH DANG PHAN HOI CONG KHAI cua nam nhom taxonomy.
 *
 * Dat trong `@ltv/contracts` chu khong o `backend/src/api/dto` de frontend
 * import CUNG mot kieu (doc/12 muc 2.2) — doi hinh dang phan hoi lam frontend
 * do luc BIEN DICH thay vi hong luc chay. Duoi `.view.ts` nen Luat 11 quet va
 * ep `snake_case`, du no nam ngoai `backend/`.
 *
 * KHONG CO `id`. Day khong phai bo sot.
 *
 * `doc/06` PHAN XV muc 11 chot: "Public API dung SLUG, admin API dung UUID".
 * Lo UUID ra ngoai co ba cai gia:
 *   - frontend se dung no lam khoa, roi mot ngay nao do can UUID cho thu khac
 *     va hai khai niem tron vao nhau
 *   - URL cong khai dung slug (ADR-001), nen mot trang co HAI dinh danh va
 *     nguoi ta se hoi cai nao la that
 *   - no ke ra cach sinh khoa cua database, mot thu ben ngoai khong can biet
 *
 * `slug` la khoa cong khai, va no du: moi endpoint chi tiet nhan slug.
 *
 * Cac truong `*_image_id` / `logo_id` / `icon_id` VAN la UUID, va do la ngoai
 * le CO Y: chung tro toi media, khong tro toi thuc the. F7 se thay chung bang
 * URL that khi co duong phuc vu tep; den luc do frontend can mot cai gi de dung
 * cho, va mot UUID media khong phai dinh danh cua trang nay.
 */

export interface BrandCardView {
  readonly slug: string;
  readonly name: string;
  readonly brand_type: string;
  readonly code: string | null;
  readonly country_code: string | null;
  readonly logo_id: string | null;
  readonly is_featured: boolean;
}

export interface BrandDetailView extends BrandCardView {
  readonly short_description: string | null;
  readonly website_url: string | null;
  readonly cover_image_id: string | null;
  /** `null` khi la hang goc. Slug, khong phai UUID. */
  readonly parent_slug: string | null;
  readonly depth: number;
}

export interface ProductCategoryCardView {
  readonly slug: string;
  readonly name: string;
  readonly short_description: string | null;
  readonly icon_id: string | null;
  readonly featured_image_id: string | null;
  readonly depth: number;
  readonly is_featured: boolean;
}

/**
 * Mot node trong cay danh muc. `children` LONG NHAU, khong phang.
 *
 * Tra ve cay long nhau chu khong phai danh sach phang kem `parent_slug`: mega
 * menu va thanh dieu huong deu can cau truc long, va de frontend tu dung lai
 * cay tu danh sach phang la day cung mot thuat toan sang ba noi khac nhau.
 */
export interface ProductCategoryTreeView extends ProductCategoryCardView {
  readonly children: readonly ProductCategoryTreeView[];
}

export interface StandardCardView {
  readonly slug: string;
  /** `ASTM`, `ISO`, `IP`... — mat bo loc nhom theo truong nay. */
  readonly organization: string;
  readonly code: string;
  readonly name: string | null;
}

export interface StandardDetailView extends StandardCardView {
  readonly description: string | null;
}

export interface ApplicationCardView {
  readonly slug: string;
  readonly name: string;
  readonly icon_id: string | null;
  readonly depth: number;
  readonly is_featured: boolean;
}

export interface ApplicationTreeView extends ApplicationCardView {
  readonly children: readonly ApplicationTreeView[];
}

export interface IndustryCardView {
  readonly slug: string;
  readonly name: string;
  readonly icon_id: string | null;
  readonly featured_image_id: string | null;
  readonly is_featured: boolean;
}

/**
 * THE SAN PHAM cho cac endpoint `:slug/products`.
 *
 * Du de ve mot the trong danh sach, khong phai goi them lan nao nua cho tung
 * dong — do la dieu kien ngan sach truy van cua `ProductQuery.filter`.
 */
export interface ProductCardView {
  readonly slug: string;
  readonly name: string;
  readonly model: string | null;
  readonly short_description: string | null;
  readonly featured_image_id: string | null;
  readonly brand: { readonly slug: string; readonly name: string } | null;
  readonly is_featured: boolean;
  /** ADR-011: san pham ngung kinh doanh VAN duoc tra ve va van index. */
  readonly discontinued: boolean;
}

/** `meta` cua phan hoi co phan trang — khop `doc/06` PHAN II muc 2. */
export interface PageMetaView {
  readonly page: number;
  readonly page_size: number;
  readonly total_items: number;
  readonly total_pages: number;
}
