import type { HreflangAlternateView, Locale } from '@ltv/contracts';
import type { Metadata } from 'next';
import { getServerConfig } from '@/config';
import { getRoute, routePath, type RouteKey } from './routes';

export interface MetadataInput {
  readonly title: string;
  readonly description?: string | null;
  readonly locale?: Locale;
  readonly params?: Readonly<Record<string, string | number>>;
  readonly canonical?: string;
  readonly indexable?: boolean;
  readonly featuredImage?: string | null;
  readonly coverImage?: string | null;
  readonly hreflangAlternates?: readonly HreflangAlternateView[];
}

const CONDITIONAL_FALLBACK: Partial<Record<RouteKey, RouteKey>> = {
  'products.category': 'products.all',
  'products.standard': 'products.all',
  'products.application': 'products.all',
};

export function buildMetadata(key: RouteKey, input: MetadataInput): Metadata {
  const route = getRoute(key);
  if (route.robots === 'conditional' && input.indexable === undefined) {
    throw new Error(`Conditional route ${key} requires indexable`);
  }

  const locale = input.locale ?? 'en';
  const routeIndex =
    route.robots === 'index' || (route.robots === 'conditional' && input.indexable === true);
  // Trang co query loc la bien the noindex cua mot route indexable. Dau vao
  // tuong minh phai duoc uu tien de canonical ve trang danh sach sach.
  const index = input.indexable ?? routeIndex;
  const canonicalPath = getCanonicalPath(key, input, index);
  const canonical = absoluteUrl(input.canonical ?? canonicalPath);
  const languages = Object.fromEntries(
    (input.hreflangAlternates ?? []).map((alternate) => [
      alternate.locale,
      absoluteUrl(alternate.url),
    ]),
  );
  const config = getServerConfig();
  const imageSource = selectSocialImage({
    featured: input.featuredImage,
    cover: input.coverImage,
    siteCover: config.siteCoverImageUrl,
    logo: config.siteLogoUrl,
    fallback: config.defaultSocialImageUrl,
  });
  const image = imageSource === null ? undefined : absoluteUrl(imageSource);

  return {
    title: input.title,
    ...(input.description === undefined || input.description === null
      ? {}
      : { description: input.description }),
    alternates: {
      canonical,
      ...(Object.keys(languages).length === 0 ? {} : { languages }),
    },
    robots: { index, follow: true },
    openGraph: {
      type: 'website',
      title: input.title,
      url: canonical,
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
      ...(input.description === undefined || input.description === null
        ? {}
        : { description: input.description }),
      ...(image === undefined ? {} : { images: [{ url: image }] }),
    },
  };
}

export function selectSocialImage(input: {
  readonly featured?: string | null | undefined;
  readonly cover?: string | null | undefined;
  readonly siteCover?: string | null | undefined;
  readonly logo?: string | null | undefined;
  readonly fallback?: string | null | undefined;
}): string | null {
  for (const candidate of [
    input.featured,
    input.cover,
    input.siteCover,
    input.logo,
    input.fallback,
  ]) {
    const normalized = candidate?.trim();
    if (normalized !== undefined && normalized.length > 0) return normalized;
  }
  return null;
}

function getCanonicalPath(key: RouteKey, input: MetadataInput, index: boolean): string {
  if (!index) {
    const fallback = CONDITIONAL_FALLBACK[key];
    if (fallback !== undefined) return routePath(fallback);
  }
  return routePath(key, {
    ...(input.locale === undefined ? {} : { locale: input.locale }),
    ...(input.params === undefined ? {} : { params: input.params }),
  });
}

function absoluteUrl(value: string): string {
  return new URL(value, getServerConfig().siteUrl).toString();
}
