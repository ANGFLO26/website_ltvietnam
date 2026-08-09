import { BaseDao } from '../base.dao.js';
import type { UserDao } from './dao.interface.js';
import type { CreateUserInput, User, UserStatus, UserWithCredentials } from './object.js';
import { toUser, toUserWithCredentials } from './mapper.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';

/** Cai dat Kysely cho `UserDao`. */
export class KyselyUserDao extends BaseDao implements UserDao {
  async list(
    filter: { status?: UserStatus; search?: string },
    page?: Partial<Page>,
  ): Promise<Paged<User>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('users').selectAll().where('deleted_at', 'is', null);
    let cq = this.db
      .selectFrom('users')
      .select(({ fn }) => fn.countAll<string>().as('n'))
      .where('deleted_at', 'is', null);
    if (filter.status) {
      q = q.where('status', '=', filter.status);
      cq = cq.where('status', '=', filter.status);
    }
    if (filter.search) {
      const pattern = `%${filter.search}%`;
      q = q.where((eb) => eb.or([eb('name', 'ilike', pattern), eb('email', 'ilike', pattern)]));
      cq = cq.where((eb) => eb.or([eb('name', 'ilike', pattern), eb('email', 'ilike', pattern)]));
    }
    const rows = await q
      .orderBy('created_at', 'desc')
      .limit(p.pageSize)
      .offset(offsetOf(p))
      .execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toUser), total, p);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    return row ? toUser(row) : null;
  }

  async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    const row = await this.db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    return row ? toUserWithCredentials(row) : null;
  }

  async insert(input: CreateUserInput): Promise<User> {
    const row = await this.db
      .insertInto('users')
      .values({
        name: input.name,
        email: input.email,
        password_hash: input.passwordHash,
        role: input.role ?? 'admin',
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toUser(row);
  }

  async updateLastLogin(id: string, at: Date): Promise<void> {
    await this.db.updateTable('users').set({ last_login_at: at }).where('id', '=', id).execute();
  }

  async updatePassword(id: string, passwordHash: string, changedAt: Date): Promise<void> {
    await this.db
      .updateTable('users')
      .set({ password_hash: passwordHash, password_changed_at: changedAt })
      .where('id', '=', id)
      .execute();
  }

  async setStatus(id: string, status: UserStatus): Promise<void> {
    await this.db.updateTable('users').set({ status }).where('id', '=', id).execute();
  }

  async lockActiveAdmins(): Promise<void> {
    await this.db
      .selectFrom('users')
      .select('id')
      .where('role', '=', 'admin')
      .where('status', '=', 'active')
      .where('deleted_at', 'is', null)
      .orderBy('id')
      .forUpdate()
      .execute();
  }

  /**
   * KHONG co `where` nao — day khong phai thieu sot.
   *
   * Cau hoi la "bang nay co rong khong". Them bat ky dieu kien nao (trang thai,
   * vai tro, `deleted_at`) se lam mot bang KHONG rong duoc tra loi la rong, va
   * do dung la lo hong ma ham nay ra doi de dong.
   */
  async countAll(): Promise<number> {
    const r = await this.db
      .selectFrom('users')
      .select(({ fn }) => fn.countAll<string>().as('n'))
      .executeTakeFirstOrThrow();
    return Number(r.n);
  }

  async countActiveAdmins(): Promise<number> {
    const r = await this.db
      .selectFrom('users')
      .select(({ fn }) => fn.countAll<string>().as('n'))
      .where('role', '=', 'admin')
      .where('status', '=', 'active')
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow();
    return Number(r.n);
  }
}
