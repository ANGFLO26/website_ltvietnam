import { NextResponse, type NextRequest } from 'next/server';

const publicRoutes = new Set(['/login', '/setup', '/forgot-password', '/reset-password']);
const sessionCookie = process.env.COOKIE_NAME?.trim() || 'ltv_session';

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-ltv-admin-path', `${pathname}${request.nextUrl.search}`);

  if (!publicRoutes.has(pathname) && !request.cookies.has(sessionCookie)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|media/(?:originals|variants|public)).*)',
  ],
};
