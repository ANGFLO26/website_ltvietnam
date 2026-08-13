export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  try {
    const url = new URL(value, 'http://admin.local');
    if (url.origin !== 'http://admin.local' || url.pathname === '/login') return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
}

export function loginPathFor(pathname: string, search = ''): string {
  const next = safeNextPath(`${pathname}${search}`);
  return `/login?next=${encodeURIComponent(next)}`;
}
