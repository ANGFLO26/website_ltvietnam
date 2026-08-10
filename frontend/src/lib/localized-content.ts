import type { HreflangAlternateView, Locale } from '@ltv/contracts';
import { routePath, type RouteKey } from './routes';

export function localeFromPath(path: string): Locale {
  return path === '/vi' || path.startsWith('/vi/') ? 'vi' : 'en';
}

export function localizedRouteAlternates(
  key: RouteKey,
  params?: Readonly<Record<string, string | number>>,
): readonly HreflangAlternateView[] {
  return (['en', 'vi'] as const).map((locale) => ({
    locale,
    slug: params?.slug === undefined ? '' : String(params.slug),
    url: routePath(key, { locale, ...(params === undefined ? {} : { params }) }),
  }));
}

export function detailLanguageFallbacks(
  listKey: RouteKey,
  locale: Locale,
): Readonly<Partial<Record<Locale, string>>> {
  const other: Locale = locale === 'en' ? 'vi' : 'en';
  return { [other]: routePath(listKey, { locale: other }) };
}

export function pageNumber(value: string | readonly string[] | undefined): number {
  const raw = typeof value === 'string' ? value : value?.[0];
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function paginationHref(key: RouteKey, locale: Locale, page: number): string {
  return routePath(key, { locale, ...(page <= 1 ? {} : { query: { page } }) });
}

export function detailPaginationHref(
  key: RouteKey,
  locale: Locale,
  slug: string,
  page: number,
): string {
  return routePath(key, {
    locale,
    params: { slug },
    ...(page <= 1 ? {} : { query: { page } }),
  });
}

export function documentDownloadPath(slug: string): string {
  return `/api/v1/documents/${encodeURIComponent(slug)}/download`;
}
