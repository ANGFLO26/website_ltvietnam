import { NextResponse, type NextRequest } from 'next/server';

/**
 * Giao redirect theo D11/D17.
 *
 * Chay TRUOC moi viec render va streaming. Goi resolver cua Nest, roi phat
 * dung ma trang thai ma Nest tra ve.
 *
 * KHONG dung redirect() hay permanentRedirect() cua App Router: chung phat
 * 307 va 308, khong thoa D17 (plan 12 muc 5).
 */
const RESOLVER = process.env.RESOLVER_URL ?? 'http://127.0.0.1:4001';
const CEILING_MS = Number(process.env.RESOLVER_CEILING_MS ?? 350);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|helper).*)'],
};

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname;
  const started = Date.now();

  let rule: { kind: string; status?: number; target?: string };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CEILING_MS);
    const res = await fetch(`${RESOLVER}/resolve?path=${encodeURIComponent(path)}`, {
      signal: ctrl.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`resolver ${res.status}`);
    rule = await res.json();
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

  if (rule.kind === 'redirect' && rule.target) {
    // NextResponse.redirect cho phep chi dinh CHINH XAC ma trang thai.
    const res = NextResponse.redirect(new URL(rule.target, req.url), rule.status ?? 301);
    res.headers.set('x-resolver', 'redirect');
    res.headers.set('x-resolver-ms', elapsed);
    res.headers.set('cache-control', 'no-store');
    return res;
  }
  if (rule.kind === 'gone') {
    return new NextResponse(null, { status: 410, headers: { 'x-resolver': 'gone' } });
  }
  if (rule.kind === 'not_found') {
    return new NextResponse(null, { status: 404, headers: { 'x-resolver': 'not_found' } });
  }

  const res = NextResponse.next();
  res.headers.set('x-resolver', 'content');
  res.headers.set('x-resolver-ms', elapsed);
  return res;
}
