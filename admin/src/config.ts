const DEFAULT_INTERNAL_API_URL = 'http://127.0.0.1:3001/api/v1';

export interface AdminServerConfig {
  readonly internalApiUrl: URL;
  readonly apiTimeoutMs: number;
  readonly publicSiteUrl: URL;
}

export function getAdminServerConfig(): AdminServerConfig {
  return {
    internalApiUrl: httpUrl(
      'INTERNAL_API_URL',
      process.env.INTERNAL_API_URL,
      DEFAULT_INTERNAL_API_URL,
    ),
    apiTimeoutMs: positiveInteger('API_TIMEOUT_MS', process.env.API_TIMEOUT_MS, 8_000),
    publicSiteUrl: httpUrl(
      'NEXT_PUBLIC_SITE_URL',
      process.env.NEXT_PUBLIC_SITE_URL,
      'http://localhost:3000',
    ),
  };
}

export const ADMIN_CSRF_COOKIE = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME?.trim() || 'ltv_csrf';
export const ADMIN_CSRF_HEADER = process.env.NEXT_PUBLIC_CSRF_HEADER_NAME?.trim() || 'x-csrf-token';

function httpUrl(name: string, value: string | undefined, fallback: string): URL {
  const url = new URL(value ?? fallback);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must use http or https`);
  }
  return url;
}

function positiveInteger(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}
