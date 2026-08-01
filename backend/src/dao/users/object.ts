/**
 * Thuc the nghiep vu `User` — KHONG phai hang trong bang.
 *
 * Tach khoi `UsersTable` cua Kysely de:
 *   - ten truong theo camelCase, khong lo snake_case ra API
 *   - khong lo `Generated<T>` va `ColumnType` cua Kysely len tang tren
 *   - `passwordHash` KHONG nam trong `User`, chi nam trong `UserWithCredentials`
 */
export type UserRole = 'admin';
export type UserStatus = 'active' | 'disabled' | 'locked';

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly lastLoginAt: Date | null;
  readonly passwordChangedAt: Date | null;
  readonly createdAt: Date;
}

/**
 * Chi tra ve tu `findByEmailWithCredentials`, chi module auth duoc dung.
 *
 * Tach kieu nhu the nay khien ma bang hash KHONG THE lot ra response mot cach
 * vo tinh — muon lo thi phai co y goi dung phuong thuc do.
 */
export interface UserWithCredentials extends User {
  readonly passwordHash: string;
}

export interface CreateUserInput {
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role?: UserRole;
}
