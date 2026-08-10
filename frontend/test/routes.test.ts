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

  it('builds repeated query keys and Vietnamese variants', () => {
    expect(
      routePath('news.detail', {
        locale: 'vi',
        params: { slug: 'tin-moi' },
        query: { brand: ['pac', 'herzog'] },
      }),
    ).toBe('/vi/news/tin-moi?brand=pac&brand=herzog');
  });

  it('rejects unsupported locales and missing parameters', () => {
    expect(() => routePath('products.landing', { locale: 'vi' })).toThrow();
    expect(() => routePath('products.detail')).toThrow();
  });

  it('keeps route keys statically typed', () => {
    const key: RouteKey = 'home';
    expect(routePath(key)).toBe('/');
  });
});
