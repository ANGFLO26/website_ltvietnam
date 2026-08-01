import { Inject, Injectable } from '@nestjs/common';
import type pg from 'pg';
import { PG_POOL } from '../../infrastructure/tokens.js';
import type { DatabaseHealthPort } from '../ports/database-health.port.js';

/** Adapter tang ha tang — noi DUY NHAT biet ve `pg` va ve SQL. */
@Injectable()
export class PostgresHealthAdapter implements DatabaseHealthPort {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async canServeMinimalQuery(): Promise<boolean> {
    try {
      const res = await this.pool.query<{ ok: number }>('SELECT 1 AS ok');
      return res.rows[0]?.ok === 1;
    } catch {
      return false;
    }
  }
}
