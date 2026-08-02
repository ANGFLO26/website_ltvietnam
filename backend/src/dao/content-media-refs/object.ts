/**
 * THAM CHIEU MEDIA TRONG KHOI NOI DUNG — bang bit LO HONG A4.
 *
 * Van de goc: anh nhung trong khoi JSONB (`overview`, `content`, `description`)
 * KHONG co khoa ngoai. PostgreSQL khong biet rang `products.overview` chua
 * `media_id`, nen `ON DELETE RESTRICT` khong bao ve gi ca. Ket qua: xoa mot
 * anh dang hien giua bai viet ma khong co gi can.
 *
 * Bang nay la CHI MUC NGUOC do ung dung tu duy tri: moi lan luu mot truong
 * khoi, `extractMediaIds()` quet ra danh sach id va ghi lai o day. Nho co
 * khoa ngoai `media_id ... RESTRICT`, PostgreSQL lai co the tu choi.
 *
 * DIEU KIEN de no hoat dong: MOI duong ghi khoi noi dung deu phai goi
 * `replaceForField`. Bo sot mot cho la lo hong mo lai o cho do — va khong co
 * gi bao. Day la cai gia cua viec dung JSONB cho noi dung.
 */
export interface ContentMediaRef {
  readonly id: string;
  readonly mediaId: string;
  /** `product`, `post_translation`, `page_translation`, ... */
  readonly entityType: string;
  readonly entityId: string;
  /** `null` cho thuc the khong phan theo ngon ngu. */
  readonly locale: string | null;
  /** Ten truong chua khoi: `overview`, `content`, `description`. */
  readonly fieldName: string;
}

/** Dinh danh mot O CHUA KHOI cu the — la don vi ma `replaceForField` thay. */
export interface ContentFieldRef {
  readonly entityType: string;
  readonly entityId: string;
  readonly fieldName: string;
  readonly locale?: string | null;
}
