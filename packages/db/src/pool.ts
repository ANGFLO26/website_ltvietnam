import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { AppConfig } from '@ltv/config';
import type { Database } from './schema-types.js';

export function createPool(cfg: AppConfig): pg.Pool {
  return new pg.Pool({
    connectionString: cfg.DATABASE_URL,
    max: cfg.DATABASE_POOL_MAX,
    statement_timeout: cfg.DATABASE_STATEMENT_TIMEOUT_MS,
    options: `-c search_path=${cfg.DATABASE_SCHEMA},public`,
  });
}

export function createDb(pool: pg.Pool): Kysely<Database> {
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}
