import type { Locale } from '@ltv/contracts';
import type { SitemapSource } from './object.js';

export interface SeoDao {
  /** Tat ca URL dong da published cua mot locale; khong phan trang/truncation. */
  listSitemapSources(locale: Locale): Promise<SitemapSource[]>;
  /** Source redirect active de sitemap khong tu tro vao 301/302. */
  listActiveRedirectSources(): Promise<string[]>;
}
