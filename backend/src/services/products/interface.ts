import type {
  ProductCardView,
  ProductDetailView,
  ProductLandingView,
} from '@ltv/contracts';
import type { PageArg, PagedResult } from '../taxonomy/interface.js';

export const PRODUCT_QUERY_SERVICE = Symbol('PRODUCT_QUERY_SERVICE');

/**
 * BO LOC CONG KHAI theo ADR-007.
 *
 * Ngu nghia, va day la cho de sai nhat cua ca du an:
 *
 *   CUNG mot dimension  -> OR   `?brand=pac&brand=herzog` = PAC hoac Herzog
 *   KHAC dimension      -> AND  `?brand=pac&standard=astm-d86` = ca hai
 *
 * Cong MO RONG NHANH CON (ADR-015): loc `category=petroleum-testing` phai ra ca
 * san pham gan o cap 2 duoi no.
 *
 * KHONG co `status`, KHONG co `includeDeleted`, KHONG co `excludeDiscontinued`.
 * `ProductFilter` cua tang DAO co ca ba, va ca ba deu la duong lo:
 *   - `status` -> ban nhap ra ngoai
 *   - `includeDeleted` -> noi dung da xoa ra ngoai
 *   - `excludeDiscontinued` -> AN san pham ngung kinh doanh, tuc PHA ADR-011:
 *     URL cu phai song va van duoc index. Cho tang api dat co nay nghia la mot
 *     ngay nao do ai do dat no "cho danh sach dep hon" va ~200 URL chet lang le.
 */
export interface PublicProductFilter {
  readonly brandSlugs?: readonly string[] | undefined;
  readonly categorySlugs?: readonly string[] | undefined;
  readonly applicationSlugs?: readonly string[] | undefined;
  readonly industrySlugs?: readonly string[] | undefined;
  readonly standardSlugs?: readonly string[] | undefined;
  readonly search?: string | undefined;
  readonly featured?: boolean | undefined;
}

export type PublicProductSort = 'name' | 'newest' | 'default';

export interface ProductQueryService {
  /**
   * `GET /products` — danh sach co loc va phan trang.
   *
   * NGAN SACH TRUY VAN: hai cau, bat ke tra ve 1 hay 100 san pham (mot lay dong,
   * mot dem). Do la dieu kien da do duoc cua tang DAO, va co bai kiem giu no.
   */
  list(
    filter: PublicProductFilter,
    sort?: PublicProductSort,
    page?: PageArg,
  ): Promise<PagedResult<ProductCardView>>;

  /** `GET /products/:slug`. `null` khi khong ton tai hoac chua publish. */
  findBySlug(slug: string): Promise<ProductDetailView | null>;

  /** `GET /products/landing` — du lieu tong hop cho trang `/products`. */
  landing(): Promise<ProductLandingView>;
}
