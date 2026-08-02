import type { Selectable } from 'kysely';
import type { BrandsTable } from '@ltv/db';
import type { Brand, BrandType, EntityStatus } from './object.js';

/** Buc tuong duy nhat giua hang DB va thuc the nghiep vu. */
export function toBrand(row: Selectable<BrandsTable>): Brand {
  return {
    id: row.id,
    parentId: row.parent_id,
    ancestorIds: row.ancestor_ids ?? [],
    depth: row.depth,
    brandType: row.brand_type as BrandType,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    code: row.code,
    countryCode: row.country_code,
    websiteUrl: row.website_url,
    logoId: row.logo_id,
    coverImageId: row.cover_image_id,
    status: row.status as EntityStatus,
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
  };
}
