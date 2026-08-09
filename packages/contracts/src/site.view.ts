import type { Locale } from './routes.js';
import type { ProductCardView } from './taxonomy.view.js';
import type { PostCardView, ProjectCardView, ServiceCardView } from './content.view.js';
import type {
  ApplicationCardView,
  BrandCardView,
  ProductCategoryCardView,
} from './taxonomy.view.js';

/**
 * KHUNG SITE — F4: trang chu, dieu huong, khach hang, van phong, tim kiem.
 *
 * Diem chung cua nhom nay: chung xuat hien tren MOI trang (menu, footer) hoac la
 * trang duoc xem nhieu nhat (trang chu). Nen hai thu quan trong hon o day so voi
 * cac phase truoc: so truy van, va viec KHONG phat ra lien ket chet.
 */

/**
 * MOT MUC MENU — da giai thanh `url`, khong con `link_type` + `link_target_id`.
 *
 * Vi sao giai o backend chu khong tra cap `(type, id)` cho frontend:
 *
 * `menu_items.link_target_id` la da hinh va KHONG co khoa ngoai (cung thiet ke
 * voi `banners`). Neu tra cap do ra ngoai thi frontend phai biet luat dung URL
 * cho tam loai thuc the — tuc la luat dinh tuyen bi sao chep sang mot kho ma
 * khac, va hai ban se lech. Backend co `@ltv/contracts` ROUTES; day la noi duy
 * nhat biet `/products/:slug` trong nhu the nao.
 *
 * Va quan trong hon: backend biet muc tieu con TON TAI va da PUBLISH hay chua.
 * Muc co dich da bi xoa hoac rut xuong nhap se bi BO khoi menu — khong phat mot
 * lien ket 404 len moi trang cua site.
 */
export interface MenuItemView {
  readonly label: string;
  /** Duong dan da giai (`/products/optidist`) hoac URL ngoai. `null` = muc tieu de. */
  readonly url: string | null;
  readonly open_new_tab: boolean;
  readonly children: readonly MenuItemView[];
}

export interface MenuView {
  readonly code: string;
  readonly name: string;
  readonly location: string;
  readonly items: readonly MenuItemView[];
}

/**
 * VI TRI DIEU HUONG mo cho ngoai — BA gia tri, khong phai sau.
 *
 * `menus.location` trong so do co sau gia tri: `header`, `mobile`,
 * `footer_company`, `footer_products`, `footer_services`, `footer_legal`.
 * Nhung `doc/06` PHAN VIII chi liet ke ba duong:
 *
 *     GET /navigation/header    GET /navigation/mobile    GET /navigation/footer
 *
 * Va do la dung: chan trang co BON cot, va frontend ve ca bon cung mot luc.
 * Neu pho sau gia tri ra ngoai thi mot lan ve chan trang la BON yeu cau HTTP —
 * bon lan di lai mang cho mot thu xuat hien o day trang cua moi trang.
 *
 * `footer` gop bon vi tri `footer_*` thanh mot phan hoi, va `menus` giu thu tu
 * theo `location` de frontend biet cot nao la cot nao.
 */
export type NavLocation = 'header' | 'mobile' | 'footer';

/**
 * MEGA MENU SAN PHAM — TU SINH, khong nhap tay.
 *
 * `doc/06` PHAN VIII: "Mega menu san pham auto-generated: backend gop danh muc
 * `is_featured`, hang `is_featured`... Admin khong nhap tay toan bo."
 *
 * Ly do thiet ke do: catalogue co ~12 danh muc va ~4 hang, va chung doi khi bien
 * tap them san pham moi. Bat nguoi bien tap dong bo tay mot cai menu 16 muc moi
 * lan them mot hang la mot viec se KHONG duoc lam — va cai menu se lech voi
 * catalogue trong im lang.
 *
 * `null` cho vi tri `footer`: chan trang khong co mega menu, va tra ve mot doi
 * tuong rong o day se khien frontend phai doan xem "rong" nghia la "khong co" hay
 * la "chua ai danh dau noi bat".
 */
export interface ProductMegaMenuView {
  readonly categories: readonly ProductCategoryCardView[];
  readonly brands: readonly BrandCardView[];
}

export interface NavigationView {
  readonly location: NavLocation;
  readonly menus: readonly MenuView[];
  readonly product_mega_menu: ProductMegaMenuView | null;
}

export interface BannerView {
  readonly title: string;
  readonly subtitle: string | null;
  readonly image_id: string;
  readonly mobile_image_id: string | null;
  readonly image_alt: string | null;
  readonly button_label: string | null;
  /** Da giai — cung ly do voi `MenuItemView.url`. */
  readonly url: string | null;
  readonly open_new_tab: boolean;
}

export interface CustomerView {
  readonly name: string;
  readonly short_description: string | null;
  readonly logo_id: string;
  readonly website_url: string | null;
}

export interface OfficeView {
  readonly office_type: string;
  readonly name: string;
  readonly address: string;
  readonly working_hours: string | null;
  readonly phone: string | null;
  readonly fax: string | null;
  readonly email: string | null;
  readonly map_url: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

/**
 * TRANG CHU — `GET /home`.
 *
 * `doc/06` PHAN XV muc 2: endpoint RIENG, KHONG dung cho `/products`. Hai trang
 * can hai tap du lieu khac nhau.
 *
 * `sections` giu THU TU va trang thai bat/tat tu `homepage_sections`; frontend ve
 * theo thu tu do chu khong tu quyet dinh. `settings` cua moi section la cau hinh
 * HIEN THI (so luong, cach sap) — KHONG chua danh sach id: `is_featured` la nguon
 * duy nhat quyet dinh cai gi noi bat (doc/06 PHAN VIII).
 */
export interface HomeSectionView {
  readonly section_type: string;
  readonly display_order: number;
  readonly settings: Readonly<Record<string, unknown>>;
}

export interface HomeView {
  readonly locale: Locale;
  readonly sections: readonly HomeSectionView[];
  readonly banners: readonly BannerView[];
  readonly featured_categories: readonly ProductCategoryCardView[];
  readonly featured_brands: readonly BrandCardView[];
  readonly featured_applications: readonly ApplicationCardView[];
  readonly featured_products: readonly ProductCardView[];
  readonly featured_services: readonly ServiceCardView[];
  readonly featured_projects: readonly ProjectCardView[];
  readonly latest_posts: readonly PostCardView[];
  readonly customers: readonly CustomerView[];
}

/**
 * TIM KIEM — MVP chi san pham (`doc/06` PHAN IX).
 *
 * `type` co mat tu dau du chi mot gia tri duoc chap nhan: khi P1 mo rong sang
 * service/project/post/document thi URL cong khai KHONG doi. Neu bay gio bo
 * `type` thi luc do phai them mot tham so moi, va hai cach goi cung ton tai.
 */
export interface SearchHitView {
  readonly type: 'product';
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string | null;
}
