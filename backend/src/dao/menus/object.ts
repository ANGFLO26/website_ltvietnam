/**
 * MENU va MUC MENU.
 *
 * `menu_items` KHONG co thu muc rieng: mot muc menu khong bao gio ton tai
 * ngoai menu cua no, va luon duoc ghi ca tap khi bien tap luu (ADR-008).
 * Cung ly do voi `product_standards` nam trong `dao/products/`.
 *
 * Vi sao `menu_items` KHONG dung `TreeDao`: bang nay co `parent_id` nhung
 * KHONG co `ancestor_ids`/`depth`. Do la co y — menu chi sau hai cap, va
 * toan bo mot menu duoc lay ve trong mot truy van roi dung cay trong bo nho.
 * Mang bo may `ancestor_ids` + chi muc GIN vao day la tra gia cho mot bai
 * toan khong ton tai.
 */
export type MenuLocation =
  'header' | 'mobile' | 'footer_company' | 'footer_products' | 'footer_services' | 'footer_legal';

export type MenuStatus = 'active' | 'hidden';

export interface Menu {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly location: MenuLocation;
  readonly status: MenuStatus;
}

/**
 * Loai lien ket da hinh, giong `banners`: `link_target_id` khong co khoa
 * ngoai. Tang tren phai chiu duoc truong hop dich da bi xoa — bo qua muc do
 * chu khong phat mot lien ket gay len menu.
 */
export type MenuLinkType =
  | 'page'
  | 'product_category'
  | 'brand'
  | 'service'
  | 'post_category'
  | 'product'
  | 'post'
  | 'custom_url'
  | 'none';

export interface MenuItem {
  readonly id: string;
  readonly menuId: string;
  readonly parentId: string | null;
  readonly label: string;
  /**
   * Khoa dich giao dien, vi du `nav.products`.
   *
   * ADR-014: dich CHU GIAO DIEN la viec cua frontend. Backend chi luu khoa,
   * khong luu ban dich — nen bang nay khong co bang translation di kem.
   * `label` la chu du phong khi frontend chua co khoa do.
   */
  readonly labelI18nKey: string | null;
  readonly titleAttribute: string | null;
  readonly linkType: MenuLinkType;
  readonly linkTargetId: string | null;
  readonly customUrl: string | null;
  readonly iconId: string | null;
  readonly openNewTab: boolean;
  readonly displayOrder: number;
  readonly status: MenuStatus;
}

/** Mot muc kem cac muc con — hinh dang ma giao dien can. */
export interface MenuItemNode extends MenuItem {
  readonly children: readonly MenuItemNode[];
}

export interface MenuTree {
  readonly menu: Menu;
  readonly items: readonly MenuItemNode[];
}

export interface CreateMenuInput {
  readonly code: string;
  readonly name: string;
  readonly location: MenuLocation;
}

export interface UpdateMenuInput {
  readonly name?: string;
  readonly location?: MenuLocation;
  readonly status?: MenuStatus;
}

export interface UpsertMenuItemInput {
  readonly id?: string;
  readonly parentId?: string | null;
  readonly label: string;
  readonly labelI18nKey?: string | null;
  readonly titleAttribute?: string | null;
  readonly linkType: MenuLinkType;
  readonly linkTargetId?: string | null;
  readonly customUrl?: string | null;
  readonly iconId?: string | null;
  readonly openNewTab?: boolean;
  readonly displayOrder?: number;
  readonly status?: MenuStatus;
}
