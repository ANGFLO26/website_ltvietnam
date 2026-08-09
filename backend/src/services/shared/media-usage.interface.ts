export const MEDIA_USAGE_SERVICE = Symbol('MEDIA_USAGE_SERVICE');

/**
 * Ket qua ra soat mot tep truoc khi xoa.
 *
 * Tach hai con so ra chu khong gop thanh mot tong: hai nguon tham chieu co
 * ban chat khac nhau va khi go ra thi lam khac nhau. `foreignKeys` la anh
 * dai dien, logo — go bang cach sua ban ghi do. `contentBlocks` la anh nhung
 * giua bai — go bang cach mo trinh soan thao. Bao "dang duoc dung 5 cho" ma
 * khong noi la cho nao thi nguoi dung phai di tim.
 */
export interface MediaUsage {
  readonly mediaId: string;
  /** Cot khoa ngoai tro toi tep nay (anh dai dien, logo, icon, tep tai lieu). */
  readonly foreignKeys: number;
  /** Tham chieu tu khoi noi dung JSONB, qua `content_media_refs`. */
  readonly contentBlocks: number;
  readonly total: number;
  /** Chi tiet cho giao dien to sang cho dang dung. */
  readonly places: readonly MediaUsagePlace[];
}

export interface MediaUsagePlace {
  readonly source: 'foreign_key' | 'content_block';
  readonly entityType: string;
  readonly entityId: string;
  readonly fieldName: string;
  readonly locale: string | null;
}

export type MediaDeleteDecision =
  { readonly allowed: true } | { readonly allowed: false; readonly usage: MediaUsage };

export interface MediaUsageService {
  /**
   * Dem tham chieu tu CA HAI nguon (lo hong A4).
   *
   * Dem thieu mot nguon la xoa nham anh dang hien tren trang. Dem tu khoa
   * ngoai thoi thi bo qua moi anh nhung giua bai viet — va do la phan lon
   * anh trong mot website noi dung.
   */
  usage(mediaId: string): Promise<MediaUsage>;

  /** `false` khi con bat ky tham chieu nao. Kem chi tiet de giao dien giai thich. */
  canDelete(mediaId: string): Promise<MediaDeleteDecision>;

  /**
   * Xoa MEM. Nem `ConflictError` neu con tham chieu.
   *
   * Vi sao xoa mem chu khong xoa han: tep con nam trong kho luu tru, va viec
   * don tep la thao tac KHONG HOAN TAC DUOC. Tach hai buoc ra cho phep khoi
   * phuc trong khoang giua, va do la thu duy nhat cuu duoc mot lan bam nham.
   */
  softDelete(mediaId: string, at?: Date): Promise<void>;

  /**
   * Ung vien don tep that: da xoa mem du lau, chua purge, VA da kiem lai
   * mot lan nua la khong con tham chieu.
   *
   * Kiem lai la co y: giua luc xoa mem va luc don, mot ban nhap co the da
   * duoc khoi phuc va dung lai anh do.
   */
  findPurgeable(before: Date, limit: number): Promise<readonly string[]>;
}
