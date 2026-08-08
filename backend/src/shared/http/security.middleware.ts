import type { AppConfig } from '@ltv/config';
import type { NextFunction, Request, Response } from 'express';

/**
 * SECURITY HEADER — `doc/06` PHAN XI.
 *
 * Viet tay chu khong dung `helmet`, va day la mot lua chon co ly do:
 *
 * `helmet` dat khoang 12 header, phan lon danh cho ung dung tra ve HTML — CSP,
 * `X-DNS-Prefetch-Control`, `Origin-Agent-Cluster`. Backend nay tra JSON, va
 * mot header khong hieu vi sao co la mot header khong ai dam bo. Danh sach duoi
 * day ngan, va moi dong co mot cau tra loi cho "neu thieu thi sao".
 *
 * CSP KHONG dat o day. CSP bao ve TRANG, va trang la cua Next.js (frontend) —
 * dat CSP tren mot phan hoi JSON khong bao ve gi ca. No thuoc frontend.
 */
export function createSecurityHeaders(cfg: AppConfig) {
  return function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
    /**
     * Chan trinh duyet TU DOAN kieu noi dung.
     *
     * Thieu no thi mot phan hoi JSON chua chuoi do nguoi dung nhap co the bi
     * doan la HTML va thuc thi — duong XSS di qua mot endpoint API.
     */
    res.setHeader('X-Content-Type-Options', 'nosniff');

    /**
     * KHONG gui duong dan day du sang ten mien khac.
     *
     * URL cua API co the chua slug, id, tham so tim kiem. `strict-origin-...`
     * gui origin thay vi ca duong dan khi sang ten mien khac.
     */
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    /**
     * Khong cho nhung trong iframe.
     *
     * Voi JSON thi it y nghia, nhung `/documents/:slug/download` (F7) tra tep
     * that, va mot tep PDF nhung trong iframe cua trang khac la mot duong lua
     * nguoi dung.
     */
    res.setHeader('X-Frame-Options', 'DENY');

    /** Khong cho Flash/PDF plugin tu doc chinh sach cross-domain. */
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    /**
     * KHONG de trinh duyet luu phan hoi API vao cache dung chung.
     *
     * `/auth/me` tra ho so nguoi dung. Mot proxy trung gian cache no lai la
     * mot nguoi dung thay du lieu cua nguoi khac. Endpoint cong khai muon cache
     * thi tu dat lai `Cache-Control` cua rieng no (F6/F7).
     */
    res.setHeader('Cache-Control', 'no-store');

    /**
     * HSTS chi khi duoc bat TUONG MINH.
     *
     * `HSTS_MAX_AGE_SECONDS` mac dinh 0 = khong gui. Bat khi chua co chung chi
     * hop le se lam chinh minh khong truy cap duoc, va trinh duyet nho rat lau
     * nen khong the go nhanh.
     */
    if (cfg.HSTS_MAX_AGE_SECONDS > 0) {
      res.setHeader(
        'Strict-Transport-Security',
        `max-age=${cfg.HSTS_MAX_AGE_SECONDS}; includeSubDomains`,
      );
    }

    next();
  };
}
