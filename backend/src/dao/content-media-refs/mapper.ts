import type { Selectable } from 'kysely';
import type { ContentMediaRefsTable } from '@ltv/db';
import type { ContentMediaRef } from './object.js';

export function toContentMediaRef(row: Selectable<ContentMediaRefsTable>): ContentMediaRef {
  return {
    id: row.id,
    mediaId: row.media_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    locale: row.locale,
    fieldName: row.field_name,
  };
}
