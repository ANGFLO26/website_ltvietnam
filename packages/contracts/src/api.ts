/**
 * BANG ENDPOINT API — nguon su that duy nhat, MAY DOC DUOC.
 *
 * `doc/06` liet ke endpoint bang van xuoi. Van xuoi khong kiem duoc, nen "da
 * xong API cong khai" la mot cau khong ai xac minh duoc — dung loai tuyen bo
 * toi da noi sai nhieu lan trong du an nay (bao "xong tang DAO" khi con ba bang
 * chua ai cham; bao "gioi han toc do da co" khi no chua tung duoc cai dat).
 *
 * Voi bang nay cong `Luat 16`, tien do la mot con so doc ra tu ma nguon:
 *
 *   - moi endpoint `status: 'done'` PHAI co controller that
 *   - moi controller that PHAI co trong bang, va PHAI dang `done`
 *
 * Chieu thu hai quan trong khong kem chieu thu nhat. No chan hai viec: viet mot
 * endpoint ma khong khai bao (frontend khong biet no ton tai), va viet xong ma
 * quen doi `todo` -> `done` (bang noi doi theo huong nguoc lai).
 *
 * `phase` khong phai trang tri: no la loi hua co dia chi. Mot endpoint khong
 * thuoc phase nao la mot endpoint khong ai chiu trach nhiem.
 */

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/**
 * `data` cua `GET /resolve` — DUNG CHUNG giua backend va frontend.
 *
 * Dat o `@ltv/contracts` chu khong o `backend/src/api/dto` la co y, va day la
 * lan dau du an dung loi the do (doc/12 muc 2.2): frontend import CUNG mot
 * kieu, nen doi hinh dang phan hoi lam frontend **do luc bien dich** thay vi
 * hong luc chay.
 *
 * Dieu do khong phai gia thiet. Middleware cua frontend truoc F0 goi
 * `/routes/resolve` (khong ton tai) va doc than PHANG (khong co `data`) — hai
 * cho lech nhau ma khong gi bao, va hau qua la MOI trang tra 503 qua nhanh
 * fail-safe. Voi mot kieu dung chung, `kind` la union hai nhanh: them nhanh
 * thu ba ma frontend khong xu ly la mot loi bien dich.
 *
 * CHI hai nhanh, va do la quyet dinh co y — `gone` (410) va `not_found` khong
 * co NGUON DU LIEU nao trong so do v1.3:
 *
 *   - `gone` can biet mot URL DA TUNG ton tai roi bi xoa vinh vien. Xoa mem chi
 *     dat `deleted_at`, va khong bang nao ghi "URL nay se khong tro lai".
 *   - `not_found` can biet mot slug khong ton tai o BAT KY bang nao — o duong
 *     nong thi do la mot truy van tren moi bang co slug, cho MOI yeu cau, de
 *     tra loi mot cau ma trang se tu tra loi khi no lay du lieu.
 *
 * Cai mat: khong phan biet 404 voi 410 cho URL cu. Muon 410 that thi phai co
 * mot nguon du lieu tuong minh (cot `gone_at`, hoac mot bang rieng) — viec cua
 * F6, khong phai mot dong `if`.
 */
export type ResolveResponse =
  | { readonly kind: 'redirect'; readonly status: 301 | 302; readonly target: string }
  | { readonly kind: 'content' };

/** Phase theo `doc/12`. `F-1` la phase va nen da lam truoc F0. */
export type ApiPhase = 'F-1' | 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8';

export interface ApiEndpointDef {
  readonly method: ApiMethod;
  /**
   * Duong dan SAU tien to `API_BASE_PATH` (`/api/v1`).
   *
   * Ngoai le duy nhat la hai endpoint health: `main.ts` loai chung khoi tien to
   * vi nguoi tieu thu la trinh dieu phoi, khong phai frontend. Chung duoc danh
   * dau `outsideBasePath`.
   */
  readonly path: string;
  readonly area: 'public' | 'admin' | 'ops';
  /** Can phien dang nhap khong. `false` = `@Public()`. */
  readonly auth: boolean;
  readonly phase: ApiPhase;
  readonly status: 'done' | 'todo';
  readonly outsideBasePath?: true;
  /** Ghi chu ngan khi hanh vi khong hien nhien tu duong dan. */
  readonly note?: string;
}

