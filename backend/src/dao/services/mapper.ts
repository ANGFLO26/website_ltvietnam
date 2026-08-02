import type { Selectable } from 'kysely';
import type { ServicesTable, ServiceTranslationsTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import { toBlocks } from '../content.js';
import type { Locale } from '../translation.support.js';
import type { Service, ServiceTranslation } from './object.js';

export function toService(row: Selectable<ServicesTable>): Service {
  return {
    id: row.id,
    parentId: row.parent_id,
    ancestorIds: row.ancestor_ids ?? [],
    depth: row.depth,
    serviceType: row.service_type,
    featuredImageId: row.featured_image_id,
    status: row.status as EntityStatus,
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
  };
}

export function toServiceTranslation(
  row: Selectable<ServiceTranslationsTable>,
): ServiceTranslation {
  return {
    id: row.id,
    serviceId: row.service_id,
    locale: row.locale as Locale,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    overview: toBlocks(row.overview),
    customerProblems: toBlocks(row.customer_problems),
    scopeOfWork: toBlocks(row.scope_of_work),
    process: toBlocks(row.process),
    benefits: toBlocks(row.benefits),
    faq: toBlocks(row.faq),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    status: row.status as 'draft' | 'published' | 'hidden',
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
  };
}
