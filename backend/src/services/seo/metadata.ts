import type { HreflangAlternateView, Locale, RobotsDirective, SeoDetailView } from '@ltv/contracts';

export type TranslatedRouteKind = 'page' | 'service' | 'project' | 'post';

/** Bo slash cuoi de moi URL chi co mot cach noi voi path. */
export function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, '');
}

/** URL tuyet doi, da ma hoa tung doan duong dan dong. */
export function absoluteUrl(siteUrl: string, path: string): string {
  const origin = normalizeSiteUrl(siteUrl);
  return `${origin}${path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}`}`;
}

const segment = (value: string): string => encodeURIComponent(value);
const prefix = (locale: Locale): string => (locale === 'vi' ? '/vi' : '');

/** Route frontend chinh thuc cua bon nhom co ban dich (ADR-001/014). */
export function translatedPath(
  kind: TranslatedRouteKind,
  locale: Locale,
  slug: string,
  pageType?: string,
): string {
  const p = prefix(locale);
  const s = segment(slug);

  if (kind === 'service') return `${p}/services/${s}`;
  if (kind === 'project') return `${p}/projects/${s}`;
  if (kind === 'post') return `${p}/news/${s}`;

  switch (pageType) {
    case 'about':
      return `${p}/about`;
    case 'contact':
      return `${p}/contact`;
    case 'privacy_policy':
      return `${p}/privacy-policy`;
    case 'terms_of_use':
      return `${p}/terms-of-use`;
    case 'cookie_policy':
      return `${p}/cookie-policy`;
    default:
      return `${p}/about/${s}`;
  }
}

export interface PublishedAlternate {
  readonly locale: Locale;
  readonly slug: string;
}

/**
 * Metadata cho mot trang chi tiet published.
 *
 * Alternates dau vao da duoc DAO gioi han boi quy tac "ca hai published".
 * Ham nay chi gan route va origin; khong tu bo sung locale con thieu.
 */
export function translatedDetailSeo(
  siteUrl: string,
  kind: TranslatedRouteKind,
  locale: Locale,
  slug: string,
  alternates: readonly PublishedAlternate[],
  pageType?: string,
): SeoDetailView {
  return {
    canonical: absoluteUrl(siteUrl, translatedPath(kind, locale, slug, pageType)),
    robots: 'index,follow',
    hreflang_alternates: alternates.map((x): HreflangAlternateView => ({
      locale: x.locale,
      slug: x.slug,
      url: absoluteUrl(siteUrl, translatedPath(kind, x.locale, x.slug, pageType)),
    })),
  };
}

/** Metadata cho entity mot ngon ngu. */
export function detailSeo(
  siteUrl: string,
  canonicalPath: string,
  robots: RobotsDirective = 'index,follow',
): SeoDetailView {
  return {
    canonical: absoluteUrl(siteUrl, canonicalPath),
    robots,
    hreflang_alternates: [],
  };
}

/** Khoi da qua mapper; mang rong nghia la khong co noi dung bien tap hop le. */
export function hasEditorialBlocks(blocks: readonly unknown[]): boolean {
  return blocks.length > 0;
}

export function hasEditorialText(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}
