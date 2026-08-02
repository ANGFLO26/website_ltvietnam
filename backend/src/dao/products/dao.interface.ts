import type { Page, Paged } from '../helpers.js';
import type {
  ApplicationLink,
  CategoryLink,
  CreateProductInput,
  IndustryLink,
  Product,
  ProductCard,
  ProductDetail,
  ProductFilter,
  ProductMediaLink,
  ProductSort,
  RelatedLink,
  Specification,
  StandardLink,
  UpdateProductInput,
} from './object.js';

/**
 * DUONG DOC PHUC TAP — cai dat nam o `query.ts`, khong phai `dao.ts`.
 *
 * Vi sao tach: bo loc `(PAC OR Herzog) AND ASTM D86` bac cau nam bang, co mo
 * rong nhanh con cua cay hang va cay danh muc. Ghep tu cac ham don bang se
 * sinh N+1, ma dieu kien chap nhan cua P5 ghi ro **no N+1** kem ngan sach
 * truy van do duoc. `query.ts` la ANH EM cua `dao.ts` trong cung mot tang:
 * ca hai deu la noi duy nhat biet SQL.
 */
export interface ProductQuery {
  /**
   * Bo loc cong khai. Tra ve THE san pham — du de ve danh sach, khong phai
   * goi them lan nao nua cho tung dong.
   *
   * NGAN SACH TRUY VAN: DUNG HAI cau, bat ke tra ve 1 hay 100 san pham.
   */
  filter(
    filter: ProductFilter,
    sort?: { by?: ProductSort; direction?: 'asc' | 'desc' },
    page?: Partial<Page>,
  ): Promise<Paged<ProductCard>>;

  /** Trang chi tiet: san pham + moi quan he. So truy van co dinh, khong theo du lieu. */
  findDetailBySlug(slug: string): Promise<ProductDetail | null>;

  /** The san pham theo id — dung cho "san pham lien quan", block noi dung. */
  findCardsByIds(ids: readonly string[]): Promise<ProductCard[]>;

  /** Trang catalogue `/products`: san pham noi bat. */
  findFeaturedCards(limit: number): Promise<ProductCard[]>;
}

/**
 * Hop dong truy cap bang `products` va bay bang con.
 *
 * Vi sao bay bang lien ket KHONG co thu muc rieng: chung khong bao gio duoc
 * ghi mot minh. `product_standards` chi doi khi `products` doi, trong cung
 * mot transaction (ADR-008 replace-set). Tach ra thanh DAO rieng chi tao co
 * hoi cho ai do ghi mot nua.
 */
export interface ProductDao extends ProductQuery {
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findByInternalCode(code: string): Promise<Product | null>;
  list(filter: { status?: string; brandId?: string }, page?: Partial<Page>): Promise<Paged<Product>>;

  insert(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  publish(id: string, at: Date): Promise<Product>;
  unpublish(id: string): Promise<Product>;
  discontinue(id: string, at: Date): Promise<Product>;

  // ── quan he: THAY CA TAP (ADR-008) ──────────────────────────────
  /**
   * Vi sao la `replace` chu khong phai `add`/`remove`:
   *
   * Man hinh soan thao gui ve TRANG THAI CUOI CUNG ("san pham nay thuoc ba
   * danh muc nay"). Neu DAO chi co `add`/`remove` thi tang tren phai tu tinh
   * hieu giua tap cu va tap moi — mot phep tinh de sai, va sai thi de lai
   * lien ket mo coi ma khong ai thay.
   *
   * `replace` xoa het roi ghi lai trong CUNG transaction: khong co khoanh
   * khac nao san pham o trang thai nua voi.
   */
  replaceCategories(productId: string, links: readonly CategoryLink[]): Promise<void>;
  replaceStandards(productId: string, links: readonly StandardLink[]): Promise<void>;
  replaceApplications(productId: string, links: readonly ApplicationLink[]): Promise<void>;
  replaceIndustries(productId: string, links: readonly IndustryLink[]): Promise<void>;
  replaceMedia(productId: string, links: readonly ProductMediaLink[]): Promise<void>;
  replaceRelated(productId: string, links: readonly RelatedLink[]): Promise<void>;
  replaceSpecifications(productId: string, rows: readonly Specification[]): Promise<void>;

  /** Danh muc chinh — dieu kien publish (ADR-010). `null` la chua dat. */
  findPrimaryCategoryId(productId: string): Promise<string | null>;

  // ── slug (ADR-002) ──
  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean>;
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void>;
  wasEverPublished(id: string): Promise<boolean>;
  canHardDelete(id: string): Promise<boolean>;
}
