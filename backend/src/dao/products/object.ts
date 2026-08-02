import type { EntityStatus } from '../brands/object.js';
import type { ContentBlock } from '../content.js';

/**
 * SAN PHAM — thuc the trung tam cua catalogue.
 *
 * ADR-014: ten va noi dung ky thuat GIU TIENG ANH, khong dich. "OptiDist",
 * "ASTM D86", "Main Features" la thuat ngu nganh; dich sang tieng Viet lam
 * mat kha nang tim kiem cua chinh nguoi mua. Vi vay bang nay KHONG co bang
 * translation di kem, va do la mot quyet dinh chu khong phai thieu sot.
 */
export type ProductType =
  | 'equipment' | 'spare_part' | 'accessory' | 'consumable' | 'chemical' | 'other';
export type PriceVisibility = 'hidden' | 'visible' | 'contact';
export type SaleMode = 'inquiry' | 'online';

export interface Product {
  readonly id: string;
  readonly brandId: string;
  readonly featuredImageId: string | null;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription: string | null;

  // Bay khoi noi dung, deu la mang khoi (doc/11)
  readonly overview: ContentBlock[];
  readonly features: ContentBlock[];
  readonly applicationsText: ContentBlock[];
  readonly principle: ContentBlock[];
  readonly sampleTypes: ContentBlock[];
  readonly operatingConditions: ContentBlock[];
  readonly accessoriesOptions: ContentBlock[];

  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly model: string | null;
  readonly internalCode: string | null;
  readonly sku: string | null;
  readonly productType: ProductType;
  readonly priceVisibility: PriceVisibility;
  readonly saleMode: SaleMode;
  readonly requiresConfiguration: boolean;
  readonly warrantyMonths: number | null;
  readonly status: EntityStatus;
  readonly isFeatured: boolean;
  readonly displayOrder: number;
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
  readonly discontinuedAt: Date | null;
}

/**
 * San pham da xuat ban.
 *
 * Dieu kien publish (`05` PHAN IV): brand, name, slug, short_description,
 * anh dai dien, va DUNG MOT danh muc chinh. Ba dieu dau thanh KIEU o day;
 * `primaryCategoryId` cung vay, nen ham nhan `PublishedProduct` khong phai
 * kiem lai "co danh muc chinh khong" luc chay.
 */
export interface PublishedProduct extends Product {
  readonly status: 'published';
  readonly shortDescription: string;
  readonly featuredImageId: string;
  readonly publishedAt: Date;
  readonly primaryCategoryId: string;
}

export interface CreateProductInput {
  readonly brandId: string;
  readonly name: string;
  readonly slug: string;
  readonly shortDescription?: string | null;
  readonly model?: string | null;
  readonly internalCode?: string | null;
  readonly sku?: string | null;
  readonly productType?: ProductType;
  readonly featuredImageId?: string | null;
  readonly overview?: ContentBlock[];
  readonly features?: ContentBlock[];
  readonly applicationsText?: ContentBlock[];
  readonly principle?: ContentBlock[];
  readonly sampleTypes?: ContentBlock[];
  readonly operatingConditions?: ContentBlock[];
  readonly accessoriesOptions?: ContentBlock[];
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly createdBy?: string | null;
}

export type UpdateProductInput = Partial<Omit<CreateProductInput, 'createdBy'>> & {
  readonly priceVisibility?: PriceVisibility;
  readonly saleMode?: SaleMode;
  readonly requiresConfiguration?: boolean;
  readonly warrantyMonths?: number | null;
  readonly isFeatured?: boolean;
  readonly displayOrder?: number;
  readonly discontinuedAt?: Date | null;
  readonly updatedBy?: string | null;
};

// ─────────────────────── quan he ───────────────────────

/**
 * ADR-010: mot san pham thuoc NHIEU danh muc, dung MOT la chinh.
 * Chi muc `uq_product_primary_category` ep dieu do o tang DB; kieu nay chi
 * dien dat y dinh. Ca hai deu can: kieu bat loi som, chi muc bat loi that.
 */
export interface CategoryLink {
  readonly categoryId: string;
  readonly isPrimary?: boolean;
}

export type ComplianceType = 'compliance' | 'correlation' | 'specification' | 'reference';

export interface StandardLink {
  readonly standardId: string;
  readonly complianceType?: ComplianceType;
  readonly note?: string | null;
  readonly displayOrder?: number;
}

export interface ApplicationLink {
  readonly applicationId: string;
  readonly isPrimary?: boolean;
}

export interface IndustryLink {
  readonly industryId: string;
}

export type MediaRole = 'gallery' | 'diagram' | 'application' | 'interface' | 'dimension';

