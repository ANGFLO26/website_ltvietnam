import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { Database } from '@ltv/db';
import type { KyselyExecutor } from './connection.js';
import type { UserDao } from './users/dao.interface.js';
import { KyselyUserDao } from './users/dao.js';
import type { SettingDao } from './settings/dao.interface.js';
import { KyselySettingDao } from './settings/dao.js';

/**
 * Tap hop moi DAO. Them bang moi = them mot dong o day va mot dong o `buildDaos`.
 */
export interface AllDaos {
  readonly users: UserDao;
  readonly settings: SettingDao;
}

/** Kiem tra ket noi — dung cho `/health/ready`, khong thuoc bang nao. */
export interface DaoPing {
  ping(): Promise<boolean>;
}

/**
 * DAO MANAGER — cong vao duy nhat cua tang truy cap du lieu.
 *
 * Vi sao `transaction` nam o day thay vi truyen `executor` qua tung loi goi:
 *
 *   await daos.transaction(async (tx) => {
 *     await tx.users.updatePassword(id, hash, now);
 *     await tx.settings.upsert({ ... });
 *   });
 *
 * `tx` CHINH LA tap DAO da gan transaction. Khong co tham so nao de quen.
 * Muon chay ngoai transaction thi phai CO Y go `this.daos.users` thay vi
 * `tx.users` — sai lam phai co y moi xay ra duoc, thay vi xay ra do so y.
 */
export type DaoManager = AllDaos &
  DaoPing & {
    transaction<T>(fn: (tx: AllDaos) => Promise<T>): Promise<T>;
  };

function buildDaos(db: KyselyExecutor): AllDaos {
  return {
    users: new KyselyUserDao(db),
    settings: new KyselySettingDao(db),
  };
}

export function createDaoManager(db: Kysely<Database>): DaoManager {
  return {
    ...buildDaos(db),
    async ping(): Promise<boolean> {
      try {
        const r = await sql<{ ok: number }>`SELECT 1 AS ok`.execute(db);
        return r.rows[0]?.ok === 1;
      } catch {
        return false;
      }
    },
    transaction<T>(fn: (tx: AllDaos) => Promise<T>): Promise<T> {
      // Kysely tu quan ly BEGIN/COMMIT/ROLLBACK. Khong long transaction:
      // service SO HUU use case moi duoc goi ham nay.
      return db.transaction().execute((trx) => fn(buildDaos(trx)));
    },
  };
}
