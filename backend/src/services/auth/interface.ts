export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

/** Ai dang goi — do guard dat vao request sau khi kiem the. */
export interface Principal {
  readonly userId: string;
  readonly role: string;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
  /** Chi de ghi log va khoa theo IP. KHONG dua vao the. */
  readonly ip?: string | null;
  readonly userAgent?: string | null;
}

export interface LoginResult {
  readonly token: string;
  /** Giay — de tang api dat `Max-Age` cua cookie cho khop han the. */
  readonly ttlSeconds: number;
  readonly user: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly role: string;
  };
}

export interface ChangePasswordInput {
  readonly userId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
}

export interface ResetPasswordInput {
  readonly token: string;
  readonly newPassword: string;
}

/**
 * Hop dong RA NGOAI cua module auth.
 *
 * Nguyen tac xuyen suot: KHONG cho biet mot email co ton tai hay khong.
 * Moi phuong thuc duoi day deu tuan theo, va do la ly do mot so cai tra ve
 * `void` thay vi ket qua chi tiet.
 */
export interface AuthService {
  /**
   * Nem `UnauthorizedError` VOI CUNG MOT thong bao cho moi that bai:
   * sai mat khau, email khong ton tai, tai khoan bi khoa.
   *
   * Phan biet ba truong hop se cho ke tan cong biet email nao co that va
   * tai khoan nao dang bi khoa — hai manh thong tin ho can de nham dung muc tieu.
   */
  login(input: LoginInput): Promise<LoginResult>;

  /** Kiem the phien. `null` khi the sai, het han, hoac da bi thu hoi. */
  verifySession(token: string): Promise<Principal | null>;

  /**
   * Doi mat khau. THU HOI moi phien dang mo, ke ca phien hien tai.
   *
   * Nguoi dung doi mat khau thuong vi nghi bi lo. Giu nguyen cac phien khac
   * la lam hong dung ky vong do.
   */
  changePassword(input: ChangePasswordInput): Promise<void>;

  /**
   * Tao the dat lai mat khau.
   *
   * Tra ve `null` khi email khong ton tai — nhung TANG API PHAI tra ve cung
   * mot phan hoi cho ca hai truong hop. Kieu tra ve `null` la de tang tren
   * biet co gui email hay khong, khong phai de bao cho khach.
   */
  requestPasswordReset(email: string): Promise<{
    readonly token: string;
    readonly userId: string;
    readonly email: string;
  } | null>;

  /** Dat lai mat khau bang the. The dung mot lan: dung sau khi mat khau doi. */
  resetPassword(input: ResetPasswordInput): Promise<void>;
}
