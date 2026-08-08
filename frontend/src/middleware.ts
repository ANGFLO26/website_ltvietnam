import { NextResponse, type NextRequest } from 'next/server';
import type { ResolveResponse } from '@ltv/contracts';

/**
 * Giao redirect theo D11/D17. DA DUOC CHUNG MINH bang spike P0.
 *
 * Bang chung: implementation/evidence/p0-spike-301/
 * Do that tren Next.js 15.5.22 production build:
 *   redirect()          -> 307 kem 5.858 byte HTML da render   KHONG THOA
 *   permanentRedirect() -> 308 kem 5.861 byte HTML da render   KHONG THOA
 *   middleware nay      -> 301, body 18 byte, khong HTML       THOA
 *
 * KHONG thay bang helper cua App Router. Ma tran 15 case: 15/15 PASS.
 *
 * Chay TRUOC moi viec render va streaming. Goi resolver cua Nest, roi phat
 * dung ma trang thai ma Nest tra ve.
 *
 * KHONG dung redirect() hay permanentRedirect() cua App Router: chung phat
 * 307 va 308, khong thoa D17 (plan 12 muc 5).
 */
const RESOLVER = process.env.INTERNAL_API_URL ?? 'http://127.0.0.1:3001/api/v1';
const CEILING_MS = Number(process.env.RESOLVER_CEILING_MS ?? 350);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap).*)'],
};

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname;
  const started = Date.now();

  let rule: ResolveResponse;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CEILING_MS);
    /**
     * `/resolve`, va doc `data` — HAI cho nay truoc F0 deu SAI.
     *
     * Ban truoc goi `/routes/resolve` (endpoint khong ton tai) va doc than
     * PHANG (`rule = await res.json()`, khong co `data`). Ca hai lech ma khong
     * gi bao, va hau qua khong phai mot trang loi: nhanh fail-safe bien MOI
     * trang thanh 503.
     *
     * Do la ly do `ResolveResponse` nam trong `@ltv/contracts` (doc/12 muc 2.2)
     * chu khong o `backend/src/api/dto`: hai dau import CUNG mot kieu, nen lech
     * hinh dang la loi BIEN DICH thay vi mot su co luc chay.
     */
    const res = await fetch(`${RESOLVER}/resolve?path=${encodeURIComponent(path)}`, {
      signal: ctrl.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`resolver ${res.status}`);
    const body = (await res.json()) as { data?: ResolveResponse };
    if (!body.data) throw new Error('resolver: thieu `data` trong vo phan hoi');
    rule = body.data;
  } catch {
    // Fail-safe (plan 12 muc 6): tra 503, KHONG render noi dung doan,
    // KHONG phuc vu ban cache 200 khi route co the da doi thanh redirect.
    return new NextResponse(null, {
      status: 503,
      headers: {
        'cache-control': 'no-store',
        'x-resolver': 'unavailable',
        'x-resolver-ms': String(Date.now() - started),
      },
    });
  }

  const elapsed = String(Date.now() - started);

  if (rule.kind === 'redirect') {
    // NextResponse.redirect cho phep chi dinh CHINH XAC ma trang thai.
    const res = NextResponse.redirect(new URL(rule.target, req.url), rule.status);
    res.headers.set('x-resolver', 'redirect');
    res.headers.set('x-resolver-ms', elapsed);
    res.headers.set('cache-control', 'no-store');
    return res;
  }

  /**
   * KHONG con nhanh `gone` (410) va `not_found` (404).
   *
   * Spike gia lap bon nhanh, nhung resolver that chi tra ve HAI: `gone` va
   * `not_found` khong co nguon du lieu nao trong so do v1.3 (xem chu thich cua
   * `ResolveResponse`). Giu hai nhanh khong bao gio chay lai lam nguoi doc tin
   * rang 410 da duoc xu ly — cung loai "ban do sai" voi bang tra cuu
   * `MA_THEO_TYPE` cua backend, ma bon phan nam dong khong bao gio chay.
   *
   * Neu F6 them nhanh thu ba vao `ResolveResponse` thi TypeScript se bao loi o
   * day, vi `rule` luc do khong con hep ve `{ kind: 'content' }`. Do la ca ly do
   * kieu nay nam trong `@ltv/contracts`.
   */
  const res = NextResponse.next();
  res.headers.set('x-resolver', 'content');
  res.headers.set('x-resolver-ms', elapsed);
  return res;
}
