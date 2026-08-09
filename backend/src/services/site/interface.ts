import type {
  CustomerView,
  HomeView,
  Locale,
  NavLocation,
  NavigationView,
  OfficeView,
  SearchHitView,
} from '@ltv/contracts';
import type { PageArg, PagedResult } from '../taxonomy/interface.js';

export const SITE_SERVICE = Symbol('SITE_SERVICE');

/**
 * KHUNG SITE — nam endpoint cua F4.
 *
 * Nhom nay khac ba nhom truoc o mot diem do duoc: `home` va `navigation` duoc goi
 * o MOI luot xem trang, khong phai khi nguoi dung bam vao mot muc cu the. Nen hai
 * thu quyet dinh thiet ke o day:
 *
 *   1. SO TRUY VAN. `home` la mot phan hoi tong hop tu chin nhom; goi thang tang
 *      dao cho tung nhom la ~20 truy van moi luot xem trang chu.
 *   2. LIEN KET CHET. Menu va banner tro toi noi dung bang mot cap
 *      `(link_type, link_target_id)` KHONG co khoa ngoai. Mot muc tro toi noi
 *      dung da xoa se la mot lien ket 404 tren MOI trang cua site.
 *
 * Cung mot bao dam cau truc voi `TaxonomyService`: KHONG phuong thuc nao nhan
 * `status`, va tra ve THANG kieu view (`snake_case`, khong co `id`).
 */
export interface SiteService {
  /**
   * `GET /home` — RIENG cho trang chu.
   *
   * `doc/06` PHAN IV va PHAN XV muc 2 ghi ro: KHONG dung endpoint nay cho trang
   * `/products`, va `/products/landing` khong dung `HomepageQueryService`. Hai
   * trang can hai tap du lieu khac nhau (trang chu can dich vu, du an, tin, logo
   * khach hang; catalogue can tieu chuan), va gop lai nghia la moi lan doi trang
   * chu se doi ca trang catalogue.
   */
  home(locale: Locale): Promise<HomeView>;

  /**
   * `GET /navigation/:location` — `header` | `mobile` | `footer`.
   *
   * `footer` gop bon menu `footer_*`; xem `NavLocation` trong contracts.
   *
   * KHONG tra ve `null`: `location` da duoc kiem bang enum o tang HTTP, nen mot
   * gia tri go sai la 400 chu khong phai mang rong. Con `menus` rong nghia la
   * bien tap chua cau hinh menu cho vi tri do — va do la mot trang thai hop le
   * cua he thong, khong phai loi. Tra 404 o day se lam mot trang tai duoc mot
   * nua khong hien duoc, vi thanh dieu huong nam tren duong nong cua moi trang.
   */
  navigation(location: NavLocation, locale: Locale): Promise<NavigationView>;

  /**
   * `GET /customers` — logo khach hang.
   *
   * BA dieu kien o tang dao (`status='published'` VA `is_public=TRUE` VA co logo
   * chua xoa), va dieu kien thu hai la dieu kien PHAP LY chu khong phai dieu kien
   * hien thi: mot khach hang co the da duyet noi dung nhung chua ky giay dong y
   * dung logo. Duong nay PHAI di qua `findPublicWithLogo`.
   */
  customers(limit?: number): Promise<readonly CustomerView[]>;

  /** `GET /offices` — khong phan trang; so van phong co gioi han tu nhien. */
  offices(): Promise<readonly OfficeView[]>;

  /**
   * `GET /search` — MVP chi san pham (`doc/06` PHAN IX).
   *
   * Tra ve PagedResult: mot o tim kiem khong co phan trang se hoac cat ket qua im
   * lang, hoac tra ve ca 200 dong cho mot tu khoa chung.
   */
  search(q: string, locale: Locale, page?: PageArg): Promise<PagedResult<SearchHitView>>;
}
