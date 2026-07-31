import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROUTES, buildReservedPaths, isReservedPath, localizedPath } from './routes.js';

const DOC = resolve(import.meta.dirname, '../../../doc/02_SITEMAP_VA_CAU_TRUC_DIEU_HUONG.md');

describe('bang route', () => {
  it('khong co key trung', () => {
    const keys = ROUTES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('moi path bat dau bang /', () => {
    for (const r of ROUTES) expect(r.path.startsWith('/')).toBe(true);
  });

  /**
   * ADR-002 muc 8: tap bao luu phai sinh tu bang route, va phai co test
   * doi chieu — fail khi tai lieu va code lech nhau.
   */
  it('moi URL trong doc/02 deu co trong bang route', () => {
    const md = readFileSync(DOC, 'utf8');
    const section = md.slice(md.indexOf('## 2. Bảng URL công khai'), md.indexOf('### 2b.'));
    const documented = new Set<string>();
    for (const line of section.split('\n')) {
      if (!line.startsWith('|')) continue;
      const cells = line.split('|').map((c) => c.trim());
      const url = cells[2] ?? '';
      const m = /^`(\/[^`?]*)`/.exec(url);
      if (m?.[1]) documented.add(m[1].replace(/\{[^}]+\}/g, ':slug'));
    }
    const known = new Set<string>(ROUTES.map((r) => r.path));
    const missing = [...documented].filter((d) => !known.has(d));
    expect(
      missing,
      `URL co trong doc/02 nhung thieu trong bang route: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});

describe('tap route bao luu', () => {
  const reserved = buildReservedPaths();

  it('bao luu doan cap 1 cua moi route', () => {
    for (const p of [
      '/about',
      '/products',
      '/brands',
      '/services',
      '/projects',
      '/news',
      '/resources',
      '/contact',
      '/search',
    ])
      expect(isReservedPath(p, reserved), `${p} phai duoc bao luu`).toBe(true);
  });

  it('bao luu doan cap 2', () => {
    for (const p of [
      '/products/all',
      '/products/category',
      '/products/standard',
      '/products/application',
      '/news/category',
    ])
      expect(isReservedPath(p, reserved), `${p} phai duoc bao luu`).toBe(true);
  });

  it('bao luu ca bien the /vi cua nhom co ban dich', () => {
    for (const p of ['/vi/news', '/vi/services', '/vi/projects', '/vi/about', '/vi/contact'])
      expect(isReservedPath(p, reserved), `${p} phai duoc bao luu`).toBe(true);
  });

  it('bao luu tien to ky thuat', () => {
    for (const p of ['/api', '/admin', '/media', '/health', '/_next', '/static'])
      expect(isReservedPath(p, reserved)).toBe(true);
  });

  /** Day chinh la lo hong cua v1.2.1: slug ten 'products' de len trang landing. */
  it('chan slug trung ten route — loi cua v1.2.1', () => {
    expect(isReservedPath('/products', reserved)).toBe(true);
    expect(isReservedPath('/brands', reserved)).toBe(true);
    expect(isReservedPath('/vi/news', reserved)).toBe(true);
  });

  it('KHONG bao luu slug binh thuong', () => {
    for (const p of ['/optidist-atmospheric-distillation', '/herzog', '/lt-vietnam-expo-2026'])
      expect(isReservedPath(p, reserved)).toBe(false);
  });
});

describe('localizedPath', () => {
  it('tieng Anh khong co tien to', () => {
    expect(localizedPath('/news/abc', 'en')).toBe('/news/abc');
    expect(localizedPath('/', 'en')).toBe('/');
  });
  it('tieng Viet co tien to /vi', () => {
    expect(localizedPath('/news/abc', 'vi')).toBe('/vi/news/abc');
    expect(localizedPath('/', 'vi')).toBe('/vi');
  });
});
