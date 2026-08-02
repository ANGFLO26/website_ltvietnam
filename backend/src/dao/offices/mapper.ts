import type { Selectable } from 'kysely';
import type { OfficesTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import type { Office, OfficeType } from './object.js';

export function toOffice(row: Selectable<OfficesTable>): Office {
  return {
    id: row.id,
    officeType: row.office_type as OfficeType,
    name: row.name,
    address: row.address,
    workingHours: row.working_hours,
    description: row.description,
    phone: row.phone,
    fax: row.fax,
    email: row.email,
    mapUrl: row.map_url,
    // NUMERIC ve tu `pg` duoi dang chuoi de khong mat do chinh xac.
    latitude: toNum(row.latitude),
    longitude: toNum(row.longitude),
    featuredImageId: row.featured_image_id,
    status: row.status as EntityStatus,
    displayOrder: row.display_order,
  };
}

function toNum(v: string | number | null): number | null {
  if (v === null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
