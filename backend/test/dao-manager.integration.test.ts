import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';

/**
 * Test tich hop cho DAO manager — chay tren PostgreSQL THAT.
 *
 * Diem can chung minh: `transaction` cua manager that su la mot transaction,
 * va rollback that su hoan tac. Neu khong thi ca thiet ke "khong the quen
 * truyen executor" tro nen vo nghia.
 *
 * Bo qua khi khong co DATABASE_URL — de `pnpm test` chay duoc o may khong co DB.
 */
const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('DaoManager tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  const email = `arch-test-${Date.now()}@example.com`;

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: url, options: '-c search_path=ltv,public' });
    daos = createDaoManager(createKysely(pool));
  });
  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.users WHERE email LIKE 'arch-test-%'`);
    await pool.end();
  });

  it('ping() tra true khi ket noi duoc', async () => {
    expect(await daos.ping()).toBe(true);
  });

  it('ghi ngoai transaction van hoat dong', async () => {
    const u = await daos.users.insert({ name: 'Ngoai TX', email, passwordHash: 'x' });
    expect(u.email).toBe(email);
    expect(await daos.users.findByEmail(email)).not.toBeNull();
  });

  it('object khong lo passwordHash', async () => {
    const u = await daos.users.findByEmail(email);
    expect(u).not.toBeNull();
    expect(Object.keys(u!)).not.toContain('passwordHash');
    const withCreds = await daos.users.findByEmailWithCredentials(email);
    expect(withCreds!.passwordHash).toBe('x');
  });

  it('mapper doi snake_case sang camelCase', async () => {
    const u = await daos.users.findByEmail(email);
    expect(u).toHaveProperty('lastLoginAt');
    expect(u).not.toHaveProperty('last_login_at');
  });

  it('transaction COMMIT: nhieu bang cung mot don vi', async () => {
    const e2 = `arch-test-commit-${Date.now()}@example.com`;
    await daos.transaction(async (tx) => {
      await tx.users.insert({ name: 'Commit', email: e2, passwordHash: 'y' });
      await tx.settings.upsert({ group: 'company', key: 'short_name', value: 'LTV-TX' });
    });
    expect(await daos.users.findByEmail(e2)).not.toBeNull();
    expect((await daos.settings.findOne('company', 'short_name'))?.value).toBe('LTV-TX');
  });

  it('transaction ROLLBACK: nem loi thi KHONG con dau vet nao', async () => {
    const e3 = `arch-test-rollback-${Date.now()}@example.com`;
    const before = (await daos.settings.findOne('company', 'short_name'))?.value;

    await expect(
      daos.transaction(async (tx) => {
        await tx.users.insert({ name: 'Rollback', email: e3, passwordHash: 'z' });
        await tx.settings.upsert({ group: 'company', key: 'short_name', value: 'SE-BI-HOAN-TAC' });
        throw new Error('loi co y');
      }),
    ).rejects.toThrow('loi co y');

    // Ca hai thao tac o hai BANG KHAC NHAU deu phai bi hoan tac.
    expect(await daos.users.findByEmail(e3)).toBeNull();
    expect((await daos.settings.findOne('company', 'short_name'))?.value).toBe(before);
  });

  it('setting duoc danh dau ma hoa bi che khi mask', async () => {
    const { mask } = await import('../src/dao/settings/mapper.js');
    const s = await daos.settings.findOne('email', 'smtp_password');
    expect(s?.isEncrypted).toBe(true);
    await daos.settings.upsert({ group: 'email', key: 'smtp_password', value: 'bi-mat-that' });
    const after = await daos.settings.findOne('email', 'smtp_password');
    expect(mask(after!).value).toBe('********');
    expect(mask(after!).masked).toBe(true);
  });
});
