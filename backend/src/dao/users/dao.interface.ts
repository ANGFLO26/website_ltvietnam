import type { CreateUserInput, User, UserStatus, UserWithCredentials } from './object.js';

/**
 * Hop dong truy cap du lieu cho bang `users`.
 *
 * KHONG co tham so executor: DAO lay tu `tx` cua DaoManager da gan san
 * transaction.
 */
export interface UserDao {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;

  /** Chi auth duoc goi. Tra ve ca ma bang hash. */
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;

  insert(input: CreateUserInput): Promise<User>;
  updateLastLogin(id: string, at: Date): Promise<void>;
  updatePassword(id: string, passwordHash: string, changedAt: Date): Promise<void>;
  setStatus(id: string, status: UserStatus): Promise<void>;
  countActiveAdmins(): Promise<number>;
}
