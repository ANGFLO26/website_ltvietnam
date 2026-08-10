import type { Faq, Locale, OfficeView, PostDetailView, ProductDetailView } from '@ltv/contracts';

export interface StructuredBreadcrumb {
  readonly name: string;
  readonly url: string;
}

export interface SiteOrganizationInput {
  readonly siteUrl: string;
  readonly name: string;
  readonly description: string;
  readonly offices: readonly OfficeView[];
  readonly logoUrl?: string | null;
}

export function buildProductStructuredData(product: ProductDetailView): Record<string, unknown> {
  const images = product.media.flatMap((item) =>
    item.public_url === null ? [] : [absoluteFromCanonical(item.public_url, product.canonical)],
  );

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${product.canonical}#product`,
    url: product.canonical,
    name: product.name,
    description: product.seo_description ?? product.short_description ?? undefined,
    model: product.model ?? undefined,
    brand: {
      '@type': 'Brand',
      name: product.brand.name,
    },
    category: product.categories.find((category) => category.is_primary)?.name,
    image: images.length === 0 ? undefined : images,
    additionalProperty:
      product.specifications.length === 0
        ? undefined
        : product.specifications.map((specification) => ({
            '@type': 'PropertyValue',
            name: specification.label,
            value: specificationValue(specification),
          })),
  });
}

export function buildSiteStructuredData(input: SiteOrganizationInput): Record<string, unknown> {
  const siteUrl = new URL('/', input.siteUrl).toString();
  const organizationId = `${siteUrl}#organization`;
  const logo = input.logoUrl ? absoluteFromCanonical(input.logoUrl, siteUrl) : undefined;
  const organization = compact({
    '@type': 'Organization',
    '@id': organizationId,
    name: input.name,
    description: input.description,
    url: siteUrl,
    logo,
  });
  const offices = input.offices.map((office, index) =>
    compact({
      '@type': 'LocalBusiness',
      '@id': `${siteUrl}#office-${index + 1}`,
      name: office.name,
      url: siteUrl,
      parentOrganization: { '@id': organizationId },
      address: {
        '@type': 'PostalAddress',
        streetAddress: office.address,
      },
      telephone: office.phone ?? undefined,
      email: office.email ?? undefined,
      openingHours: office.working_hours ?? undefined,
      geo:
        office.latitude === null || office.longitude === null
          ? undefined
          : {
              '@type': 'GeoCoordinates',
              latitude: office.latitude,
              longitude: office.longitude,
            },
    }),
  );

  return {
    '@context': 'https://schema.org',
    '@graph': [organization, ...offices],
  };
}

export function buildArticleStructuredData(
  post: PostDetailView,
  imageUrl?: string | null,
): Record<string, unknown> {
  const siteUrl = new URL('/', post.canonical).toString();
  return compact({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': `${post.canonical}#article`,
    mainEntityOfPage: post.canonical,
    headline: post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    datePublished: post.published_at ?? undefined,
    inLanguage: localeTag(post.locale),
    articleSection: post.category?.name,
    image:
      imageUrl === undefined || imageUrl === null
        ? undefined
        : absoluteFromCanonical(imageUrl, post.canonical),
    author: { '@id': `${siteUrl}#organization` },
    publisher: { '@id': `${siteUrl}#organization` },
  });
}

export function buildFaqStructuredData(
  faq: Faq | null | undefined,
  canonical: string,
): Record<string, unknown> | null {
  if (!Array.isArray(faq?.items) || faq.items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: faq.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer_spans.map((span) => span.text).join(''),
      },
    })),
  };
}

export function buildBreadcrumbStructuredData(
  items: readonly StructuredBreadcrumb[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** JSON safe to place inside a script element without interpreting user content as markup. */
export function structuredDataJson(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function absoluteFromCanonical(value: string, canonical: string): string {
  return new URL(value, canonical).toString();
}

function specificationValue(specification: ProductDetailView['specifications'][number]): string {
  return [specification.value, specification.unit].filter(Boolean).join(' ');
}

function localeTag(locale: Locale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

function compact(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
