import type {
  ApplicationCardView,
  ApplicationTreeView,
  BrandCardView,
  BrandDetailView,
  IndustryCardView,
  ProductCategoryCardView,
  ProductCategoryTreeView,
  ProductCardView,
  StandardCardView,
  StandardDetailView,
} from '@ltv/contracts';

export const TAXONOMY_SERVICE = Symbol('TAXONOMY_SERVICE');

export interface PageArg {
  readonly page?: number | undefined;
  readonly pageSize?: number | undefined;
}

export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
}

/**
 * DUONG DOC CONG KHAI cho nam nhom taxonomy.
 *
 * KHONG MOT PHUONG THUC NAO NHAN `status`. Do la diem quan trong nhat cua
 * interface nay, va no la mot bao dam CAU TRUC chu khong phai mot quy uoc.
 *
 * `doc/06` PHAN XIII: luong doc cong khai la
 * `locale + published + not deleted + filter`. Cac DAO ben duoi nhan
 * `status?: EntityStatus`, nen mot controller quen truyen `status: 'published'`
 * se tra ve CA BAN NHAP ra ngoai — im lang, va khong ai phat hien cho den khi
 * mot noi dung chua duyet xuat hien tren Google.
 *
 * Vi API o day khong co cho de dien `status`, tang api KHONG THE hoi ban nhap.
 * Cung nguyen tac voi vo phan hoi: huong dung la huong khong phai lam gi.
 *
 * Tra ve THANG kieu view (`snake_case`, khong co `id`) chu khong tra thuc the:
 * neu tra thuc the thi tang api phai chuyen doi, va mot controller quen chuyen
 * se lo `id`, `status`, `publishedAt` ra ngoai. Chuyen o day thi chi co mot cho
 * de quen, va no co test.
 */
export interface TaxonomyService {
  // ── brands ──
  listBrands(filter: {
    readonly brandType?: string | undefined;
    readonly featured?: boolean | undefined;
    /** Slug cua hang cha. `null` = chi lay hang goc. */
    readonly parentSlug?: string | null | undefined;
  }, page?: PageArg): Promise<PagedResult<BrandCardView>>;
  findBrand(slug: string): Promise<BrandDetailView | null>;
  listBrandChildren(slug: string): Promise<readonly BrandCardView[] | null>;

  // ── product categories ──
  listProductCategories(filter: {
    readonly featured?: boolean | undefined;
    readonly parentSlug?: string | null | undefined;
  }, page?: PageArg): Promise<PagedResult<ProductCategoryCardView>>;
  productCategoryTree(): Promise<readonly ProductCategoryTreeView[]>;
  findProductCategory(slug: string): Promise<ProductCategoryCardView | null>;

  // ── standards ──
  listStandards(filter: {
    readonly organization?: string | undefined;
    readonly search?: string | undefined;
    readonly featured?: boolean | undefined;
  }, page?: PageArg): Promise<PagedResult<StandardCardView>>;
  findStandard(slug: string): Promise<StandardDetailView | null>;

  // ── applications ──
  listApplications(filter: {
    readonly featured?: boolean | undefined;
    readonly parentSlug?: string | null | undefined;
  }, page?: PageArg): Promise<PagedResult<ApplicationCardView>>;
  applicationTree(): Promise<readonly ApplicationTreeView[]>;
  findApplication(slug: string): Promise<ApplicationCardView | null>;

  // ── industries ──
  listIndustries(filter: { readonly featured?: boolean | undefined }, page?: PageArg):
    Promise<PagedResult<IndustryCardView>>;
  findIndustry(slug: string): Promise<IndustryCardView | null>;

  /**
   * San pham theo mot nhanh taxonomy — MO RONG NHANH CON (ADR-015).
   *
   * `null` khi slug khong ton tai hoac chua publish: nguoi goi phai phan biet
   * "nhanh nay khong co san pham" (mang rong) voi "nhanh nay khong ton tai"
   * (404). Gop hai truong hop lam mot thi mot slug go sai tra ve trang rong
   * thay vi 404, va Google se index trang rong do.
   */
  productsOf(
    dimension: 'category' | 'standard' | 'application' | 'industry',
    slug: string,
    page?: PageArg,
  ): Promise<PagedResult<ProductCardView> | null>;
}
