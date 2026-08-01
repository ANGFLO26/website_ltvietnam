import { BaseDao } from '../base.dao.js';
import type { UserDao } from './dao.interface.js';
import type { CreateUserInput, User, UserStatus, UserWithCredentials } from './object.js';
import { toUser, toUserWithCredentials } from './mapper.js';

/** Cai dat Kysely cho `UserDao`. */
export class KyselyUserDao extends BaseDao implements UserDao {
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
