import { DEFAULT_LOCALE, ROUTES, localizedPath, type Locale, type RouteDef } from '@ltv/contracts';

export type RouteKey = (typeof ROUTES)[number]['key'];

export interface RouteOptions {
  readonly locale?: Locale;
  readonly params?: Readonly<Record<string, string | number>>;
  readonly query?: Readonly<
    Record<
      string,
      string | number | boolean | readonly (string | number | boolean)[] | null | undefined
    >
  >;
}

const ROUTE_BY_KEY = new Map<string, RouteDef>(ROUTES.map((route) => [route.key, route]));

export function getRoute(key: RouteKey): RouteDef {
  const route = ROUTE_BY_KEY.get(key);
  if (route === undefined) throw new Error(`Unknown public route: ${key}`);
  return route;
}

export function routePath(key: RouteKey, options: RouteOptions = {}): string {
  const route = getRoute(key);
  const locale = options.locale ?? DEFAULT_LOCALE;
  if (locale !== DEFAULT_LOCALE && !route.localized) {
    throw new Error(`Route ${key} does not have a ${locale} variant`);
  }

  const params = options.params ?? {};
  const used = new Set<string>();
  const path = route.path.replace(/:([a-z_]+)/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Route ${key} is missing parameter ${name}`);
    used.add(name);
    return encodeURIComponent(String(value));
  });
  const extra = Object.keys(params).filter((name) => !used.has(name));
  if (extra.length > 0)
    throw new Error(`Route ${key} received extra parameters: ${extra.join(', ')}`);

  const localized = localizedPath(path, locale);
  const search = buildSearch(options.query);
  return search.length === 0 ? localized : `${localized}?${search}`;
}

function buildSearch(query: RouteOptions['query']): string {
  if (query === undefined) return '';
  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    if (raw === undefined || raw === null) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) search.append(key, String(value));
  }
  return search.toString();
}