export interface ProductMediaLink {
  readonly mediaId: string;
  readonly mediaRole?: MediaRole;
  readonly displayOrder?: number;
}

export type RelationType = 'similar' | 'alternative' | 'accessory' | 'compatible' | 'recommended';

export interface RelatedLink {
  readonly relatedProductId: string;
  readonly relationType: RelationType;
  readonly displayOrder?: number;
}

/** Dong thong so ky thuat. `value` nullable de ghi duoc dong tieu de nhom. */
export interface Specification {
  readonly id?: string;
  readonly groupKey?: string | null;
  readonly label: string;
  readonly value?: string | null;
  readonly unit?: string | null;
  readonly displayOrder?: number;
}

// ─────────────────────── bo loc ───────────────────────

export type ProductSort = 'name' | 'published_at' | 'display_order' | 'created_at';

/**
 * Bo loc CONG KHAI — nhan SLUG, khong nhan UUID (doc/06 PHAN II).
 *
 * Ly do khong nhan UUID o API cong khai: URL loc la thu nguoi dung chia se va
 * Google thu thap. `?brand=pac` doc duoc va on dinh; `?brand_id=8f3c...` thi
 * khong, va con lo cau truc dinh danh noi bo ra ngoai.
 *
 * NGU NGHIA (ADR-007):
 *   cung mot chieu   -> OR   (brand=pac & brand=herzog  ->  PAC hoac Herzog)
 *   giua cac chieu   -> AND  (brand=pac & standard=d86  ->  PAC va D86)
 */
export interface ProductFilter {
  readonly brandSlugs?: readonly string[];
  readonly categorySlugs?: readonly string[];
  readonly applicationSlugs?: readonly string[];
  readonly industrySlugs?: readonly string[];
  readonly standardSlugs?: readonly string[];
  readonly productTypes?: readonly ProductType[];
  /** Tim tu do tren name / model / short_description (chi muc trigram). */
  readonly search?: string;
  readonly isFeatured?: boolean;
  /**
   * Chi quan tri moi duoc dat. Bo trong = chi lay `published`.
   * De trong o duong cong khai la cach duy nhat dam bao ban nhap khong lo ra.
   */
  readonly status?: EntityStatus;
  readonly includeDeleted?: boolean;
  /** San pham ngung kinh doanh: mac dinh VAN hien (URL cu phai song, ADR-011). */
  readonly excludeDiscontinued?: boolean;
}

/** Mot the san pham trong danh sach — du de ve, khong phai lay them. */
export interface ProductCard {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly model: string | null;
  readonly shortDescription: string | null;
  readonly brandId: string;
  readonly brandName: string;
  readonly brandSlug: string;
  readonly featuredImageId: string | null;
  readonly featuredImagePath: string | null;
  readonly featuredImageAlt: string | null;
  readonly isFeatured: boolean;
  readonly discontinuedAt: Date | null;
}

// ─────────────── hinh dang ket qua cua TRANG CHI TIET ───────────────
/**
 * Day la kieu GHEP tu nhieu bang, khong phai mot thuc the.
 *
 * De chung file voi thuc the la co y: luat kien truc chi cho bon file trong
 * mot thu muc bang. Mot file `detail.ts` rieng se de doc hon mot chut, nhung
 * doi lay viec noi long luat cho MOI bang — khong dang. Ranh gioi giua hai
 * nhom duoc giu bang dai phan cach nay.
 */
export interface ProductDetail {
  readonly product: Product;
  readonly brand: { id: string; name: string; slug: string };
  readonly categories: readonly DetailCategory[];
  readonly standards: readonly DetailStandard[];
  readonly applications: readonly DetailTaxon[];
  readonly industries: readonly DetailTaxon[];
  readonly media: readonly DetailMedia[];
  readonly specifications: readonly DetailSpec[];
  readonly related: readonly DetailRelated[];
}

export interface DetailCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly isPrimary: boolean;
}

export interface DetailStandard {
  readonly id: string;
  readonly organization: string;
  readonly code: string;
  readonly name: string | null;
  readonly slug: string;
  readonly complianceType: ComplianceType;
  readonly note: string | null;
}

export interface DetailTaxon {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface DetailMedia {
  readonly id: string;
  readonly storagePath: string;
  readonly publicUrl: string | null;
  readonly altText: string | null;
  readonly caption: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly mediaRole: MediaRole;
}

export interface DetailSpec {
  readonly id: string;
  readonly groupKey: string | null;
  readonly label: string;
  readonly value: string | null;
  readonly unit: string | null;
}

export interface DetailRelated {
  readonly relationType: RelationType;
  readonly card: ProductCard;
}
