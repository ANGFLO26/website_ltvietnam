import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { createTestPool } from '@ltv/testing';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { UserServiceImpl, type UserDaos } from '../src/services/users/service.js';
import type { PasswordHasher } from '../src/services/auth/crypto.port.js';
import type { DomainError } from '../src/shared/errors.js';

/**
 * Nhung dieu DAO GIA KHONG chung minh duoc.
 *
 * `user-service.test.ts` kiem luat cua tang service bang DAO gia. Hai dieu o
 * day phu thuoc SQL that, nen DAO gia se cho ket qua dung vi mot ly do sai:
 *
 *   1. `countAll()` co dem ca hang DA XOA MEM khong. DAO gia khong co
 *      `deleted_at`, nen no khong the noi gi ve cau hoi nay — va day dung la
 *      cho lo hong leo thang dac quyen co the quay lai qua mot cua khac.
 *   2. `countActiveAdmins()` co dem dung khong (loc `role`, `status`,
 *      `deleted_at`).
 */

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

class HasherGia implements PasswordHasher {
  async hash(plain: string): Promise<string> { return `bam:${plain}`; }
  async verify(): Promise<boolean> { throw new Error('khong dung'); }
  async burn(): Promise<void> { throw new Error('khong dung'); }
}

run('UserService tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  let svc: UserServiceImpl;
  const tag = `us-${Date.now()}`;
  const MK = 'mat-khau-du-dai-that';

  beforeAll(() => {
    /**
     * `max: 1` — MOT ket noi duy nhat, va day khong phai de tiet kiem.
     *
     * Bo test nay phai chay tren mot bang `users` RONG (bootstrap chi chay khi
     * bang rong), nen no `DELETE` roi `ROLLBACK`. Ban dau toi goi
     * `pool.query('BEGIN')` / `pool.query('ROLLBACK')` tren mot pool binh
     * thuong. Do la SAI, va sai im lang:
     *
     *   pool KHONG bao dam hai cau lenh lien tiep di cung mot ket noi.
     *
     * `BEGIN` di ket noi A, `DELETE FROM ltv.users` di ket noi B — ngoai moi
     * transaction, nen no XOA THAT — va `ROLLBACK` di ket noi C, khong hoan tac
     * gi ca. Ca 343 test van xanh, roi `smoke-auth.mjs` chay ngay sau do bao
     * "Khong dang nhap duoc": tai khoan quan tri da bi xoa vinh vien.
     *
     * Toi da viet dung canh bao nay trong chu thich cua `createClientFrom` o
     * `packages/db/src/pool.ts`, roi mac dung loi do vai phut sau.
     *
     * Voi `max: 1` thi moi cau lenh di cung mot ket noi, nen `BEGIN`/`ROLLBACK`
     * that su bao ve. Gia phai tra: bo test nay khong duoc chay hai truy van
     * song song — tat ca deu `await` tuan tu, va neu ai do pha dieu do thi no
     * se treo chu khong am tham xoa du lieu.
     */
    pool = createTestPool(url!, { max: 1 });
    daos = createDaoManager(createKysely(pool));
    svc = new UserServiceImpl(daos as unknown as UserDaos, new HasherGia(), 12);
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.users WHERE email LIKE $1`, [`${tag}-%`]);
    await pool.end();
  });

  /** Bo sach bang `users` roi tra lai so hang da tam bo di. */
  const voiBangRong = async <T>(fn: () => Promise<T>): Promise<T> => {
    /**
     * Bootstrap chi chay khi bang RONG, nen phep kiem phai dung tren mot bang
     * rong that. Dung transaction roi rollback thay vi xoa that: bo test khac
     * chay song song van thay du lieu cua chung.
     */
    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM ltv.users');
      return await fn();
    } finally {
      await pool.query('ROLLBACK');
    }
  };

  it('countAll dem CA hang da xoa mem', async () => {
    /**
     * Day la phep kiem ma DAO gia khong lam duoc. Neu `countAll` loc
     * `deleted_at IS NULL` thi xoa mem quan tri cuoi cung se MO LAI cong
     * bootstrap — cung lo hong leo thang dac quyen, chi qua mot cua khac.
     */
    const u = await daos.users.insert({
      name: 'Se bi xoa', email: `${tag}-xoa@vd.local`, passwordHash: 'bam:x',
    });
    const truoc = await daos.users.countAll();
    await pool.query(`UPDATE ltv.users SET deleted_at = now() WHERE id = $1`, [u.id]);

    expect(await daos.users.countAll()).toBe(truoc);
    // Va de doi chieu: `countActiveAdmins` thi PHAI bo qua hang da xoa mem.
    const hoatDong = await daos.users.countActiveAdmins();
    await pool.query(`UPDATE ltv.users SET deleted_at = NULL WHERE id = $1`, [u.id]);
    expect(await daos.users.countActiveAdmins()).toBe(hoatDong + 1);
  });

  it('bootstrap: bang rong -> tao duoc', async () => {
    const u = await voiBangRong(() =>
      svc.bootstrapFirstAdmin({ name: 'Dau tien', email: `${tag}-1@vd.local`, password: MK }),
    );
    expect(u.role).toBe('admin');
    expect(u.status).toBe('active');
  });

  it('bootstrap: quan tri duy nhat bi LOCKED -> VAN tu choi', async () => {
    /**
     * Chuoi leo thang dac quyen da do that tren HTTP, gio la bo test hoi quy
     * tren database that:
     *
     *   doan sai den nguong  ->  status = 'locked'
     *   countActiveAdmins()  ->  0
     *   POST /auth/bootstrap ->  TRUOC: 201 va ke tan cong co quan tri
     *                            SAU:   409
     */
    const e = await voiBangRong(async () => {
      await pool.query(
        `INSERT INTO ltv.users (name, email, password_hash, role, status)
         VALUES ('Bi khoa', $1, 'bam:x', 'admin', 'locked')`,
        [`${tag}-locked@vd.local`],
      );
      expect(await daos.users.countActiveAdmins()).toBe(0);
      expect(await daos.users.countAll()).toBe(1);
      try {
        await svc.bootstrapFirstAdmin({ name: 'Ke tan cong', email: `${tag}-ke@evil.test`, password: MK });
      } catch (err) {
        return err as DomainError;
      }
      return null;
    });
    expect(e, 'bootstrap PHAI bi tu choi khi da co hang trong bang users').not.toBeNull();
    expect(e!.code).toBe('USER_BOOTSTRAP_DONE');
  });

  it('bootstrap: chi con hang DA XOA MEM -> van tu choi', async () => {
    const e = await voiBangRong(async () => {
      await pool.query(
        `INSERT INTO ltv.users (name, email, password_hash, role, status, deleted_at)
         VALUES ('Da xoa', $1, 'bam:x', 'admin', 'active', now())`,
        [`${tag}-del@vd.local`],
      );
      try {
        await svc.bootstrapFirstAdmin({ name: 'Ke tan cong', email: `${tag}-ke2@evil.test`, password: MK });
      } catch (err) {
        return err as DomainError;
      }
      return null;
    });
    expect(e, 'hang da xoa mem VAN phai chan bootstrap').not.toBeNull();
    expect(e!.code).toBe('USER_BOOTSTRAP_DONE');
  });

  it('setStatus: khong vo hieu hoa duoc quan tri hoat dong cuoi cung', async () => {
    const e = await voiBangRong(async () => {
      const a = await daos.users.insert({
        name: 'Duy nhat', email: `${tag}-solo@vd.local`, passwordHash: 'bam:x',
      });
      const b = await daos.users.insert({
        name: 'Da khoa', email: `${tag}-off@vd.local`, passwordHash: 'bam:x',
      });
      await daos.users.setStatus(b.id, 'disabled');
      expect(await daos.users.countActiveAdmins()).toBe(1);
      try {
        await svc.setStatus(a.id, 'disabled', b.id);
      } catch (err) {
        return err as DomainError;
      }
      return null;
    });
    expect(e).not.toBeNull();
    expect(e!.code).toBe('USER_LAST_ADMIN');
  });
});
