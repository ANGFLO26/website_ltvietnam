import {
  Inject,
  Injectable,
  StreamableFile,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import { isPage, NO_ENVELOPE } from './envelope.js';

/**
 * Boc MOI phan hoi thanh cong thanh `{ data }` hoac `{ data, meta }`.
 *
 * Controller tra ve TAI NGUYEN, khong tra ve vo. Do la ranh gioi: tang api
 * quyet dinh *cai gi* di ra, con *hinh dang* cua phan hoi la mot quyet dinh
 * duy nhat, o mot cho duy nhat.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  /**
   * `@Inject(Reflector)` TUONG MINH — khong phai du thua.
   *
   * `tsx` (esbuild) khong sinh `design:paramtypes`, nen suy kieu tham so cho
   * `Reflector` tra ve `undefined` va interceptor nhan mot phu thuoc rong.
   * Ban dich bang `tsc` thi chay duoc, nen loi nay CHI xuat hien o che do dev
   * — dung cho de doc nhat. `AuthGuard` va `RateLimitGuard` da dinh dung loi
   * nay mot lan.
   */
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Chi ap cho HTTP. Sau nay co worker/queue thi chung khong co "phan hoi".
    if (ctx.getType() !== 'http') return next.handle();

    const mien = this.reflector.getAllAndOverride<boolean>(NO_ENVELOPE, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (mien === true) return next.handle();

    return next.handle().pipe(map((value: unknown) => boc(value)));
  }
}

export function boc(value: unknown): unknown {
  /**
   * KHONG tra gi -> khong co than. Day la cach nhan biet 204.
   *
   * Ban dau toi doc `res.statusCode` de biet co phai 204 khong. Do la SAI:
   * Nest ap `@HttpCode(...)` trong `RouterResponseController`, tuc la SAU khi
   * chuoi interceptor chay xong. Luc `map` chay thi `res.statusCode` van la
   * 200 mac dinh cua Express, nen phep kiem do luon sai va `@HttpCode(204)`
   * se nhan mot than `{ "data": null }` — 204 co than la sai chuan HTTP.
   *
   * Doc gia tri TRA VE thi khong phu thuoc noi tang cua Nest: handler nao
   * khong co gi de noi thi khai bao `Promise<void>`, va no khong bi boc.
   *
   * Phan biet `undefined` voi `null` la CO Y: `null` la mot cau tra loi that
   * ("khong co ban nhap nao"), nen `{ data: null }` dung. `undefined` la
   * "khong tra gi ca".
   */
  if (value === undefined) return undefined;

  /**
   * Tep va luong di THANG, khong boc.
   *
   * `doc/06` co `GET /documents/:slug/download`. Boc mot `Buffer` thanh
   * `{ data: <Buffer> }` roi de Nest tuan tu hoa thanh JSON se tra ve mot
   * doi tuong `{"data":{"type":"Buffer","data":[80,68,70,...]}}` — tep PDF
   * hong, va hong theo kieu chi phat hien khi mo tep. Chan o day thi endpoint
   * tai tep khong can biet gi ve vo.
   */
  if (value instanceof StreamableFile) return value;
  if (Buffer.isBuffer(value)) return value;
  if (typeof (value as { pipe?: unknown } | null)?.pipe === 'function') return value;

  if (isPage(value)) return { data: value.items, meta: value.meta };

  return { data: value };
}
