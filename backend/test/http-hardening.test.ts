import { describe, expect, it } from 'vitest';
import { HttpException, HttpStatus, type ArgumentsHost } from '@nestjs/common';
import { AppExceptionFilter } from '../src/shared/http/exception.filter.js';
import { createSecurityHeaders } from '../src/shared/http/security.middleware.js';
import {
  ConflictError,
  DependencyUnavailableError,
  NotFoundError,
} from '../src/shared/errors.js';
import type { AppConfig } from '@ltv/config';

/**
 * Ba viec o tang HTTP, khong can database va khong can khoi dong Nest.
 *
 * `AppExceptionFilter.catch` chi can mot `ArgumentsHost` gia; `res` gia ghi lai
 * status/body/header de khang dinh. Phep thu tren HTTP that la
 * `scripts/smoke-auth.mjs`.
 */

interface ResGia {
  statusCode: number | null;
  body: unknown;
  headers: Record<string, string>;
}

function moiTruongGia(path = '/api/v1/x', requestId = 'rid-1') {
  const res: ResGia = { statusCode: null, body: null, headers: {} };
  const doiTuong = {
    status(n: number) { res.statusCode = n; return doiTuong; },
    json(b: unknown) { res.body = b; return doiTuong; },
    setHeader(k: string, v: string) { res.headers[k] = v; },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => doiTuong,
      getRequest: () => ({ path, requestId }),
    }),
  } as unknown as ArgumentsHost;
  return { res, host };
}

const bat = (e: unknown): ResGia => {
  const { res, host } = moiTruongGia();
  new AppExceptionFilter().catch(e, host);
  return res;
};

