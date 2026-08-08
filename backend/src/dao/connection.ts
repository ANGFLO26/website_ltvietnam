import type { Kysely, Transaction } from 'kysely';
import type pg from 'pg';
import type { AppConfig } from '@ltv/config';
import { createAppPool, createDb, type Database } from '@ltv/db';
import type { DaoManager } from './dao-manager.js';

/**
 * Ket noi PostgreSQL — TANG DAO.
 *
 * Day va cac file trong `dao/` la NHUNG NOI DUY NHAT duoc biet ve Kysely va pg.
 * Tang services va api khong bao gio import hai thu nay.
 *
 * File nay KHONG con tu tao pool. Truoc F-1c no co mot ban sao y nguyen cua
 * `createPool` trong `packages/db`, cong them mot dong dang ky bo doc DATE ma
 * ban kia khong co — nen worker va migration CLI doc DATE lech mot ngay tren
 * may dat gio Viet Nam. Ban sao khong phan hoa vi ai do co y; no phan hoa vi
 * khong co gi buoc hai ban phai giong nhau. Nguon duy nhat gio o
 * `packages/db/src/pool.ts`, va Luat 12 chan viec mo mot nguon thu hai.
 */
export type KyselyExecutor = Kysely<Database> | Transaction<Database>;

/**
 * `import type pg` — CHI lay kieu, khong lay gia tri.
 *
 * Chu ky ham can kieu `pg.Pool`, nhung tang dao khong con can goi gi cua `pg`.
 * Import kieu bien mat sau khi bien dich, nen Luat 14 (chi `packages/db` duoc
 * import `pg` nhu GIA TRI) van dung.
 */
export function createKysely(pool: pg.Pool): Kysely<Database> {
  return createDb(pool);
}

/**
 * Tao DAO manager tu cau hinh — cong vao duy nhat cho tang tren.
 *
 * Tra ve ca `close` de tang tren tat ket noi ma khong phai biet `pg.Pool`
 * la gi. Nho vay `pg` khong lot ra khoi thu muc `dao/`.
 */
export interface DaoRuntime {
  readonly manager: DaoManager;
  close(): Promise<void>;
}

export async function createDaoRuntime(cfg: AppConfig): Promise<DaoRuntime> {
  const { createDaoManager } = await import('./dao-manager.js');
  const pool = createAppPool(cfg);
  const db = createDb(pool);
  return { manager: createDaoManager(db), close: () => pool.end() };
}
