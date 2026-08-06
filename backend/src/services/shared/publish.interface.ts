import type { Locale } from '@ltv/contracts';

export const PUBLISH_SERVICE = Symbol('PUBLISH_SERVICE');

/**
 * Bay loai thuc the co the xuat ban (`05` PHAN IV).
 *
 * `standard`, `industry`, `application`, `post_category` khong nam o day:
 * chung mac dinh `published` va la du kien tham chieu, khong phai noi dung
 * bien tap. Bat soan thao "xuat ban" tung tieu chuan la viec vo ich.
 */
export type PublishableEntity =
  | 'product' | 'brand' | 'document'          // mot ngon ngu
  | 'service' | 'project' | 'post' | 'page';  // co ban dich

/**
 * Mot dieu kien chua dat.
 *
 * `field` de giao dien to sang dung o dang thieu, thay vi hien mot thong bao
 * chung chung buoc nguoi soan thao doi tim.
 */
export interface PublishBlocker {
  readonly field: string;
  readonly message: string;
}

export type PublishCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly blockers: readonly PublishBlocker[] };

export interface PublishTarget {
  readonly entity: PublishableEntity;
  readonly id: string;
  /** Bat buoc cho bon nhom co ban dich. */
  readonly locale?: Locale;
}

/**
 * Hop dong RA NGOAI. Tang api chi cham interface nay.
 *
 * Vi sao quy tac publish o tang SERVICE chu khong o DB (`05` PHAN IV):
 * ban nhap PHAI luu duoc khi con thieu truong — nguoi soan thao viet dan
 * trong nhieu ngay. Ep o DB thi khong luu nhap duoc; khong ep o dau thi
 * trang cong khai thieu anh, thieu mo ta. Tang service la cho duy nhat
 * phan biet duoc "dang viet" voi "dinh cho ca the gioi xem".
 */
export interface PublishService {
  /**
   * Kiem dieu kien ma KHONG xuat ban — dung cho nut "kiem tra truoc" va cho
   * viec bat/tat nut Publish tren giao dien.
   *
   * Tra ve DANH SACH dieu kien thieu chu khong dung o cai dau tien: nguoi
   * soan thao sua mot vong roi bam lai, thay them mot loi nua, la trai
   * nghiem lam ho bo cuoc.
   */
  check(target: PublishTarget): Promise<PublishCheck>;

  /**
   * Xuat ban. Kiem lai truoc khi ghi, trong CUNG transaction.
   *
   * Kiem o `check()` roi tin la du la sai: giua luc bam nut va luc ghi, mot
   * nguoi khac co the da xoa cai anh dai dien.
   */
  publish(target: PublishTarget, at?: Date): Promise<void>;

  /** Ha co. Khong dung toi `first_published_at` (ADR-002 muc 7). */
  unpublish(target: PublishTarget): Promise<void>;
}
