import type { Selectable } from 'kysely';
import type { PagesTable, PageTranslationsTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import { toBlocks } from '../content.js';
import type { Locale } from '../translation.support.js';
import type { AppPage, PageTranslation } from './object.js';

export function toPage(row: Selectable<PagesTable>): AppPage {
  return {
    id: row.id,
    pageType: row.page_type,
    featuredImageId: row.featured_image_id,
    status: row.status as EntityStatus,
    isSystemPage: row.is_system_page,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
  };
}

export function toPageTranslation(row: Selectable<PageTranslationsTable>): PageTranslation {
  return {
    id: row.id,
    pageId: row.page_id,
    locale: row.locale as Locale,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: toBlocks(row.content),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    status: row.status as 'draft' | 'published' | 'hidden',
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
  };
}
