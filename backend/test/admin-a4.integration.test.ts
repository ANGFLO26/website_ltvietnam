import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from '@ltv/db';
import { createTestPool } from '@ltv/testing';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('A4 inquiry ordering tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let db: Kysely<Database>;
  let daos: DaoManager;
  const tag = `a4-${Date.now()}`;
  beforeAll(async () => {
    pool = createTestPool(url!);
    db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
    daos = createDaoManager(db);
    await pool.query(
      `INSERT INTO ltv.inquiries (inquiry_type, full_name, phone, message, privacy_consent_at, idempotency_key, email_status, handled_at, created_at) VALUES
      ('quotation','Handled failed','0901','x',now(),$1,'email_failed',now(),now()),
      ('quotation','Unhandled sent','0902','x',now(),$2,'email_sent',null,now()),
      ('quotation','Unhandled failed','0903','x',now(),$3,'email_failed',null,now()-interval '1 day')`,
      [`${tag}-1`, `${tag}-2`, `${tag}-3`],
    );
  });
  afterAll(async () => {
    if (pool)
      await pool.query('DELETE FROM ltv.inquiries WHERE idempotency_key LIKE $1', [`${tag}%`]);
    if (db) await db.destroy();
  });
  it('dat tat ca chua xu ly truoc, roi uu tien email_failed', async () => {
    const result = await daos.inquiries.list(
      { inquiryType: 'quotation' },
      { page: 1, pageSize: 100 },
    );
    const ours = result.data.filter((x) => x.idempotencyKey.startsWith(tag));
    expect(ours.map((x) => x.fullName)).toEqual([
      'Unhandled failed',
      'Unhandled sent',
      'Handled failed',
    ]);
  });
});
