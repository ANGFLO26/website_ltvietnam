import type { Selectable } from 'kysely';
import type { PostCategoriesTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import type { PostCategory } from './object.js';

export function toPostCategory(row: Selectable<PostCategoriesTable>): PostCategory {
  return {
    id: row.id,
    parentId: row.parent_id,
    ancestorIds: row.ancestor_ids ?? [],
    depth: row.depth,
    name: row.name,
    slug: row.slug,
    description: row.description,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    status: row.status as EntityStatus,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
  };
}
