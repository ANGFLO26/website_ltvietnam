import type { SitemapSource, SitemapSourceRow } from './object.js';

export function toSitemapSource(row: SitemapSourceRow): SitemapSource {
  return {
    kind: row.kind,
    locale: row.locale,
    slug: row.slug,
    pageType: row.page_type,
    updatedAt: row.updated_at,
    hasEditorialContent: row.has_editorial_content,
  };
}
