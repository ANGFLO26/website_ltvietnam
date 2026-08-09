import type { Locale } from '@ltv/contracts';

export const SEO_SERVICE = Symbol('SEO_SERVICE');

export interface SeoService {
  sitemapIndex(): string;
  sitemap(locale: Locale): Promise<string>;
  robots(): Promise<string>;
}
