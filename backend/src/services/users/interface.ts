import type { User, UserStatus } from '../../dao/users/object.js';

export const USER_SERVICE = Symbol('USER_SERVICE');

export interface CreateUserRequest {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export interface UserService {
  list(
    filter: { readonly status?: UserStatus; readonly search?: string },
    page: {
      readonly page: number;
      readonly pageSize: number;
    },
  ): Promise<{
    readonly items: readonly User[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
  }>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserRequest): Promise<User>;

  /**
   * Doi trang thai tai khoan.
   *
   * CHAN vo hieu hoa hoac khoa quan tri vien HOAT DONG CUOI CUNG. Khong chan
   * thi mot cu bam nham se khoa toan bo doi ngu ra khoi he thong, va cach duy
   * nhat de vao lai la sua thang trong database.
   */
  setStatus(id: string, status: UserStatus, actingUserId: string): Promise<User>;

  /**
   * Tao quan tri vien DAU TIEN.
   *
   * Ban khoi tao co y KHONG tao tai khoan nao: mat khau co dinh trong seed la
   * mot lo hong — no nam trong ma nguon, trong lich su git, va trong moi ban
   * sao cua kho ma. Tai khoan dau tien phai duoc tao bang mot thao tac co y
   * thuc, mot lan, va chi khi CHUA co tai khoan nao.
   */
  bootstrapFirstAdmin(input: CreateUserRequest): Promise<User>;
}
