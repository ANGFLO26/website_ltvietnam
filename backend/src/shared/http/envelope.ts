import { SetMetadata, type CustomDecorator } from '@nestjs/common';

/**
 * VO PHAN HOI THANH CONG — `{ data }` / `{ data, meta }` (doc/06 PHAN X).
 *
 * Vo LOI da dung tu truoc (`exception.filter.ts`), vo THANH CONG thi khong:
 * controller tra thang `{ user: ... }`, `{ ok: true }`. Sua bay gio vi con
 * dung MOT controller; sau nay la 32 endpoint cong khai cong 20 module quan
 * tri, va moi endpoint quen boc la mot cho frontend hong rieng le.
 *
 * Vi sao INTERCEPTOR TOAN CUC chu khong phai "moi controller tu boc":
 * huong sai phai la huong ON AO. Voi interceptor toan cuc, viet dung la khong
 * lam gi ca — khong the "quen". Voi quy uoc, viet dung doi hoi nho, va nguoi
 * ta se quen o endpoint thu 19.
 */

export interface PageMeta {
  readonly page: number;
  readonly page_size: number;
  readonly total_items: number;
  readonly total_pages: number;
}

/**
 * Danh dau bang `Symbol.for` chu khong bang `instanceof` hay mot truong
 * `isPage: true`.
 *
 *   - `instanceof` vo hieu neu module bi nap hai lan (hai ban sao cua lop la
 *     hai lop khac nhau), va no im lang khi vo hieu.
 *   - mot truong thuong (`items`/`meta`/`isPage`) co the trung voi du lieu
 *     THAT: mot endpoint tra ve mot the loai co truong `items` se bi hieu sai
 *     thanh mot trang.
 *
 * Khoa symbol khong the trung voi du lieu tu database, va `Symbol.for` la so
 * dang ky toan cuc nen no song sot qua viec nap trung module. Them mot loi:
 * `JSON.stringify` BO QUA khoa symbol, nen dau nay khong bao gio lo ra ngoai
 * ke ca khi mot cho nao do quen boc.
 */
const DAU_TRANG = Symbol.for('ltv.http.page');

export interface Page<T> {
  readonly [DAU_TRANG]: true;
  readonly items: readonly T[];
  readonly meta: PageMeta;
}

/**
 * Tao mot trang. `total_pages` do HAM NAY tinh, khong phai do noi goi truyen.
 *
 * Neu de noi goi truyen thi 32 endpoint co 32 co hoi chia sai, va sai lech
 * mot trang o cuoi danh sach la loai loi khong ai bao cao — nguoi dung chi
 * thay "trang cuoi rong" va bo qua.
 */
export function page<T>(
  items: readonly T[],
  arg: { readonly page: number; readonly pageSize: number; readonly totalItems: number },
): Page<T> {
  const pageSize = Math.max(1, Math.trunc(arg.pageSize));
  return {
    [DAU_TRANG]: true,
    items,
    meta: {
      page: Math.max(1, Math.trunc(arg.page)),
      page_size: pageSize,
      total_items: arg.totalItems,
      /**
       * Khong co du lieu -> `total_pages: 0`, KHONG phai 1.
       *
       * "Co 1 trang" ma trang do rong la mot cau noi doi nho. Giao dien muon
       * hien "Trang 1 / 1" thi tu lam `Math.max(1, total_pages)`; con hop dong
       * o day giu dung mot bat bien kiem duoc:
       * `total_pages * page_size >= total_items`.
       */
      total_pages: Math.ceil(arg.totalItems / pageSize),
    },
  };
}

export function isPage(value: unknown): value is Page<unknown> {
  return typeof value === 'object' && value !== null && DAU_TRANG in value;
}

export const NO_ENVELOPE = 'http:no-envelope';

/**
 * Mien vo cho mot endpoint — CHI danh cho nhung duong khong thuoc `/api/v1`.
 *
 * Hien tai chi co `health`. Ly do khong boc health:
 *
 *   - `health/live` va `health/ready` nam NGOAI tien to `/api/v1`
 *     (`main.ts` loai chung ra), tuc la chung khong thuoc hop dong API. Nguoi
 *     tieu thu la trinh dieu phoi (Docker/Kubernetes/proxy), khong phai
 *     frontend.
 *   - trinh dieu phoi doc MA HTTP; boc them mot lop chi lam nguoi go `curl`
 *     phai dao sau hon de xem `status`.
 *
 * Luat 10c cua `architecture.test.ts` gioi han decorator nay trong mot danh
 * sach trang TUONG MINH. Khong co luat do thi day tro thanh duong thoat: ai
 * gap kho voi vo se gan `@NoEnvelope()` roi di tiep, va hop dong ra ro dan
 * tung endpoint mot ma khong ai thay.
 */
export const NoEnvelope = (): CustomDecorator => SetMetadata(NO_ENVELOPE, true);
