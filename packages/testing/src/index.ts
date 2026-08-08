/**
 * Tien ich dung chung cho test tich hop co database.
 *
 * TRUOC F-1c, file nay la MA CHET: khong mot ai import `@ltv/testing`. No la
 * bien the thu sau cua viec tao pool, va la bien the khong ai dung. Trong khi
 * do 15 cho trong `backend/test/` viet lai cung mot dong:
 *
 *     new pg.Pool({ connectionString: url, options: '-c search_path=ltv,public' })
 *
 * Cach de nhat la xoa file nay. Nhung 15 ban sao kia moi la van de that, va
 * chung dang dua vao MOT SU TINH CO: bo doc DATE duoc dang ky o pham vi module
 * cua `packages/db/src/pool.ts`, nen test chi doc DATE dung khi no tinh co
 * import mot file co keo `pool.ts` theo. Mot bai test moi tu tao pool va khong
 * import gi cua tang dao se thay `Date` thay vi chuoi — tuc la test va production
 * doc DU LIEU KHAC NHAU, dung loai khac biet khong ai nghi tim.
 *
 * Nen file nay tro thanh nguon duy nhat cho test, va no goi lai `@ltv/db`.
 */
import type pg from 'pg';
import { createClientFrom, createPoolFrom } from '@ltv/db';

export interface TestPoolOptions {
  readonly schema?: string;
  readonly max?: number;
  /**
   * Mot vai bai test CAN mot tran ngan: test `FOR UPDATE SKIP LOCKED` chung
   * minh dieu no noi bang cach cho mot ket noi khac cham tran thoi gian. Do la
   * mot yeu cau that, nen no la mot tham so chu khong phai mot ngoai le.
   */
  readonly statementTimeoutMs?: number;
}

/**
 * Pool cho test — cung duong tao voi backend va worker.
 *
 * Mac dinh `statement_timeout` co han (30s) chu khong phai 0: mot bai test
 * dinh khoa nen CHET voi thong bao ro rang, khong nen treo cho tron bo test
 * het gio.
 */
export function createTestPool(connectionString: string, o: TestPoolOptions = {}): pg.Pool {
  return createPoolFrom({
    connectionString,
    schema: o.schema ?? 'ltv',
    max: o.max ?? 4,
    statementTimeoutMs: o.statementTimeoutMs ?? 30_000,
  });
}

/** Ket noi don cho test can GHIM mot phien (giu khoa, mo transaction). */
export function createTestClient(connectionString: string, o: TestPoolOptions = {}): pg.Client {
  return createClientFrom({
    connectionString,
    schema: o.schema ?? 'ltv',
    statementTimeoutMs: o.statementTimeoutMs ?? 30_000,
  });
}

export interface TestDb {
  readonly pool: pg.Pool;
  /** Xoa sach du lieu moi bang nhung giu nguyen cau truc. */
  truncateAll(): Promise<void>;
  close(): Promise<void>;
}

export async function createTestDb(connectionString: string, schema = 'ltv'): Promise<TestDb> {
  const pool = createTestPool(connectionString, { schema });
  return {
    pool,
    async truncateAll(): Promise<void> {
      const { rows } = await pool.query<{ tablename: string }>(
        `SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename <> 'schema_migrations'`,
        [schema],
      );
      if (rows.length === 0) return;
      const list = rows.map((r) => `"${schema}"."${r.tablename}"`).join(', ');
      await pool.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}
