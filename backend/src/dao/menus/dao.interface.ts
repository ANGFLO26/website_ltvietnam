import type {
  CreateMenuInput,
  Menu,
  MenuItem,
  MenuLocation,
  MenuTree,
  UpsertMenuItemInput,
} from './object.js';

export interface MenuDao {
  findById(id: string): Promise<Menu | null>;
  /** Tra cuu theo khoa nghiep vu — cach ma nguon tro toi mot menu. */
  findByCode(code: string): Promise<Menu | null>;
  listAll(): Promise<Menu[]>;

  insert(input: CreateMenuInput): Promise<Menu>;
  delete(id: string): Promise<void>;

  /**
   * Ca menu, da dung thanh cay, trong MOT truy van.
   *
   * `null` khi menu khong ton tai hoac dang `hidden`. Chi tra ve muc
   * `active`; muc `hidden` bi loai ca nhanh con cua no — an mot muc cha ma
   * de muc con noi len la sai y bien tap.
   */
  findTreeByCode(code: string): Promise<MenuTree | null>;

  /** Danh sach phang, ke ca muc an — cho man hinh quan tri. */
  listItems(menuId: string): Promise<MenuItem[]>;

  /**
   * Thay TOAN BO muc cua mot menu.
   *
   * Nhan ca cay mot luc vi giao dien keo tha sinh ra trang thai cuoi cung.
   * Ghi tung muc mot se de lai menu o trang thai nua voi neu dut giua chung,
   * va menu la thu hien tren MOI trang.
   *
   * Muc co `id` duoc giu nguyen dinh danh (de lien ket cha-con on dinh);
   * muc khong co `id` la muc moi.
   */
  replaceItems(menuId: string, items: readonly UpsertMenuItemInput[]): Promise<void>;

  /** Menu theo vi tri — chan trang can bon menu cung luc. */
  findTreesByLocations(locations: readonly MenuLocation[]): Promise<MenuTree[]>;
}