export const API_ENDPOINTS = [
  // ══════════════ ops — ngoai /api/v1 ══════════════
  { method: 'GET', path: '/health/live', area: 'ops', auth: false, phase: 'F-1', status: 'done',
    outsideBasePath: true, note: 'liveness; khong kiem phu thuoc, khong lo gi' },
  { method: 'GET', path: '/health/ready', area: 'ops', auth: false, phase: 'F-1', status: 'done',
    outsideBasePath: true, note: 'readiness; 503 khi DB khong len' },

  /**
   * Giai duong dan cho middleware Next.js — noi bo, nhung PHAI `@Public()`
   * vi middleware chay truoc khi co phien nao. Tren that nen chan o tang mang.
   */
  { method: 'GET', path: '/resolve', area: 'ops', auth: false, phase: 'F0', status: 'done',
    note: 'DUONG NONG: mot truy van co chi muc cho MOI yeu cau cua trang' },

  // ══════════════ auth ══════════════
  { method: 'POST', path: '/auth/login', area: 'admin', auth: false, phase: 'F-1', status: 'done' },
  { method: 'POST', path: '/auth/logout', area: 'admin', auth: false, phase: 'F-1', status: 'done' },
  { method: 'GET', path: '/auth/me', area: 'admin', auth: true, phase: 'F-1', status: 'done' },
  { method: 'POST', path: '/auth/change-password', area: 'admin', auth: true, phase: 'F-1', status: 'done' },
  { method: 'POST', path: '/auth/forgot-password', area: 'admin', auth: false, phase: 'F-1', status: 'done' },
  { method: 'POST', path: '/auth/reset-password', area: 'admin', auth: false, phase: 'F-1', status: 'done' },
  { method: 'POST', path: '/auth/bootstrap', area: 'admin', auth: false, phase: 'F-1', status: 'done',
    note: 'chi chay khi bang users RONG — xem doc/13 muc 15' },

  // ══════════════ F1 — taxonomy ══════════════
  { method: 'GET', path: '/brands', area: 'public', auth: false, phase: 'F1', status: 'done',
    note: '?type=&featured=&parent={slug}' },
  { method: 'GET', path: '/brands/:slug', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/brands/:slug/children', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/product-categories', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/product-categories/tree', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/product-categories/:slug', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/product-categories/:slug/products', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/standards', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/standards/:slug', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/standards/:slug/products', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/applications', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/applications/tree', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/applications/:slug', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/applications/:slug/products', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/industries', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/industries/:slug', area: 'public', auth: false, phase: 'F1', status: 'done' },
  { method: 'GET', path: '/industries/:slug/products', area: 'public', auth: false, phase: 'F1', status: 'done' },

  // ══════════════ F2 — san pham ══════════════
  { method: 'GET', path: '/products/landing', area: 'public', auth: false, phase: 'F2', status: 'todo',
    note: 'PHAI khai bao TRUOC /products/:slug — xem Luat 16' },
  { method: 'GET', path: '/products', area: 'public', auth: false, phase: 'F2', status: 'todo',
    note: 'bo loc ADR-007: cung dimension OR, khac dimension AND' },
  { method: 'GET', path: '/products/:slug', area: 'public', auth: false, phase: 'F2', status: 'todo',
    note: 'discontinued VAN tra, kem co + hang thay the (ADR-011)' },

  // ══════════════ F3 — noi dung co ban dich ══════════════
  { method: 'GET', path: '/pages/:slug', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/services', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/services/tree', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/services/:slug', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/projects', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/projects/:slug', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/posts', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/posts/:slug', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/post-categories', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/post-categories/:slug/posts', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/documents', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  { method: 'GET', path: '/documents/:slug', area: 'public', auth: false, phase: 'F3', status: 'todo' },
  /**
   * DOI TU F1 SANG F3 — mot dinh chinh pham vi, khong phai mot cho tranh.
   *
   * Endpoint nay tra ve DICH VU, va dich vu la nhom co ban dich: doc cong khai
   * can locale + chi tra translation da publish (ADR-004). Toan bo duong do la
   * viec cua F3. Xep no o F1 nghia la F1 phai dung mot nua duong dich, roi F3
   * viet lai — hoac te hon, F1 tra ve dich vu chua qua luat locale.
   */
  { method: 'GET', path: '/industries/:slug/services', area: 'public', auth: false, phase: 'F3', status: 'todo',
    note: 'can duong doc co ban dich cua F3; ServiceDao chua co truy van theo nganh' },

  // ══════════════ F4 — khung site ══════════════
  { method: 'GET', path: '/home', area: 'public', auth: false, phase: 'F4', status: 'todo',
    note: 'CHI trang chu; khong dung cho /products' },
  { method: 'GET', path: '/navigation/:location', area: 'public', auth: false, phase: 'F4', status: 'todo',
    note: 'header | mobile | footer; mega menu tu sinh' },
  { method: 'GET', path: '/customers', area: 'public', auth: false, phase: 'F4', status: 'todo' },
  { method: 'GET', path: '/offices', area: 'public', auth: false, phase: 'F4', status: 'todo' },
  { method: 'GET', path: '/search', area: 'public', auth: false, phase: 'F4', status: 'todo',
    note: 'MVP: san pham, pg_trgm' },

  // ══════════════ F5 — yeu cau bao gia ══════════════
  { method: 'POST', path: '/inquiries', area: 'public', auth: false, phase: 'F5', status: 'todo',
    note: 'khong dang nhap; idempotency-key; 202' },
  { method: 'GET', path: '/admin/inquiries', area: 'admin', auth: true, phase: 'F5', status: 'todo' },
  { method: 'GET', path: '/admin/inquiries/:id', area: 'admin', auth: true, phase: 'F5', status: 'todo' },
  { method: 'PATCH', path: '/admin/inquiries/:id/handled', area: 'admin', auth: true, phase: 'F5', status: 'todo' },

  // ══════════════ F6 — SEO ══════════════
  { method: 'GET', path: '/sitemap.xml', area: 'public', auth: false, phase: 'F6', status: 'todo',
    outsideBasePath: true },
  { method: 'GET', path: '/sitemap-:locale.xml', area: 'public', auth: false, phase: 'F6', status: 'todo',
    outsideBasePath: true },
  { method: 'GET', path: '/robots.txt', area: 'public', auth: false, phase: 'F6', status: 'todo',
    outsideBasePath: true },

  // ══════════════ F7 — media ══════════════
  { method: 'GET', path: '/documents/:slug/download', area: 'public', auth: false, phase: 'F7', status: 'todo',
    note: 'tra TEP — khong bi boc vo {data}' },
] as const satisfies readonly ApiEndpointDef[];

export type ApiEndpointKey = `${ApiMethod} ${string}`;

/** `GET /brands/:slug` — dinh dang dung chung voi Luat 16 va `smoke-api.mjs`. */
export const endpointKey = (e: ApiEndpointDef): ApiEndpointKey => `${e.method} ${e.path}`;

/** Tien do doc ra tu bang — dung trong bao cao, khong phai loi noi. */
export function apiProgress(): {
  readonly done: number;
  readonly total: number;
  readonly byPhase: Record<string, { done: number; total: number }>;
} {
  const byPhase: Record<string, { done: number; total: number }> = {};
  for (const e of API_ENDPOINTS) {
    const o = (byPhase[e.phase] ??= { done: 0, total: 0 });
    o.total += 1;
    if (e.status === 'done') o.done += 1;
  }
  return {
    done: API_ENDPOINTS.filter((e) => e.status === 'done').length,
    total: API_ENDPOINTS.length,
    byPhase,
  };
}
