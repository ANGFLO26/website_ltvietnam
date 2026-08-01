import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { sql } from 'kysely';
import type { Database } from '@ltv/db';
import { KYSELY_DB } from '../../../shared/infrastructure/tokens.js';
import type { DatabaseHealthPort } from '../application/ports/database-health.port.js';

/** Adapter ha tang — noi DUY NHAT trong module health biet ve Kysely va SQL. */
@Injectable()
export class PostgresHealthAdapter implements DatabaseHealthPort {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async canServeMinimalQuery(): Promise<boolean> {
    try {
      const r = await sql<{ ok: number }>`SELECT 1 AS ok`.execute(this.db);
      return r.rows[0]?.ok === 1;
    } catch {
      return false;
    }
  }
}
