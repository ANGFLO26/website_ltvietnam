import { describe, expect, it } from 'vitest';
import type { Locale } from '@ltv/contracts';
import type { SeoDaos } from './service.js';
import { escapeXml, SeoServiceImpl } from './service.js';
import { translatedDetailSeo, translatedPath } from './metadata.js';
import type { SitemapSource } from '../../dao/seo/object.js';

const at = new Date('2026-08-09T04:05:06.000Z');

function service(
  sources: Partial<Record<Locale, readonly SitemapSource[]>> = {},
  redirects: readonly string[] = [],
  indexable = true,
): SeoServiceImpl {
  const daos = {
    seo: {
      listSitemapSources: async (locale: Locale) => [...(sources[locale] ?? [])],
      listActiveRedirectSources: async () => [...redirects],
    },
    settings: {
      findOne: async () => ({ value: String(indexable) }),
    },
  } as unknown as SeoDaos;
  return new SeoServiceImpl(daos, 'https://ltv.example/');
}

const source = (
  kind: SitemapSource['kind'],
  slug: string,
  editorial = true,
  locale: Locale = 'vi',
): SitemapSource => ({
  kind,
  locale,
  slug,
  pageType: null,
  updatedAt: at,
  hasEditorialContent: editorial,
});

describe('SEO metadata ADR-011', () => {
  it('tieng Viet o goc, tieng Anh o /en, URL tuyet doi', () => {
    expect(translatedPath('post', 'vi', 'tin-moi')).toBe('/news/tin-moi');
    expect(translatedPath('post', 'en', 'latest-news')).toBe('/en/news/latest-news');
    expect(translatedPath('page', 'en', 'slug-khong-dung', 'privacy_policy')).toBe(
      '/en/privacy-policy',
    );

    const seo = translatedDetailSeo('https://ltv.example/', 'service', 'vi', 'bao-tri', [
      { locale: 'en', slug: 'maintenance' },
      { locale: 'vi', slug: 'bao-tri' },
    ]);
    expect(seo.canonical).toBe('https://ltv.example/services/bao-tri');
    expect(seo.hreflang_alternates.map((x) => x.url)).toEqual([
      'https://ltv.example/en/services/maintenance',
      'https://ltv.example/services/bao-tri',
    ]);
  });
});

describe('sitemap F6', () => {
  it('chi dua landing co noi dung, loai filter va URL redirect', async () => {
    const seo = service(
      {
        vi: [
          source('product_category', 'co-noi-dung', true),
          source('product_category', 'mong', false),
          source('product', 'song'),
          source('product', 'da-doi-slug'),
        ],
      },
      ['/products/da-doi-slug'],
    );
    const xml = await seo.sitemap('vi');

    expect(xml).toContain('<loc>https://ltv.example/products/category/co-noi-dung</loc>');
    expect(xml).not.toContain('/products/category/mong');
    expect(xml).toContain('<loc>https://ltv.example/products/song</loc>');
    expect(xml).not.toContain('/products/da-doi-slug');
    expect(xml).not.toContain('?brand=');
    expect(xml).toContain(`<lastmod>${at.toISOString()}</lastmod>`);
  });

  /**
   * `/about` va `/contact` PHAI co trong sitemap.
   *
   * Truoc day `staticUrls` la hai mang viet tay, va ca hai trang nay bi bo sot —
   * mot trang lien he khong duoc lap chi muc la mat mot duong khach tim den.
   * Nay danh sach sinh tu bang route nen khong the sot; phep kiem giu dieu do.
   */
  it('sinh du route tinh tu bang route, ke ca about va contact', async () => {
    const xml = await service().sitemap('vi');
    for (const path of ['/', '/products', '/products/all', '/brands', '/resources', '/about'])
      expect(xml, `${path} phai co trong sitemap`).toContain(
        `<loc>https://ltv.example${path}</loc>`,
      );
    expect(xml).toContain('<loc>https://ltv.example/contact</loc>');
  });

  it('sitemap tieng Anh KHONG chua catalogue — catalogue chi mot ngon ngu', async () => {
    const seo = service({ en: [source('post', 'latest-news', true, 'en')] });
    const xml = await seo.sitemap('en');
    expect(xml).toContain('/en/news/latest-news');
    expect(xml).toContain('<loc>https://ltv.example/en/services</loc>');
    expect(xml).not.toContain('/products');
    expect(xml).not.toContain('/brands');
    expect(xml).not.toContain('/resources');
  });

  it('route noindex khong vao sitemap', async () => {
    const xml = await service().sitemap('vi');
    expect(xml).not.toContain('/search');
    expect(xml).not.toContain('/request-success');
  });

  it('sitemap index tro toi dung hai locale', () => {
    const xml = service().sitemapIndex();
    expect(xml).toContain('https://ltv.example/sitemap-en.xml');
    expect(xml).toContain('https://ltv.example/sitemap-vi.xml');
  });

  it('thoat du nam ky tu XML', () => {
    expect(escapeXml(`a&<b>"'`)).toBe('a&amp;&lt;b&gt;&quot;&apos;');
  });
});

describe('robots F6', () => {
  it('site indexable cho crawl public nhung chan duong ky thuat', async () => {
    const body = await service({}, [], true).robots();
    expect(body).toContain('Allow: /');
    expect(body).toContain('Disallow: /api/');
    expect(body).toContain('Sitemap: https://ltv.example/sitemap.xml');
  });

  it('site_indexable=false chan toan bo', async () => {
    expect(await service({}, [], false).robots()).toBe('User-agent: *\nDisallow: /\n');
  });
});
