/** Tien ich dung chung cho test tich hop co database. */
import pg from 'pg';

export interface TestDb {
  readonly pool: pg.Pool;
  /** Xoa sach du lieu moi bang nhung giu nguyen cau truc. */
  truncateAll(): Promise<void>;
  close(): Promise<void>;
}

export async function createTestDb(connectionString: string, schema = 'ltv'): Promise<TestDb> {
  const pool = new pg.Pool({ connectionString, max: 4 });
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
