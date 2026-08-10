const DEFAULT_SITE_URL = 'http://localhost:3000';
const DEFAULT_INTERNAL_API_URL = 'http://127.0.0.1:3001/api/v1';
const DEFAULT_API_TIMEOUT_MS = 8_000;
const DEFAULT_RESOLVER_CEILING_MS = 350;

export interface ServerConfig {
  readonly siteUrl: URL;
  readonly internalApiUrl: URL;
  readonly apiTimeoutMs: number;
  readonly resolverCeilingMs: number;
  readonly siteCoverImageUrl: string | null;
  readonly siteLogoUrl: string | null;
  readonly defaultSocialImageUrl: string | null;
}

export interface PublicCaptchaConfig {
  readonly provider: 'turnstile' | 'recaptcha' | null;
  readonly siteKey: string | null;
  readonly developmentBypass: boolean;
}

export function getServerConfig(): ServerConfig {
  return {
    siteUrl: readHttpUrl(
      'NEXT_PUBLIC_SITE_URL',
      process.env.NEXT_PUBLIC_SITE_URL,
      DEFAULT_SITE_URL,
    ),
    internalApiUrl: readHttpUrl(
      'INTERNAL_API_URL',
      process.env.INTERNAL_API_URL,
      DEFAULT_INTERNAL_API_URL,
    ),
    apiTimeoutMs: readPositiveInteger(
      'API_TIMEOUT_MS',
      process.env.API_TIMEOUT_MS,
      DEFAULT_API_TIMEOUT_MS,
    ),
    resolverCeilingMs: readPositiveInteger(
      'RESOLVER_CEILING_MS',
      process.env.RESOLVER_CEILING_MS,
      DEFAULT_RESOLVER_CEILING_MS,
    ),
    siteCoverImageUrl: readOptionalAssetUrl(
      'SEO_SITE_COVER_IMAGE_URL',
      process.env.SEO_SITE_COVER_IMAGE_URL,
    ),
    siteLogoUrl: readOptionalAssetUrl('SEO_SITE_LOGO_URL', process.env.SEO_SITE_LOGO_URL),
    defaultSocialImageUrl: readOptionalAssetUrl(
      'SEO_DEFAULT_SOCIAL_IMAGE_URL',
      process.env.SEO_DEFAULT_SOCIAL_IMAGE_URL,
    ),
  };
}

export function getPublicCaptchaConfig(): PublicCaptchaConfig {
  const rawProvider = process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER?.trim();
  const rawSiteKey = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY?.trim();
  const provider = rawProvider === 'turnstile' || rawProvider === 'recaptcha' ? rawProvider : null;
  const siteKey = rawSiteKey === undefined || rawSiteKey.length === 0 ? null : rawSiteKey;

  if ((provider === null) !== (siteKey === null)) {
    throw new Error(
      'NEXT_PUBLIC_CAPTCHA_PROVIDER and NEXT_PUBLIC_CAPTCHA_SITE_KEY must be configured together',
    );
  }
  if (rawProvider !== undefined && rawProvider.length > 0 && provider === null) {
    throw new Error('NEXT_PUBLIC_CAPTCHA_PROVIDER must be turnstile or recaptcha');
  }

  return {
    provider,
    siteKey,
    developmentBypass: provider === null && process.env.NODE_ENV !== 'production',
  };
}

function readHttpUrl(name: string, value: string | undefined, fallback: string): URL {
  const url = new URL(value ?? fallback);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must use http or https`);
  }
  return url;
}

function readPositiveInteger(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function readOptionalAssetUrl(name: string, value: string | undefined): string | null {
  const normalized = value?.trim();
  if (normalized === undefined || normalized.length === 0) return null;
  if (normalized.startsWith('/')) return normalized;
  const url = new URL(normalized);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must be an absolute http(s) URL or a root-relative path`);
  }
  return normalized;
}
