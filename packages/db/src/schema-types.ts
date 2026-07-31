/**
 * Kieu du lieu Kysely cho schema `ltv`.
 *
 * P0 chi khai bao nhung bang duoc dung ngay (health, migration).
 * Cac bang con lai duoc bo sung theo tung phase, hoac sinh tu dong bang
 * `kysely-codegen` khi database da co du lieu that.
 */
import type { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface SchemaMigrationsTable {
  id: string;
  name: string;
  checksum: string;
  applied_at: Generated<Timestamp>;
  applied_by: Generated<string>;
  duration_ms: number | null;
}

export interface UsersTable {
  id: Generated<string>;
  name: string;
  email: string;
  password_hash: string;
  role: Generated<string>;
  status: Generated<string>;
  last_login_at: Timestamp | null;
  password_changed_at: Timestamp | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  deleted_at: Timestamp | null;
}

export interface Database {
  schema_migrations: SchemaMigrationsTable;
  users: UsersTable;
}
