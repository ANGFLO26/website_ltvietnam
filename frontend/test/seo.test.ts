import { describe, expect, it } from 'vitest';
import { ROUTES } from '@ltv/contracts';
import { buildMetadata } from '@/lib/seo';

describe('buildMetadata', () => {
  it('builds canonical and robots metadata for all 26 routes', () => {
    for (const route of ROUTES) {
      const metadata = buildMetadata(route.key, {
        title: route.key,
        params: route.path.includes(':slug') ? { slug: 'example' } : {},
        ...(route.robots === 'conditional' ? { indexable: true } : {}),
      });
      expect(metadata.alternates?.canonical).toBeTruthy();
      expect(metadata.robots).toMatchObject({
        index: route.robots !== 'noindex',
        follow: true,
      });
    }
  });

  it('canonicalizes a thin taxonomy landing to products/all', () => {
    const metadata = buildMetadata('products.category', {
      title: 'Empty category',
      params: { slug: 'empty' },
      indexable: false,
    });
    expect(metadata.alternates?.canonical).toBe('http://localhost:3000/products/all');
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it('noindexes a filtered catalogue and keeps the clean canonical', () => {
    const metadata = buildMetadata('products.all', {
      title: 'Filtered products',
      indexable: false,
      canonical: '/products/all',
    });
    expect(metadata.alternates?.canonical).toBe('http://localhost:3000/products/all');
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
  });

  it('emits hreflang only for published alternates supplied by the API', () => {
    const withoutAlternates = buildMetadata('news.detail', {
      title: 'News',
      params: { slug: 'news' },
    });
    expect(withoutAlternates.alternates?.languages).toBeUndefined();

    const withAlternates = buildMetadata('news.detail', {
      title: 'News',
      params: { slug: 'news' },
      hreflangAlternates: [
        { locale: 'en', slug: 'news', url: 'https://example.com/news/news' },
        { locale: 'vi', slug: 'tin', url: 'https://example.com/vi/news/tin' },
      ],
    });
    expect(withAlternates.alternates?.languages).toEqual({
      en: 'https://example.com/news/news',
      vi: 'https://example.com/vi/news/tin',
    });
  });
});
