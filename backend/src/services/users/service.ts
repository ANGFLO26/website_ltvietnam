import { ConflictError, DomainError, ForbiddenError, NotFoundError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { User, UserStatus } from '../../dao/users/object.js';
import type { PasswordHasher } from '../auth/crypto.port.js';
import type { CreateUserRequest, UserService } from './interface.js';

export type UserDaos = DaoScope<'users'>;

export class UserServiceImpl implements UserService {
  constructor(
    private readonly daos: UserDaos,
    private readonly hasher: PasswordHasher,
    private readonly minPasswordLength: number,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.daos.users.findById(id);
  }

  async create(input: CreateUserRequest): Promise<User> {
    const email = input.email.trim().toLowerCase();
    this.assertPassword(input.password);

    if (await this.daos.users.findByEmail(email)) {
      throw new ConflictError('USER_EMAIL_TAKEN', 'Email da duoc dung');
    }

    const passwordHash = await this.hasher.hash(input.password);
    return this.daos.users.insert({ name: input.name.trim(), email, passwordHash });
  }

  /**
   * Hai lop bao ve, va ca hai deu can.
   */
  async setStatus(id: string, status: UserStatus, actingUserId: string): Promise<User> {
    const user = await this.daos.users.findById(id);
    if (!user) throw new NotFoundError('USER_NOT_FOUND', `Khong tim thay nguoi dung ${id}`);

    if (status !== 'active') {
      /**
       * Lop 1 — khong tu khoa chinh minh.
       *
       * Rieng le thi lop nay khong du (hai quan tri co the khoa lan nhau),
       * nhung no chan duoc tinh huong pho bien nhat: bam nham dong cua minh
       * trong danh sach nguoi dung.
       */
      if (id === actingUserId) {
        throw new ForbiddenError('USER_CANNOT_DISABLE_SELF', 'Khong the tu vo hieu hoa tai khoan cua minh');
      }

      /**
       * Lop 2 — khong khoa quan tri HOAT DONG CUOI CUNG.
       *
       * Day moi la lop that su chan duoc "khoa het ca doi ngu": dem so tai
       * khoan `active` con lai. Neu chi con mot va do chinh la nguoi sap bi
       * khoa, thi tu choi.
       *
       * Han che: dem roi ghi khong nam trong cung mot transaction, nen hai
       * yeu cau dong thoi khoa hai quan tri cuoi cung VE LY THUYET co the
       * lot ca hai. Tren mot he thong quan tri co vai nguoi va thao tac thu
       * cong, xac suat do khong dang doi lay do phuc tap cua khoa hang. Ghi
       * lai o day de nguoi doc sau biet day la lua chon, khong phai so sot.
       */
      if (user.status === 'active' && (await this.daos.users.countActiveAdmins()) <= 1) {
        throw new ForbiddenError(
          'USER_LAST_ADMIN',
          'Khong the vo hieu hoa quan tri vien hoat dong cuoi cung',
        );
      }
    }

    await this.daos.users.setStatus(id, status);
    const after = await this.daos.users.findById(id);
    if (!after) throw new NotFoundError('USER_NOT_FOUND', `Khong tim thay nguoi dung ${id}`);
    return after;
  }

  async bootstrapFirstAdmin(input: CreateUserRequest): Promise<User> {
    // Chi chay khi kho hoan toan trong. Goi lan thu hai bi tu choi — nguoi
    // dung tiep theo phai do quan tri hien co tao.
    const existing = await this.daos.users.countActiveAdmins();
    if (existing > 0) {
      throw new ConflictError(
        'USER_BOOTSTRAP_DONE',
        'Da co tai khoan quan tri — dung chuc nang tao nguoi dung thong thuong',
      );
    }
    return this.create(input);
  }

  private assertPassword(pw: string): void {
    if (pw.length < this.minPasswordLength) {
      throw new DomainError(
        'AUTH_PASSWORD_TOO_SHORT',
        `Mat khau phai it nhat ${this.minPasswordLength} ky tu`,
        'VALIDATION_FAILED',
      );
    }
    if (pw.length > 200) {
      throw new DomainError('AUTH_PASSWORD_TOO_LONG', 'Mat khau qua dai', 'VALIDATION_FAILED');
    }
  }
}
