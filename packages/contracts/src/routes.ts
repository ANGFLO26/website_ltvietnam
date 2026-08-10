/**
 * Bang route cong khai — nguon su that duy nhat cho URL.
 *
 * Khop `doc/02` PHAN II muc 2 (v1.3). Tap route bao luu cua SlugService
 * duoc SINH TU DONG tu bang nay (ADR-002 muc 8), khong viet tay.
 *
 * Quy tac ngon ngu (ADR-001/014):
 *   - Tieng Anh o goc, khong tien to.
 *   - Tieng Viet o tien to `/vi`, CHI cho bon nhom co ban dich:
 *     pages, posts, services, projects.
 *   - Doan duong dan viet bang tieng Anh cho ca hai ngon ngu.
 */

export const LOCALES = ['en', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Phase trien khai frontend cong khai theo `doc/17` va `doc/19`. */
export type WebPhase = 'W0' | 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6' | 'W7' | 'W8';
export type WebRouteStatus = 'todo' | 'done';

/** Bon nhom co ban dich — chi bon nhom nay co bien the `/vi`. */
export const TRANSLATED_ENTITIES = ['pages', 'posts', 'services', 'projects'] as const;
export type TranslatedEntity = (typeof TRANSLATED_ENTITIES)[number];

export interface RouteDef {
  /** Ma dinh danh noi bo. */
  readonly key: string;
  /** Duong dan tieng Anh, tham so dung dinh dang `:name`. */
  readonly path: string;
  /** Co bien the `/vi` khong. */
  readonly localized: boolean;
  /** robots mac dinh. `conditional` = phu thuoc du lieu (ADR-011 muc 2b). */
  readonly robots: 'index' | 'noindex' | 'conditional';
  /** Phase so huu route; dung de kiem hai chieu voi cay `app/`. */
  readonly phase: WebPhase;
  /** Chi doi thanh `done` khi route va cac phep kiem nghiem thu da xanh. */
  readonly status: WebRouteStatus;
}

export const ROUTES = [
  { key: 'home', path: '/', localized: false, robots: 'index', phase: 'W1', status: 'done' },
  { key: 'about', path: '/about', localized: true, robots: 'index', phase: 'W4', status: 'done' },
  {
    key: 'about.page',
    path: '/about/:slug',
    localized: true,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'products.landing',
    path: '/products',
    localized: false,
    robots: 'index',
    phase: 'W2',
    status: 'done',
  },
  {
    key: 'products.all',
    path: '/products/all',
    localized: false,
    robots: 'index',
    phase: 'W2',
    status: 'done',
  },
  {
    key: 'products.category',
    path: '/products/category/:slug',
    localized: false,
    robots: 'conditional',
    phase: 'W2',
    status: 'done',
  },
  {
    key: 'products.standard',
    path: '/products/standard/:slug',
    localized: false,
    robots: 'conditional',
    phase: 'W2',
    status: 'done',
  },
  {
    key: 'products.application',
    path: '/products/application/:slug',
    localized: false,
    robots: 'conditional',
    phase: 'W2',
    status: 'done',
  },
  {
    key: 'products.detail',
    path: '/products/:slug',
    localized: false,
    robots: 'index',
    phase: 'W3',
    status: 'done',
  },
  {
    key: 'brands.list',
    path: '/brands',
    localized: false,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'brands.detail',
    path: '/brands/:slug',
    localized: false,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'services.list',
    path: '/services',
    localized: true,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'services.detail',
    path: '/services/:slug',
    localized: true,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'projects.list',
    path: '/projects',
    localized: true,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'projects.detail',
    path: '/projects/:slug',
    localized: true,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'news.list',
    path: '/news',
    localized: true,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'news.category',
    path: '/news/category/:slug',
    localized: true,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'news.detail',
    path: '/news/:slug',
    localized: true,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'resources.list',
    path: '/resources',
    localized: false,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'resources.detail',
    path: '/resources/:slug',
    localized: false,
    robots: 'index',
    phase: 'W4',
    status: 'done',
  },
  {
    key: 'contact',
    path: '/contact',
    localized: true,
    robots: 'index',
    phase: 'W5',
    status: 'done',
  },
  {
    key: 'search',
    path: '/search',
    localized: true,
    robots: 'noindex',
    phase: 'W6',
    status: 'done',
  },
  {
    key: 'request-success',
    path: '/request-success',
    localized: true,
    robots: 'noindex',
    phase: 'W5',
    status: 'done',
  },
  {
    key: 'privacy-policy',
    path: '/privacy-policy',
    localized: true,
    robots: 'index',
    phase: 'W6',
    status: 'done',
  },
  {
    key: 'terms-of-use',
    path: '/terms-of-use',
    localized: true,
    robots: 'index',
    phase: 'W6',
    status: 'done',
  },
  {
    key: 'cookie-policy',
    path: '/cookie-policy',
    localized: true,
    robots: 'index',
    phase: 'W6',
    status: 'done',
  },
] as const satisfies readonly RouteDef[];

/** Tien do frontend doc duoc tu bang route, khong tu bao cao bang van xuoi. */
export function routeProgress(): {
  readonly done: number;
  readonly total: number;
  readonly byPhase: Record<string, { done: number; total: number }>;
} {
  const routes: readonly RouteDef[] = ROUTES;
  const byPhase: Record<string, { done: number; total: number }> = {};
  for (const route of routes) {
    const progress = (byPhase[route.phase] ??= { done: 0, total: 0 });
    progress.total += 1;
    if (route.status === 'done') progress.done += 1;
  }
  return {
    done: routes.filter((route) => route.status === 'done').length,
    total: routes.length,
    byPhase,
  };
}

/** Tien to ky thuat khong bao gio duoc cap cho slug. */
export const TECHNICAL_PREFIXES = [
  '/api',
  '/admin',
  '/media',
  '/health',
  '/_next',
  '/static',
  '/sitemap.xml',
  '/robots.txt',
] as const;

/**
 * Sinh tap route bao luu (ADR-002 muc 8).
 *
 * Lay moi doan cap 1 va cap 2 cua moi route, nhan voi moi tien to locale,
 * roi cong them tien to ky thuat. SlugService dung tap nay lam nguon (C).
 */
export function buildReservedPaths(): ReadonlySet<string> {
  const out = new Set<string>(TECHNICAL_PREFIXES);
  out.add('/vi');

  for (const route of ROUTES) {
    const segments = route.path.split('/').filter(Boolean);
    const prefixes: string[] = route.localized ? ['', '/vi'] : [''];

    for (const prefix of prefixes) {
      // Doan cap 1
      const first = segments[0];
      if (first && !first.startsWith(':')) out.add(`${prefix}/${first}`);
      // Doan cap 2 (bo qua tham so dong)
      const second = segments[1];
      if (first && second && !first.startsWith(':') && !second.startsWith(':')) {
        out.add(`${prefix}/${first}/${second}`);
      }
    }
  }
  return out;
}

/** Duong dan cong khai da co tien to locale dung. */
export function localizedPath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/** Path da cho co bi bao luu khong. So khop chinh xac tung doan. */
export function isReservedPath(path: string, reserved = buildReservedPaths()): boolean {
  const normalized = path.replace(/\/+$/, '') || '/';
  return reserved.has(normalized);
}
