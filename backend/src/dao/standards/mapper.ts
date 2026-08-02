import type { Selectable } from 'kysely';
import type { StandardsTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import type { Standard } from './object.js';

export function toStandard(row: Selectable<StandardsTable>): Standard {
  return {
    id: row.id,
    organization: row.organization,
    code: row.code,
    name: row.name,
    slug: row.slug,
    description: row.description,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    status: row.status as EntityStatus,
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
  };
}
