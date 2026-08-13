import type {
  ActiveBanner,
  Banner,
  BannerFilter,
  CreateBannerInput,
  UpdateBannerInput,
} from './object.js';

export interface BannerDao {
  findById(id: string): Promise<Banner | null>;
  /** Danh sach quan tri — thay ca banner het han va ban nhap. */
  list(filter: BannerFilter): Promise<Banner[]>;

  /**
   * Banner DANG hieu luc, tinh bang `NOW()` cua PostgreSQL.
   *
   * Ba dieu kien: `published`, da toi `start_at` (hoac khong dat), chua qua
   * `end_at` (hoac khong dat). Va anh phai chua bi xoa mem.
   *
   * Dung dong ho cua DATABASE chu khong phai cua Node: nhieu tien trinh Node
   * co the lech gio nhau, va mot banner bat/tat khac nhau giua hai may chu
   * la loi khong the tai hien.
   */
  findActive(): Promise<ActiveBanner[]>;

  insert(input: CreateBannerInput): Promise<Banner>;
  update(id: string, input: UpdateBannerInput): Promise<Banner>;
  delete(id: string): Promise<void>;
  publish(id: string): Promise<Banner>;
  unpublish(id: string): Promise<Banner>;
}
