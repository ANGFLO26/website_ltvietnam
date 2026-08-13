import { DEFAULT_LOCALE, localePrefix, localizedPath, ROUTES, type Locale } from '@ltv/contracts';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { SitemapSource } from '../../dao/seo/object.js';
import { absoluteUrl, normalizeSiteUrl, translatedPath } from './metadata.js';
import type { SeoService } from './interface.js';

export type SeoDaos = DaoScope<'seo' | 'settings'>;

const MAX_URLS_PER_SITEMAP = 50_000;

interface SitemapUrl {
  readonly path: string;
  readonly updatedAt: Date | null;
}

/**
 * F6 — mot nguon duy nhat sinh sitemap/robots.
 *
 * Khong cache o day: F8 chua co co che invalidation lien tien trinh. Tra du lieu
 * moi sau khi publish quan trong hon tiet kiem mot truy van UNION tren tap P0.
 */
export class SeoServiceImpl implements SeoService {
  private readonly siteUrl: string;

  constructor(
    private readonly daos: SeoDaos,
    siteUrl: string,
  ) {
    this.siteUrl = normalizeSiteUrl(siteUrl);
  }

  sitemapIndex(): string {
    return xml([
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...(['en', 'vi'] as const).map(
        (locale) =>
          `  <sitemap><loc>${escapeXml(absoluteUrl(this.siteUrl, `/sitemap-${locale}.xml`))}</loc></sitemap>`,
      ),
      '</sitemapindex>',
    ]);
  }

  async sitemap(locale: Locale): Promise<string> {
    const [sources, redirectSources] = await Promise.all([
      this.daos.seo.listSitemapSources(locale),
      this.daos.seo.listActiveRedirectSources(),
    ]);

    /** Redirect tra cuu khong phan biet hoa thuong (migration 034), sitemap cung vay. */
    const redirected = new Set(redirectSources.map((x) => normalizePath(x).toLowerCase()));
    const byPath = new Map<string, SitemapUrl>();

    for (const item of staticUrls(locale)) byPath.set(item.path, item);
    for (const source of sources) {
      const item = sourceToUrl(source);
      if (!item) continue;
      const path = normalizePath(item.path);
      if (redirected.has(path.toLowerCase())) continue;
      const old = byPath.get(path);
      if (!old || newer(item.updatedAt, old.updatedAt)) byPath.set(path, { ...item, path });
    }

    /** Static route cung phai bi loai neu vo tinh tro vao redirect. */
    const urls = [...byPath.values()]
      .filter((x) => !redirected.has(x.path.toLowerCase()))
      .sort((a, b) => a.path.localeCompare(b.path));

    if (urls.length > MAX_URLS_PER_SITEMAP) {
      throw new Error(
        `Sitemap ${locale} co ${urls.length} URL, vuot tran ${MAX_URLS_PER_SITEMAP}; can chia nho`,
      );
    }

    return xml([
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((u) => {
        const loc = escapeXml(absoluteUrl(this.siteUrl, u.path));
        const lastmod = u.updatedAt ? `<lastmod>${u.updatedAt.toISOString()}</lastmod>` : '';
        return `  <url><loc>${loc}</loc>${lastmod}</url>`;
      }),
      '</urlset>',
    ]);
  }

  async robots(): Promise<string> {
    const setting = await this.daos.settings.findOne('seo', 'site_indexable');
    const indexable = setting?.value?.trim().toLowerCase() !== 'false';

    if (!indexable) return 'User-agent: *\nDisallow: /\n';

    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /admin/',
      'Disallow: /health/',
      `Sitemap: ${absoluteUrl(this.siteUrl, '/sitemap.xml')}`,
      '',
    ].join('\n');
  }
}

function sourceToUrl(source: SitemapSource): SitemapUrl | null {
  const { kind, locale, slug, updatedAt } = source;

  if (kind === 'page') {
    return { path: translatedPath('page', locale, slug, source.pageType ?? undefined), updatedAt };
  }
  if (kind === 'service') return { path: translatedPath('service', locale, slug), updatedAt };
  if (kind === 'project') return { path: translatedPath('project', locale, slug), updatedAt };
  if (kind === 'post') return { path: translatedPath('post', locale, slug), updatedAt };
  if (kind === 'product') return { path: `/products/${encodeURIComponent(slug)}`, updatedAt };
  if (kind === 'brand') return { path: `/brands/${encodeURIComponent(slug)}`, updatedAt };
  if (kind === 'document') return { path: `/resources/${encodeURIComponent(slug)}`, updatedAt };
  if (kind === 'post_category') {
    return {
      path: `${localePrefix(locale)}/news/category/${encodeURIComponent(slug)}`,
      updatedAt,
    };
  }

  /** ADR-011 §2b: landing mong khong vao sitemap. */
  if (!source.hasEditorialContent) return null;
  if (kind === 'product_category') {
    return { path: `/products/category/${encodeURIComponent(slug)}`, updatedAt };
  }
  if (kind === 'standard') {
    return { path: `/products/standard/${encodeURIComponent(slug)}`, updatedAt };
  }
  if (kind === 'application') {
    return { path: `/products/application/${encodeURIComponent(slug)}`, updatedAt };
  }
  return null;
}

/**
 * Route tinh cua mot ngon ngu — SINH TU BANG ROUTE, khong viet tay.
 *
 * Ban truoc liet ke tay hai mang, va hai mang do da lech that: `/resources` co
 * trong mang tieng Anh nhung `/about` va `/contact` thi khong, nen hai trang do
 * chua bao gio vao sitemap. Sinh tu `ROUTES` thi mot route moi tu dong duoc
 * tinh den, va khong the lech voi cai ma frontend that su phuc vu.
 *
 * Loai tru trang chi tiet (`:slug`) — chung den tu `listSitemapSources`, va
 * loai tru route `noindex` (`/search`, `/request-success`).
 */
function staticUrls(locale: Locale): SitemapUrl[] {
  return ROUTES.filter(
    (route) =>
      !route.path.includes(':') &&
      route.robots === 'index' &&
      (route.localized || locale === DEFAULT_LOCALE),
  ).map((route) => ({ path: localizedPath(route.path, locale), updatedAt: null }));
}

function xml(lines: readonly string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${lines.join('\n')}\n`;
}

/** Day la text node XML, khong phai HTML; ca nam ky tu deu phai thoat. */
export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizePath(path: string): string {
  const raw = path.startsWith('/') ? path : `/${path}`;
  return raw.length > 1 ? raw.replace(/\/+$/, '') : raw;
}

function newer(a: Date | null, b: Date | null): boolean {
  if (!a) return false;
  if (!b) return true;
  return a.getTime() > b.getTime();
}