describe('loi PHU THUOC -> 503, khong phai 500', () => {
  /**
   * `doc/13` van de so 8. Truoc F-1e, database sap thi dang nhap tra 500.
   *
   * Vi sao no quan trong hon mot con so: 503 la "thu lai sau", 500 la "dung thu
   * nua". Trinh dieu phoi, CDN va thu vien client doi xu voi hai ma nay KHAC
   * nhau, nen tra sai ma la mat co hoi tu phuc hoi. Va canh bao van hanh khong
   * phan biet duoc "ma nguon co bug" voi "PostgreSQL khong len" — hai viec can
   * hai phan ung khac nhau.
   */
  it('ECONNREFUSED -> 503', () => {
    const r = bat(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }));
    expect(r.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect((r.body as { error: { code: string } }).error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });

  it('PostgreSQL class 08 (loi ket noi) -> 503', () => {
    for (const ma of ['08006', '08003', '08P01']) {
      expect(bat(Object.assign(new Error('x'), { code: ma })).statusCode)
        .toBe(HttpStatus.SERVICE_UNAVAILABLE);
    }
  });

  it('may chu dang tat / qua tai ket noi -> 503', () => {
    for (const ma of ['57P01', '57P03', '53300']) {
      expect(bat(Object.assign(new Error('x'), { code: ma })).statusCode)
        .toBe(HttpStatus.SERVICE_UNAVAILABLE);
    }
  });

  it('pool het thoi gian cho — KHONG co `code` — van la 503', () => {
    /**
     * `pg` nem `Error('timeout exceeded when trying to connect')` tran, khong
     * kem ma loi. Day la truong hop DE XAY RA NHAT khi database qua tai, nen
     * bat theo ma loi thoi se bo sot dung cai pho bien nhat.
     */
    const r = bat(new Error('timeout exceeded when trying to connect'));
    expect(r.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('KHONG lo chi tiet noi bo trong than 503', () => {
    const r = bat(Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:5432'), { code: 'ECONNREFUSED' }));
    const s = JSON.stringify(r.body);
    expect(s).not.toContain('10.0.0.5');
    expect(s).not.toContain('ECONNREFUSED');
  });

  it('loi RANG BUOC KHONG bi gom thanh 503', () => {
    /**
     * Ranh gioi quan trong nhat cua bang tra cuu nay. `23505` (trung khoa duy
     * nhat) la mot xung dot NGHIEP VU — tang service phai xu ly va tra 409.
     * Gom no vao "he thong khong san sang" se che di mot bug that, va noi voi
     * client "thu lai sau" cho mot yeu cau se KHONG BAO GIO thanh cong.
     */
    for (const ma of ['23505', '23503', '23514', '22P02', '42703']) {
      expect(
        bat(Object.assign(new Error('x'), { code: ma })).statusCode,
        `ma ${ma} khong duoc thanh 503`,
      ).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    }
  });

  it('DependencyUnavailableError cua tang domain van la 503', () => {
    const r = bat(new DependencyUnavailableError('AUTH_BUSY', 'he thong qua tai'));
    expect(r.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });
});

describe('loi DAU VAO cua nguoi goi -> 4xx, khong phai 500', () => {
  /**
   * Do that o F-1e: gui than 2 MB voi `BODY_LIMIT_BYTES = 1 MiB` thi truoc khi
   * va, phan hoi la **500 INTERNAL_ERROR**. body-parser nem loi kieu
   * `http-errors` (mot `Error` thuong co `.status`/`.type`), khong phai
   * `HttpException` cua Nest, nen filter roi vao nhanh "khong luong truoc".
   *
   * Hau qua: nguoi goi gui yeu cau qua lon — LOI CUA HO — va nhan "da co loi
   * xay ra", khong biet phai gui nho hon. Nguoi van hanh thay 500 va di tim bug
   * trong ma nguon.
   */
  const loiHttp = (status: number, type?: string) =>
    Object.assign(new Error('body-parser'), { status, type });

  it('than qua lon -> 413 PAYLOAD_TOO_LARGE', () => {
    const r = bat(loiHttp(413, 'entity.too.large'));
    expect(r.statusCode).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect((r.body as { error: { code: string } }).error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('loi 4xx khong ro `type` van giu dung ma', () => {
    expect(bat(loiHttp(415)).statusCode).toBe(415);
  });

  it('loi 5xx tu thu vien VAN di nhanh "khong luong truoc"', () => {
    /**
     * Chi tin `.status` trong khoang 4xx. Mot thu vien nem `.status = 502` thi
     * do khong phai loi cua nguoi goi, va no phai duoc ghi log day du nhu moi
     * loi khong luong truoc — khong duoc lang le chuyen tiep ra ngoai.
     */
    const r = bat(Object.assign(new Error('thu vien hong'), { status: 502 }));
    expect(r.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(JSON.stringify(r.body)).not.toContain('thu vien hong');
  });

  it('JSON sai cu phap -> 400 (Nest boc thanh BadRequestException)', () => {
    /**
     * Ghim hanh vi da DO duoc, khong phai hanh vi toi doan. Probe tren may chu
     * that cho:
     *
     *   ctor=BadRequestException  status=400  type=undefined
     *
     * Nghia la loi nay KHONG di qua nhanh `http-errors`; Nest boc no truoc. Nen
     * ma la `BAD_REQUEST` chu khong phai `MALFORMED_JSON`, va do la dung — chi
     * la den bang duong khac. Ghi lai de lan sau khong ai "sua" cho nay theo
     * mot gia thiet sai.
     */
    const r = bat(new HttpException('Expected property name', HttpStatus.BAD_REQUEST));
    expect(r.statusCode).toBe(400);
    expect((r.body as { error: { code: string } }).error.code).toBe('BAD_REQUEST');
  });
});

describe('anh xa loi domain khong bi anh huong', () => {
  it('NotFoundError -> 404, ConflictError -> 409', () => {
    expect(bat(new NotFoundError('X_NOT_FOUND', 'khong thay')).statusCode).toBe(404);
    expect(bat(new ConflictError('X_TAKEN', 'da dung')).statusCode).toBe(409);
  });

  it('HttpException cua Nest giu nguyen ma', () => {
    expect(bat(new HttpException('qua lon', HttpStatus.PAYLOAD_TOO_LARGE)).statusCode).toBe(413);
  });

  it('loi la -> 500 va than KHONG chua thong diep goc', () => {
    const r = bat(new Error('ten bang noi bo bi lo'));
    expect(r.statusCode).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain('ten bang noi bo bi lo');
  });

  it('vo LOI luon co bon truong, ke ca khi khong co request id', () => {
    const { res, host } = moiTruongGia('/x', '');
    new AppExceptionFilter().catch(new Error('x'), host);
    expect(Object.keys((res.body as { error: object }).error).sort())
      .toEqual(['code', 'details', 'message', 'request_id']);
  });
});

describe('security header', () => {
  const chay = (cfg: Partial<AppConfig>): Record<string, string> => {
    const headers: Record<string, string> = {};
    const res = { setHeader: (k: string, v: string) => { headers[k] = v; } };
    let daGoiNext = false;
    createSecurityHeaders(cfg as AppConfig)(
      {} as never,
      res as never,
      () => { daGoiNext = true; },
    );
    expect(daGoiNext, 'middleware PHAI goi next() — neu khong thi moi yeu cau treo').toBe(true);
    return headers;
  };

  it('dat cac header co ban', () => {
    const h = chay({ HSTS_MAX_AGE_SECONDS: 0 });
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['Cache-Control']).toBe('no-store');
  });

  it('HSTS TAT khi max-age = 0 — mac dinh an toan', () => {
    /**
     * HSTS noi voi trinh duyet "tu nay chi dung HTTPS cho ten mien nay", va
     * trinh duyet NHO rat lau. Bat khi chua co chung chi hop le se lam chinh
     * minh khong truy cap duoc, va khong the go nhanh. Nen mac dinh phai la
     * TAT, va bat phai la mot quyet dinh co y thuc.
     */
    expect(chay({ HSTS_MAX_AGE_SECONDS: 0 })['Strict-Transport-Security']).toBeUndefined();
  });

  it('HSTS BAT khi cau hinh tuong minh', () => {
    expect(chay({ HSTS_MAX_AGE_SECONDS: 31_536_000 })['Strict-Transport-Security'])
      .toBe('max-age=31536000; includeSubDomains');
  });

  it('KHONG dat CSP — day la quyet dinh, khong phai bo sot', () => {
    /**
     * CSP bao ve TRANG, va trang la cua Next.js. Dat CSP tren mot phan hoi JSON
     * khong bao ve gi ca, va no lam nguoi doc tin rang van de CSP da xong.
     */
    expect(chay({ HSTS_MAX_AGE_SECONDS: 0 })['Content-Security-Policy']).toBeUndefined();
  });
});
