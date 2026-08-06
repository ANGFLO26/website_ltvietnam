import type { AppConfig } from '@ltv/config';
import type { Request, Response } from 'express';

/**
 * COOKIE PHIEN — bon thuoc tinh, moi cai chan mot thu khac nhau.
 *
 *   HttpOnly   JavaScript khong doc duoc. Mot lo hong XSS van khong lay
 *              duoc the phien. Day la ly do KHONG luu the trong localStorage.
 *   Secure     chi gui qua HTTPS. Mac dinh `true`; tat duoc tren may ca nhan
 *              nhung `assertProductionSafe()` tu choi khi len that.
 *   SameSite   `strict` — trinh duyet khong gui cookie khi yeu cau den tu
 *              trang khac. Day la lop chan CSRF thu nhat.
 *   Path       gioi han pham vi gui cookie.
 */
export function setSessionCookie(res: Response, cfg: AppConfig, token: string, ttlSeconds: number): void {
  res.cookie(cfg.COOKIE_NAME, token, {
    httpOnly: true,
    secure: cfg.COOKIE_SECURE,
    sameSite: cfg.COOKIE_SAME_SITE,
    path: '/',
    maxAge: ttlSeconds * 1000,
  });
}

export function clearSessionCookie(res: Response, cfg: AppConfig): void {
  // Phai truyen DUNG cac thuoc tinh nhu luc dat, neu khong trinh duyet coi
  // day la cookie khac va cookie cu van con.
  res.clearCookie(cfg.COOKIE_NAME, {
    httpOnly: true,
    secure: cfg.COOKIE_SECURE,
    sameSite: cfg.COOKIE_SAME_SITE,
    path: '/',
  });
}

/**
 * COOKIE CSRF — CO Y cho JavaScript doc duoc (`httpOnly: false`).
 *
 * Mau "double-submit": may chu dat mot gia tri ngau nhien vao cookie; giao
 * dien doc no va gui lai trong header. Trang cua ke tan cong KHONG doc duoc
 * cookie cua mien khac (chinh sach cung nguon), nen no khong dien duoc header
 * — du trinh duyet co tu dinh kem cookie phien.
 *
 * Gia tri nay khong phai bi mat: no khong cap quyen gi ca. Bi mat la cookie
 * phien, va cookie do van `HttpOnly`.
 */
export function setCsrfCookie(res: Response, cfg: AppConfig, value: string, ttlSeconds: number): void {
  res.cookie(cfg.CSRF_COOKIE_NAME, value, {
    httpOnly: false,
    secure: cfg.COOKIE_SECURE,
    sameSite: cfg.COOKIE_SAME_SITE,
    path: '/',
    maxAge: ttlSeconds * 1000,
  });
}

export function clearCsrfCookie(res: Response, cfg: AppConfig): void {
  res.clearCookie(cfg.CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: cfg.COOKIE_SECURE,
    sameSite: cfg.COOKIE_SAME_SITE,
    path: '/',
  });
}

/**
 * Doc cookie tu header.
 *
 * Tu phan tich thay vi them `cookie-parser`: ta can dung MOT cookie va phep
 * phan tich la mot dong. Them mot phu thuoc middleware cho viec do la khong
 * can thiet, va moi phu thuoc deu la mot thu phai theo doi lo hong.
 */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}
