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
  locale: Locale = 'en',
): SitemapSource => ({
  kind,
  locale,
  slug,
  pageType: null,
  updatedAt: at,
  hasEditorialContent: editorial,
});

describe('SEO metadata ADR-011', () => {
  it('route co ban dich dung prefix /vi va URL tuyet doi', () => {
    expect(translatedPath('post', 'en', 'tin-moi')).toBe('/news/tin-moi');
    expect(translatedPath('post', 'vi', 'tin-moi-vi')).toBe('/vi/news/tin-moi-vi');
    expect(translatedPath('page', 'vi', 'slug-khong-dung', 'privacy_policy')).toBe(
      '/vi/privacy-policy',
    );

    const seo = translatedDetailSeo('https://ltv.example/', 'service', 'vi', 'bao-tri', [
      { locale: 'en', slug: 'maintenance' },
      { locale: 'vi', slug: 'bao-tri' },
    ]);
    expect(seo.canonical).toBe('https://ltv.example/vi/services/bao-tri');
    expect(seo.hreflang_alternates.map((x) => x.url)).toEqual([
      'https://ltv.example/services/maintenance',
      'https://ltv.example/vi/services/bao-tri',
    ]);
  });
});

describe('sitemap F6', () => {
  it('chi dua landing co noi dung, loai filter va URL redirect', async () => {
    const seo = service(
      {
        en: [
          source('product_category', 'co-noi-dung', true),
          source('product_category', 'mong', false),
          source('product', 'song'),
          source('product', 'da-doi-slug'),
        ],
      },
      ['/products/da-doi-slug'],
    );
    const xml = await seo.sitemap('en');

    expect(xml).toContain('<loc>https://ltv.example/products/category/co-noi-dung</loc>');
    expect(xml).not.toContain('/products/category/mong');
    expect(xml).toContain('<loc>https://ltv.example/products/song</loc>');
    expect(xml).not.toContain('/products/da-doi-slug');
    expect(xml).not.toContain('?brand=');
    expect(xml).not.toContain('<loc>https://ltv.example/contact</loc>');
    expect(xml).toContain(`<lastmod>${at.toISOString()}</lastmod>`);
  });

  it('sitemap locale khong tron URL mot-ngon-ngu vao ban vi', async () => {
    const seo = service({
      vi: [source('post', 'tin-viet', true, 'vi')],
    });
    const xml = await seo.sitemap('vi');
    expect(xml).toContain('/vi/news/tin-viet');
    expect(xml).not.toContain('/products/');
    expect(xml).not.toContain('/brands/');
    expect(xml).not.toContain('/resources/');
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
