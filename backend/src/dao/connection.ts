import { Kysely, PostgresDialect, type Transaction } from 'kysely';
import pg from 'pg';
import type { AppConfig } from '@ltv/config';
import type { Database } from '@ltv/db';

/**
 * Ket noi PostgreSQL — TANG DAO.
 *
 * Day va cac file trong `dao/` la NHUNG NOI DUY NHAT duoc biet ve Kysely va pg.
 * Tang services va api khong bao gio import hai thu nay.
 */
export type KyselyExecutor = Kysely<Database> | Transaction<Database>;

export function createPool(cfg: AppConfig): pg.Pool {
  return new pg.Pool({
    connectionString: cfg.DATABASE_URL,
    max: cfg.DATABASE_POOL_MAX,
    statement_timeout: cfg.DATABASE_STATEMENT_TIMEOUT_MS,
    options: `-c search_path=${cfg.DATABASE_SCHEMA},public`,
  });
}

export function createKysely(pool: pg.Pool): Kysely<Database> {
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}

/**
 * Tao DAO manager tu cau hinh — cong vao duy nhat cho tang tren.
 *
 * Tra ve ca `close` de tang tren tat ket noi ma khong phai biet `pg.Pool`
 * la gi. Nho vay `pg` khong lot ra khoi thu muc `dao/`.
 */
export interface DaoRuntime {
  readonly manager: import('./dao-manager.js').DaoManager;
  close(): Promise<void>;
}

export async function createDaoRuntime(cfg: AppConfig): Promise<DaoRuntime> {
  const { createDaoManager } = await import('./dao-manager.js');
  const pool = createPool(cfg);
  const db = createKysely(pool);
  return { manager: createDaoManager(db), close: () => pool.end() };
}
