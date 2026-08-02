import type { Selectable } from 'kysely';
import type { RedirectsTable } from '@ltv/db';
import type { Redirect, RedirectStatus, RedirectType } from './object.js';

export function toRedirect(row: Selectable<RedirectsTable>): Redirect {
  return {
    id: row.id,
    sourcePath: row.source_path,
    targetPath: row.target_path,
    redirectType: row.redirect_type as RedirectType,
    status: row.status as RedirectStatus,
    // hit_count la BIGINT -> `pg` tra ve chuoi.
    hitCount: Number(row.hit_count),
    lastHitAt: row.last_hit_at,
    createdAt: row.created_at,
  };
}
