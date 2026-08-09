import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DomainError, type ErrorCode } from '../errors.js';
import { createLogger } from '../logging/logger.js';

/**
 * Error envelope chuan (doc/06 PHAN X / A24):
 *   { "error": { "code", "message", "details", "request_id" } }
 *
 * Dich loi DOMAIN sang ma HTTP. Tang domain khong biet HTTP; anh xa nam o day.
 */
const HTTP_BY_KIND: Record<ErrorCode, HttpStatus> = {
  VALIDATION_FAILED: HttpStatus.UNPROCESSABLE_ENTITY,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
  DEPENDENCY_UNAVAILABLE: HttpStatus.SERVICE_UNAVAILABLE,
  INTERNAL: HttpStatus.INTERNAL_SERVER_ERROR,
};

const log = createLogger('info', { scope: 'http' });

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = req.requestId ?? '';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Da co loi xay ra.';
    let details: unknown = null;

    if (exception instanceof DomainError) {
      status = HTTP_BY_KIND[exception.kind];
      code = exception.code;
      message = exception.message;
      details = exception.details ?? null;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      code =
        typeof body === 'object' && body && 'code' in body
          ? String((body as { code: unknown }).code)
          : httpCodeName(status);
      message = exception.message;
      if (typeof body === 'object' && body && 'message' in body) {
        details = (body as { message: unknown }).message;
      }
    } else if (laLoiDauVao(exception)) {
      /**
       * Loi kieu `http-errors` — body-parser nem loai nay, KHONG phai
       * `HttpException` cua Nest.
       *
       * Do that o F-1e: gui than 2 MB voi `BODY_LIMIT_BYTES = 1 MiB` thi
       * body-parser nem `PayloadTooLargeError` (mot `Error` thuong co `.status
       * = 413` va `.type = 'entity.too.large'`). Filter khong biet dang do nen
       * roi vao nhanh "loi khong luong truoc" va tra **500**.
       *
       * Hau qua: nguoi goi gui yeu cau qua lon — LOI CUA HO — va nhan "da co
       * loi xay ra". Ho khong the biet phai gui nho hon. Con nguoi van hanh thi
       * thay 500 va di tim bug trong ma nguon.
       *
       * Chi tin `.status` trong khoang 4xx: do la quy uoc cua `http-errors`
       * (Express dung khap noi). Mot loi 5xx tu thu vien sau van phai di qua
       * nhanh "khong luong truoc" de duoc ghi log day du.
       */
      const e = exception as { status?: number; statusCode?: number; type?: string };
      status = (e.status ?? e.statusCode)!;
      code = MA_THEO_TYPE[e.type ?? ''] ?? httpCodeName(status);
      message =
        status === HttpStatus.PAYLOAD_TOO_LARGE
          ? 'Du lieu gui len qua lon.'
          : 'Du lieu gui len khong doc duoc.';
    } else if (laLoiKetNoi(exception)) {
      /**
       * PHU THUOC SAP != HE THONG HONG.
       *
       * Truoc F-1e, database sap thi dang nhap tra 500. Hai hau qua:
       *
       *   - canh bao van hanh khong phan biet duoc "ma nguon co bug" voi
       *     "PostgreSQL khong len" — hai viec can hai phan ung khac nhau
       *   - trinh dieu phoi va CDN doi xu voi 503 khac 500: 503 la "thu lai
       *     sau", 500 la "dung thu nua". Tra sai ma nghia la mat co hoi tu
       *     phuc hoi.
       *
       * `DependencyUnavailableError` da co san va da anh xa sang 503; cai
       * thieu la khong ai NEM no khi pool that bai.
       */
      status = HttpStatus.SERVICE_UNAVAILABLE;
      code = 'DEPENDENCY_UNAVAILABLE';
      message = 'He thong dang tam thoi khong san sang. Vui long thu lai.';
      // Ghi CO chi tiet vao log (nguoi van hanh can), KHONG tra ra ngoai.
      log.error('dependency_unavailable', {
        request_id: requestId,
        path: req.path,
        pg_code: (exception as { code?: unknown }).code,
        error: exception instanceof Error ? exception.message : String(exception),
      });
    } else {
      // Loi khong luong truoc: KHONG lo chi tiet noi bo ra ngoai.
      log.error('unhandled_exception', {
        request_id: requestId,
        path: req.path,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack?.split('\n').slice(0, 4) : undefined,
      });
    }

    res.status(status).json({ error: { code, message, details, request_id: requestId } });
  }
}

