import { describe, expect, it } from 'vitest';
import { ROUTES } from '@ltv/contracts';
import { routePath, type RouteKey } from '@/lib/routes';

describe('routePath', () => {
  it('builds every route from the contract', () => {
    for (const route of ROUTES) {
      const path = routePath(route.key, {
        params: route.path.includes(':slug') ? { slug: 'example slug' } : {},
      });
      expect(path.startsWith('/')).toBe(true);
      expect(path).not.toContain(':slug');
      expect(path).not.toContain(' ');
    }
  });

  it('builds repeated query keys, tieng Viet o goc va tieng Anh o /en', () => {
    const query = { brand: ['pac', 'herzog'] };
    expect(routePath('news.detail', { locale: 'vi', params: { slug: 'tin-moi' }, query })).toBe(
      '/news/tin-moi?brand=pac&brand=herzog',
    );
    expect(routePath('news.detail', { locale: 'en', params: { slug: 'latest' }, query })).toBe(
      '/en/news/latest?brand=pac&brand=herzog',
    );
  });

  it('rejects unsupported locales and missing parameters', () => {
    // Catalogue chi co tieng Viet — xin ban tieng Anh phai la loi, khong phai
    // mot URL `/en/products` tra 404 luc chay.
    expect(() => routePath('products.landing', { locale: 'en' })).toThrow();
    expect(() => routePath('products.detail', { locale: 'en', params: { slug: 'x' } })).toThrow();
    expect(() => routePath('products.detail')).toThrow();
  });

  it('keeps route keys statically typed', () => {
    const key: RouteKey = 'home';
    expect(routePath(key)).toBe('/');
  });
});
