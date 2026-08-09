import type { ContentBlock } from './blocks.js';
import type {
  ApplicationCardView,
  BrandCardView,
  ProductCardView,
  ProductCategoryCardView,
  StandardCardView,
} from './taxonomy.view.js';
import type { SeoDetailView } from './seo.view.js';

/**
 * HINH DANG PHAN HOI cua ba endpoint san pham (F2).
 *
 * Cung quy uoc voi `taxonomy.view.ts`: `snake_case`, KHONG co `id` cua thuc the
 * (slug la khoa cong khai — `doc/06` PHAN XV muc 11). Truong `*_id` tro toi
 * MEDIA van la UUID, va do la ngoai le co y: chung khong phai dinh danh cua
 * trang nay, va F7 se thay bang URL that.
 */

export interface ProductSpecView {
  /** Nhom thong so — `null` khi khong xep nhom. */
  readonly group_key: string | null;
  readonly label: string;
  readonly value: string | null;
  readonly unit: string | null;
}

export interface ProductStandardView {
  readonly slug: string;
  readonly organization: string;
  readonly code: string;
  readonly name: string | null;
  /** `compliance` | `correlation` | `specification` | `reference`. */
  readonly compliance_type: string;
  readonly note: string | null;
}

export interface ProductTaxonView {
  readonly slug: string;
  readonly name: string;
}

export interface ProductCategoryRefView extends ProductTaxonView {
  /** ADR-010: nhieu danh muc, DUNG MOT la chinh. */
  readonly is_primary: boolean;
}

export interface ProductMediaView {
  readonly media_id: string;
  readonly public_url: string | null;
  readonly alt_text: string | null;
  readonly caption: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly media_role: string;
}

export interface ProductRelatedView {
  /** `accessory` | `alternative` | `replacement` | ... */
  readonly relation_type: string;
  readonly product: ProductCardView;
}

/**
 * Chi tiet san pham.
 *
 * `discontinued` la CO, khong phai bo loc — ADR-011: san pham ngung kinh doanh
 * GIU nguyen URL va VAN duoc index. Frontend dung co nay de hien mot dai bao va
 * goi y hang thay the tu `related`, chu khong de an trang.
 */
export interface ProductDetailView extends SeoDetailView {
  readonly slug: string;
  readonly name: string;
  readonly model: string | null;
  readonly short_description: string | null;
  readonly brand: { readonly slug: string; readonly name: string };

  readonly overview: readonly ContentBlock[];
  readonly features: readonly ContentBlock[];
  readonly applications_text: readonly ContentBlock[];
  readonly principle: readonly ContentBlock[];
  readonly sample_types: readonly ContentBlock[];
  readonly operating_conditions: readonly ContentBlock[];
  readonly accessories_options: readonly ContentBlock[];

  readonly categories: readonly ProductCategoryRefView[];
  readonly standards: readonly ProductStandardView[];
  readonly applications: readonly ProductTaxonView[];
  readonly industries: readonly ProductTaxonView[];
  readonly specifications: readonly ProductSpecView[];
  readonly media: readonly ProductMediaView[];
  readonly related: readonly ProductRelatedView[];

  readonly featured_image_id: string | null;
  readonly is_featured: boolean;
  readonly discontinued: boolean;
  /** `null` khi con kinh doanh. ISO 8601 khi da ngung. */
  readonly discontinued_at: string | null;
  readonly seo_title: string | null;
  readonly seo_description: string | null;
}

/**
 * Du lieu tong hop cho trang `/products` — `GET /products/landing`.
 *
 * `doc/06` PHAN XV muc 2 chot: endpoint RIENG, KHONG dung `GET /home`. Hai trang
 * can hai tap du lieu khac nhau, va dung chung mot endpoint nghia la mot trong
 * hai luon nhan thu no khong dung.
 *
 * `is_featured` la NGUON DUY NHAT quyet dinh cai gi noi bat (doc/06 PHAN VIII):
 * `homepage_sections.settings` chi chua cau hinh hien thi, khong chua danh sach
 * id. Neu chua danh sach id thi co hai nguon su that cho cung mot cau hoi.
 */
export interface ProductLandingView {
  readonly featured_categories: readonly ProductCategoryCardView[];
  readonly featured_brands: readonly BrandCardView[];
  readonly featured_standards: readonly StandardCardView[];
  readonly featured_applications: readonly ApplicationCardView[];
  readonly featured_products: readonly ProductCardView[];
}