/**
 * Ma nghiep vu cho tung loai loi cua body-parser.
 *
 * `httpCodeName(413)` se cho `INTERNAL_ERROR` (vi 413 khong co trong bang do),
 * nen phai dat ten tuong minh — client can phan biet "gui qua lon" voi "JSON
 * sai cu phap" de sua dung cho.
 */
const MA_THEO_TYPE: Record<string, string> = {
  /**
   * CHI mot dong, va do la dong DUY NHAT toi da xac nhan den duoc day.
   *
   * Ban dau toi liet ke ca `entity.parse.failed`, `charset.unsupported`,
   * `request.aborted`... theo tai lieu cua body-parser. Roi do that: JSON sai
   * cu phap KHONG di qua nhanh nay — Nest boc no thanh `BadRequestException`
   * truoc khi filter thay:
   *
   *   ctor=BadRequestException  status=400  type=undefined
   *
   * Nen 400 la dung, chi la no den bang duong khac. Nhung `entity.parse.failed`
   * trong bang nay se la mot dong KHONG BAO GIO chay — dung loai "cau hinh chet"
   * ma `config-usage.test.ts` ra doi de chan. Bo di thi bang nay noi that.
   *
   * Them dong moi khi DO duoc rang no den day, khong phai khi doc tai lieu.
   */
  'entity.too.large': 'PAYLOAD_TOO_LARGE',
};

/** Loi mang `.status` 4xx theo quy uoc `http-errors` — loi cua NGUOI GOI. */
function laLoiDauVao(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  if (e instanceof DomainError || e instanceof HttpException) return false;
  const s = e as { status?: unknown; statusCode?: unknown };
  const ma = typeof s.status === 'number' ? s.status : s.statusCode;
  return typeof ma === 'number' && ma >= 400 && ma <= 499;
}

/**
 * Ma loi nghia la "khong noi duoc voi database", chu khong phai "truy van sai".
 *
 * DANH DOI, noi ro vi no khong hien nhien: day la kien thuc ve PostgreSQL/libpq
 * nam trong `shared/http`, tuc la ngoai `dao/`. Luat 2 cam import `pg`, va file
 * nay KHONG import — chi so sanh chuoi ma loi. Nhung ve nguyen tac day van la
 * mot chi tiet cua tang duoi lot len tang tren.
 *
 * Cach "dung" hon la boc moi loi trong tang dao thanh
 * `DependencyUnavailableError`. Nhung the nghia la 23 DAO x hang chuc phuong
 * thuc phai co try/catch, va mot cho quen la mot cho tra 500 — dung loai loi
 * im lang ma cach nay ra doi de tranh. Mot bang tra cuu o day thi khong the
 * quen o dau ca.
 *
 * Chi liet ke loi TRUYEN TAI. Loi rang buoc (23505 unique, 23503 FK) KHONG o
 * day: chung la 409/422 va tang service phai xu ly tung cai, khong duoc gom
 * thanh "he thong khong san sang".
 */
const MA_LOI_KET_NOI = new Set([
  // libuv / socket — chua bao gio noi duoc toi may chu
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'ECONNRESET',
  'EPIPE',
  'EHOSTUNREACH',
  // PostgreSQL class 08 — loi ket noi
  '08000',
  '08003',
  '08006',
  '08001',
  '08004',
  '08007',
  '08P01',
  // May chu chu dong dong ket noi hoac dang tat
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now (dang khoi dong lai)
  '53300', // too_many_connections
  '53400', // configuration_limit_exceeded
]);

function laLoiKetNoi(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const ma = (e as { code?: unknown }).code;
  if (typeof ma === 'string' && MA_LOI_KET_NOI.has(ma)) return true;

  /**
   * Pool het thoi gian cho ket noi KHONG co `code`.
   *
   * `pg` nem `Error('timeout exceeded when trying to connect')` tran. Do la
   * dung nghia "khong noi duoc", va no la truong hop de xay ra nhat khi
   * database qua tai — nen phai bat ca no.
   */
  const msg = (e as { message?: unknown }).message;
  return typeof msg === 'string' && /timeout exceeded when trying to connect/i.test(msg);
}

function httpCodeName(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_FAILED',
    429: 'RATE_LIMITED',
    503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] ?? 'INTERNAL_ERROR';
}
