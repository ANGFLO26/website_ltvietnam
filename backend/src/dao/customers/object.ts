import type { EntityStatus } from '../brands/object.js';

/**
 * KHACH HANG.
 *
 * HAI co che kiem soat hien thi, va chung KHONG thay the nhau:
 *   `status`    ban ghi nay da soan xong chua (nhap / da duyet / an)
 *   `isPublic`  khach nay CO CHO PHEP neu ten tren website khong
 *
 * Gop lai thanh mot la sai: mot khach hang co the da duyet noi dung xong
 * (`published`) nhung van chua ky giay dong y dung logo (`is_public = false`).
 * Dung logo khach khi chua duoc phep la chuyen phap ly, khong phai loi giao dien.
 * Muc C2 trong ke hoach ghi lai dung viec nay.
 */
export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly shortDescription: string | null;
  readonly logoId: string | null;
  readonly industryId: string | null;
  readonly websiteUrl: string | null;
  readonly isPublic: boolean;
  readonly isFeatured: boolean;
  readonly displayOrder: number;
  readonly status: EntityStatus;
}

/**
 * Khach hang duoc phep hien logo tren website.
 * Hai dieu kien thanh KIEU, giong `DownloadableDocument`.
 */
export interface PublicCustomer extends Customer {
  readonly status: 'published';
  readonly isPublic: true;
  readonly logoId: string;
}

export interface CreateCustomerInput {
  readonly name: string;
  readonly shortDescription?: string | null;
  readonly logoId?: string | null;
  readonly industryId?: string | null;
  readonly websiteUrl?: string | null;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput> & {
  readonly isPublic?: boolean;
  readonly isFeatured?: boolean;
  readonly displayOrder?: number;
};

export interface CustomerFilter {
  readonly status?: EntityStatus;
  readonly isPublic?: boolean;
  readonly isFeatured?: boolean;
  readonly industryId?: string;
  readonly includeDeleted?: boolean;
}
