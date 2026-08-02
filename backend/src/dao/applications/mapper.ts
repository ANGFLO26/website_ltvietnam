import type { Selectable } from 'kysely';
import type { ApplicationsTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import { toBlocks } from '../content.js';
import type { Application } from './object.js';

export function toApplication(row: Selectable<ApplicationsTable>): Application {
  return {
    id: row.id,
    parentId: row.parent_id,
    ancestorIds: row.ancestor_ids ?? [],
    depth: row.depth,
    name: row.name,
    slug: row.slug,
    description: toBlocks(row.description),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    iconId: row.icon_id,
    status: row.status as EntityStatus,
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
  };
}
