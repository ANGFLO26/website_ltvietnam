import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  LOCALES,
  ROUTES,
  buildReservedPaths,
  isReservedPath,
  legacyLocaleRedirect,
  localeFromPath,
  localePrefix,
  localizedPath,
  routeProgress,
} from './routes.js';

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
   * Tap route CHI-TIENG-VIET phai dung bang catalogue, khong hon khong kem.
   *
   * Viet ra tung khoa chu khong dem so: mot con so chi bat duoc "co gi do doi",
   * con danh sach nay bat duoc DUNG cai gi doi. Neu ai do bo `localized` cua
   * `/contact` thi phep kiem chi ra dung `contact`, va nguoi doc thay ngay day
   * la mot trang cong ty bi tut xuong con mot ngon ngu — mot loi, chu khong
   * phai mot lua chon.
   */
  it('chi catalogue la mot ngon ngu; moi trang cong ty deu co ban tieng Anh', () => {
    expect(ROUTES).toHaveLength(26);
    const vietnameseOnly = ROUTES.filter((route) => !route.localized)
      .map((route) => route.key)
      .sort();
    expect(vietnameseOnly).toEqual([
      'brands.detail',
      'brands.list',
      'products.all',
      'products.application',
      'products.category',
      'products.detail',
      'products.landing',
      'products.standard',
      'resources.detail',
      'resources.list',
    ]);
    expect(ROUTES.every((route) => /^W[1-6]$/.test(route.phase))).toBe(true);
  });

  it('tien do duoc sinh tu status cua route', () => {
    expect(routeProgress()).toEqual({
      done: 26,
      total: 26,
      byPhase: {
        W1: { done: 1, total: 1 },
        W4: { done: 13, total: 13 },
        W2: { done: 5, total: 5 },
        W3: { done: 1, total: 1 },
        W5: { done: 2, total: 2 },
        W6: { done: 4, total: 4 },
      },
    });
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

  it('bao luu bien the /en cua nhom trang cong ty', () => {
    for (const p of ['/en/news', '/en/services', '/en/projects', '/en/about', '/en/contact'])
      expect(isReservedPath(p, reserved), `${p} phai duoc bao luu`).toBe(true);
  });

  /** Catalogue chi mot ngon ngu, nen `/en/products` khong phai route — va khong bi bao luu. */
  it('KHONG bao luu bien the /en cua catalogue', () => {
    for (const p of ['/en/products', '/en/products/all', '/en/brands', '/en/resources'])
      expect(isReservedPath(p, reserved), `${p} khong phai route`).toBe(false);
  });

  it('bao luu tien to ky thuat', () => {
    for (const p of ['/api', '/admin', '/media', '/health', '/_next', '/static'])
      expect(isReservedPath(p, reserved)).toBe(true);
  });

  /** Day chinh la lo hong cua v1.2.1: slug ten 'products' de len trang landing. */
  it('chan slug trung ten route — loi cua v1.2.1', () => {
    expect(isReservedPath('/products', reserved)).toBe(true);
    expect(isReservedPath('/brands', reserved)).toBe(true);
    expect(isReservedPath('/en/news', reserved)).toBe(true);
  });

  it('KHONG bao luu slug binh thuong', () => {
    for (const p of ['/optidist-atmospheric-distillation', '/herzog', '/lt-vietnam-expo-2026'])
      expect(isReservedPath(p, reserved)).toBe(false);
  });
});

describe('localizedPath', () => {
  it('tieng Viet o goc, khong tien to', () => {
    expect(localizedPath('/news/abc', 'vi')).toBe('/news/abc');
    expect(localizedPath('/', 'vi')).toBe('/');
  });
  it('tieng Anh co tien to /en', () => {
    expect(localizedPath('/news/abc', 'en')).toBe('/en/news/abc');
    expect(localizedPath('/', 'en')).toBe('/en');
  });
});

describe('localeFromPath', () => {
  it('la nghich dao cua localizedPath tren moi route va moi ngon ngu', () => {
    for (const route of ROUTES) {
      for (const locale of LOCALES) {
        const path = localizedPath(route.path.replace(/:[a-z_]+/g, 'vi-du'), locale);
        expect(localeFromPath(path), `${path} phai doc ra ${locale}`).toBe(locale);
      }
    }
  });

  it('khong nham slug bat dau bang ten ngon ngu', () => {
    expect(localeFromPath('/news/en-example')).toBe('vi');
    expect(localeFromPath('/entrust-analyzer')).toBe('vi');
  });
});

describe('legacyLocaleRedirect — cau truc /vi cu', () => {
  it('go tien to /vi cho moi duong dan, ke ca slug chua ton tai', () => {
    expect(legacyLocaleRedirect('/vi')).toBe('/');
    expect(legacyLocaleRedirect('/vi/')).toBe('/');
    expect(legacyLocaleRedirect('/vi/services')).toBe('/services');
    expect(legacyLocaleRedirect('/vi/news/bai-viet-bat-ky')).toBe('/news/bai-viet-bat-ky');
    expect(legacyLocaleRedirect('/vi/news/category/tin-cong-nghe')).toBe(
      '/news/category/tin-cong-nghe',
    );
  });

  it('KHONG dung vao duong dan chi tinh co bat dau bang chu vi', () => {
    expect(legacyLocaleRedirect('/vietnam-office')).toBeNull();
    expect(legacyLocaleRedirect('/products/viscometer')).toBeNull();
    expect(legacyLocaleRedirect('/')).toBeNull();
    expect(legacyLocaleRedirect('/services')).toBeNull();
  });

  /** Moi duong dan cu phai den mot route CO THAT, khong phai mot 404 khac. */
  it('dich cua moi route cu deu nam trong bang route', () => {
    const known = new Set<string>(ROUTES.map((route) => route.path));
    for (const route of ROUTES) {
      if (!route.localized) continue;
      const target = legacyLocaleRedirect(`/vi${route.path}`);
      expect(target, `/vi${route.path} phai chuyen huong`).not.toBeNull();
      expect(known.has(target ?? ''), `${target} phai la route co that`).toBe(true);
    }
  });

  it('van bao luu /vi de khong slug nao chiem duoc', () => {
    expect(isReservedPath('/vi')).toBe(true);
  });
});

describe('localePrefix', () => {
  it('ngon ngu o goc khong co tien to', () => {
    expect(localePrefix('vi')).toBe('');
    expect(localePrefix('en')).toBe('/en');
  });
});
