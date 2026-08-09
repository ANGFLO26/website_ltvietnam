import type { CreateUserInput, User, UserStatus, UserWithCredentials } from './object.js';
import type { Page, Paged } from '../helpers.js';

/**
 * Hop dong truy cap du lieu cho bang `users`.
 *
 * KHONG co tham so executor: DAO lay tu `tx` cua DaoManager da gan san
 * transaction.
 */
export interface UserDao {
  list(
    filter: { status?: UserStatus; search?: string },
    page?: Partial<Page>,
  ): Promise<Paged<User>>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;

  /** Chi auth duoc goi. Tra ve ca ma bang hash. */
  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null>;

  insert(input: CreateUserInput): Promise<User>;
  updateLastLogin(id: string, at: Date): Promise<void>;
  updatePassword(id: string, passwordHash: string, changedAt: Date): Promise<void>;
  setStatus(id: string, status: UserStatus): Promise<void>;
  /** Serialize changes that could remove active administrators. Call inside a transaction. */
  lockActiveAdmins(): Promise<void>;
  countActiveAdmins(): Promise<number>;

  /**
   * Dem MOI hang trong bang — moi vai tro, moi trang thai, KE CA da xoa mem.
   *
   * Khac `countActiveAdmins` mot cach co y, va su khac biet do la mot lo hong
   * da khai thac duoc. `bootstrapFirstAdmin` truoc day hoi "con quan tri HOAT
   * DONG nao khong", tuc la mot he thong co quan tri bi `locked` duoc coi la
   * he thong CHUA KHOI TAO — va endpoint bootstrap thi `@Public()`.
   *
   * Cau hoi dung la "bang `users` co rong khong". Ke ca hang da xoa mem cung
   * tinh: neu khong thi xoa quan tri cuoi cung se mo lai cong.
   */
  countAll(): Promise<number>;
}
