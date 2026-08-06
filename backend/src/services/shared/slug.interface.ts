import type { Locale } from '@ltv/contracts';

export const SLUG_SERVICE = Symbol('SLUG_SERVICE');

/**
 * Nhom thuc the co slug — quyet dinh tien to duong dan cong khai.
 *
 * Danh sach nay phai khop voi bang route o `02` PHAN II. Test doi chieu o
 * `slug.service.test.ts` giu cho hai ben khong lech nhau.
 */
export type SluggedEntity =
  | 'product' | 'brand' | 'product_category' | 'standard' | 'application'
  | 'industry' | 'document' | 'post_category'
  | 'page' | 'post' | 'service' | 'project';

/**
 * Ket qua kiem slug — KHONG phai boolean.
 *
 * Vi sao tra ve ly do chu khong phai `true`/`false`: ba nguon tu choi vi ba
 * ly do khac nhau, va nguoi soan thao can biet la cai nao. "Slug nay khong
 * dung duoc" khong giup ho lam gi; "duong dan `/products` la trang danh sach
 * cua he thong" thi ho doi ngay duoc.
 */
export type SlugCheckResult =
  | { readonly ok: true; readonly path: string }
  | {
      readonly ok: false;
      readonly path: string;
      readonly reason: SlugRejectReason;
      readonly code: SlugRejectCode;
    };

export type SlugRejectReason =
  /** (A) Mot noi dung khac dang dung slug nay. */
  | 'in_use'
  /** (A) Noi dung dang dung da bi xoa mem — slug van bi khoa (ADR-002 muc 3). */
  | 'soft_deleted'
  /** (B) Duong dan nay tung la `redirects.source_path` (ADR-002 muc 8B). */
  | 'in_redirects'
  /** (C) Duong dan trung route he thong (ADR-002 muc 8C). */
  | 'reserved_route'
  /** Slug sai dinh dang. */
  | 'invalid_format';

export type SlugRejectCode =
  | 'SLUG_IN_USE'
  | 'SLUG_SOFT_DELETED'
  | 'SLUG_IN_REDIRECTS'
  | 'SLUG_RESERVED'
  | 'SLUG_INVALID';

export interface SlugCheckInput {
  readonly entity: SluggedEntity;
  readonly slug: string;
  /** Bat buoc cho bon nhom co ban dich; bo qua cho nhom mot ngon ngu. */
  readonly locale?: Locale;
  /** Bo qua chinh ban ghi nay khi kiem — dung khi sua ma khong doi slug. */
  readonly exceptId?: string;
}

export interface RenameInput extends SlugCheckInput {
  readonly id: string;
  readonly currentSlug: string;
  /**
   * Da tung cong khai chua. Quyet dinh CO tao redirect hay khong:
   * slug chua bao gio cong khai thi khong ai co lien ket toi no.
   */
  readonly wasEverPublished: boolean;
}

/**
 * Hop dong RA NGOAI cua SlugService. Tang api chi cham interface nay.
 */
export interface SlugService {
  /** Duong dan cong khai day du cua mot slug — day la don vi duoc kiem. */
  publicPath(entity: SluggedEntity, slug: string, locale?: Locale): string;

  /**
   * Kiem BA NGUON theo duong dan day du (ADR-002 muc 8).
   *
   * Kiem chuoi `optidist` la khong du: `/products/optidist` va
   * `/news/optidist` la hai duong dan khac nhau, con `/products/all` thi
   * va cham voi trang danh sach he thong du chuoi `all` khong trung slug nao.
   */
  check(input: SlugCheckInput): Promise<SlugCheckResult>;

  /** Nem `ConflictError` neu khong dung duoc — de nguoi goi khong phai tu kiem. */
  assertAvailable(input: SlugCheckInput): Promise<void>;

  /**
   * DOI SLUG — kiem, ghi, va tao redirect trong CUNG mot transaction.
   *
   * Day la kich ban ADR-002 so nhat: slug da doi ma redirect chua tao, thi
   * moi lien ket cu tro toi trang do chet, va thu hang tim kiem tich luy
   * nhieu nam bien mat trong mot lan bam nut.
   */
  rename(input: RenameInput): Promise<{ readonly oldPath: string; readonly newPath: string }>;

  /**
   * Co duoc XOA VINH VIEN de giai phong slug khong (ADR-002 muc 9).
   * Chi khi CHUA TUNG cong khai. Da tung thi chi duoc xoa mem.
   */
  canHardDelete(entity: SluggedEntity, id: string): Promise<boolean>;
}
