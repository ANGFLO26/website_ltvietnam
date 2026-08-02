import type { Selectable } from 'kysely';
import type { IndustriesTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import { toBlocks } from '../content.js';
import type { Industry } from './object.js';

export function toIndustry(row: Selectable<IndustriesTable>): Industry {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: toBlocks(row.description),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    featuredImageId: row.featured_image_id,
    iconId: row.icon_id,
    status: row.status as EntityStatus,
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
  };
}
