import type { Selectable } from 'kysely';
import type { UsersTable } from '@ltv/db';
import type { User, UserRole, UserStatus, UserWithCredentials } from './object.js';

/**
 * Buc tuong duy nhat giua hinh dang BANG va hinh dang NGHIEP VU.
 *
 * Doi ten cot trong database chi sua file nay.
 */
export function toUser(row: Selectable<UsersTable>): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    lastLoginAt: row.last_login_at,
    passwordChangedAt: row.password_changed_at,
    createdAt: row.created_at,
  };
}

export function toUserWithCredentials(row: Selectable<UsersTable>): UserWithCredentials {
  return { ...toUser(row), passwordHash: row.password_hash };
}
