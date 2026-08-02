import type { Selectable } from 'kysely';
import type { CustomersTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import type { Customer } from './object.js';

export function toCustomer(row: Selectable<CustomersTable>): Customer {
  return {
    id: row.id,
    name: row.name,
    shortDescription: row.short_description,
    logoId: row.logo_id,
    industryId: row.industry_id,
    websiteUrl: row.website_url,
    isPublic: row.is_public,
    isFeatured: row.is_featured,
    displayOrder: row.display_order,
    status: row.status as EntityStatus,
  };
}
