import type { Selectable } from 'kysely';
import type { HomepageSectionsTable } from '@ltv/db';
import type { HomepageSection } from './object.js';

export function toHomepageSection(row: Selectable<HomepageSectionsTable>): HomepageSection {
  return {
    id: row.id,
    sectionType: row.section_type,
    isEnabled: row.is_enabled,
    displayOrder: row.display_order,
    settings: toSettings(row.settings),
  };
}

/** JSONB tu do: chi nhan doi tuong. Mang hay so thi coi nhu khong co cau hinh. */
function toSettings(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}
