import { ConflictError, DomainError, UnauthorizedError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type {
  PasswordHasher,
  ResetTokenSigner,
  TokenSigner,
} from './crypto.port.js';
import type {
  AuthService,
  ChangePasswordInput,
  LoginInput,
  LoginResult,
  Principal,
  ResetPasswordInput,
} from './interface.js';

export type AuthDaos = DaoScope<'users'>;

export interface AuthConfig {
  readonly sessionTtlSeconds: number;
  readonly resetTtlSeconds: number;
  /** Khoa tai khoan sau bao nhieu lan sai lien tiep. */
  readonly lockAfterAttempts: number;
  readonly minPasswordLength: number;
}

/** Thong bao DUY NHAT cho moi that bai dang nhap — xem `interface.ts`. */
const LOGIN_FAILED = 'Email hoac mat khau khong dung';

/**
 * DEM LAN SAI — trong bo nho, va day la mot GIOI HAN CO THAT.
 *
 * So do v1.3 khong co bang luu so lan dang nhap sai, va them bang la doi
 * baseline (ADR-013). Nen bo dem nam trong bo nho tien trinh, keo theo hai
 * han che phai noi ro:
 *
 *   1. Chay NHIEU tien trinh thi moi tien trinh dem rieng. Ke tan cong doi
 *      qua lai giua cac tien trinh se duoc nhieu lan thu hon `lockAfterAttempts`.
 *   2. Khoi dong lai tien trinh thi bo dem ve khong.
 *
 * Cai KHONG mat: khi da cham nguong, `users.status` doi thanh `locked` trong
 * DATABASE — khoa do ben vung, khong phu thuoc tien trinh nao. Nen hau qua
 * cua han che tren la "phai thu nhieu lan hon mot chut moi bi khoa", khong
 * phai "khong bao gio bi khoa".
 *
 * Chay mot tien trinh tren may local thi han che nay khong co tac dung gi.
 * Truoc khi chay nhieu ban sao, phai chuyen bo dem sang Redis hoac them bang.
 */
class AttemptCounter {
  private readonly counts = new Map<string, { n: number; at: number }>();
  private static readonly WINDOW_MS = 15 * 60_000;

  record(key: string): number {
    const now = Date.now();
    const cur = this.counts.get(key);
    if (!cur || now - cur.at > AttemptCounter.WINDOW_MS) {
      this.counts.set(key, { n: 1, at: now });
      return 1;
    }
    cur.n += 1;
    cur.at = now;
    return cur.n;
  }

  clear(key: string): void {
    this.counts.delete(key);
  }
}

export class AuthServiceImpl implements AuthService {
  private readonly attempts = new AttemptCounter();

  constructor(
    private readonly daos: AuthDaos,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenSigner,
    private readonly resetTokens: ResetTokenSigner,
    private readonly cfg: AuthConfig,
  ) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.daos.users.findByEmailWithCredentials(email);

    /**
     * Email khong ton tai — VAN bam mot lan.
     *
     * Khong bam thi nhanh nay tra ve sau ~1ms con nhanh co that ton ~50ms.
     * Chenh lech do do duoc tu ben ngoai, va no bien form dang nhap thanh
     * mot cong cu liet ke email hop le.
     */
    if (!user) {
      await this.hasher.burn();
      throw new UnauthorizedError('AUTH_INVALID_CREDENTIALS', LOGIN_FAILED);
    }

    /**
     * Tai khoan bi khoa hoac vo hieu hoa — CUNG mot thong bao.
     *
     * Noi "tai khoan cua ban dang bi khoa" la xac nhan email do co that.
     * Nguoi dung that se lien he quan tri; ke tan cong khong hoc duoc gi.
     */
    if (user.status !== 'active') {
      await this.hasher.burn();
      throw new UnauthorizedError('AUTH_INVALID_CREDENTIALS', LOGIN_FAILED);
    }

    const ok = await this.hasher.verify(user.passwordHash, input.password);
    if (!ok) {
      const n = this.attempts.record(email);
      if (n >= this.cfg.lockAfterAttempts) {
        // Khoa nay nam trong DATABASE nen ben vung qua khoi dong lai.
        await this.daos.users.setStatus(user.id, 'locked');
      }
      throw new UnauthorizedError('AUTH_INVALID_CREDENTIALS', LOGIN_FAILED);
    }

    this.attempts.clear(email);
    const at = new Date();
    await this.daos.users.updateLastLogin(user.id, at);

    const token = await this.tokens.sign(
      { sub: user.id, role: user.role, pwd: pwdStamp(user.passwordChangedAt, user.createdAt) },
      this.cfg.sessionTtlSeconds,
    );

    return {
      token,
      ttlSeconds: this.cfg.sessionTtlSeconds,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  /**
   * Kiem the — BA lop, va lop thu ba la thu khong the bo.
   *
   *   1. chu ky va han the (do `TokenSigner` lam)
   *   2. nguoi dung con ton tai va con `active`
   *   3. `pwd` trong the con khop `password_changed_at` trong database
   *
   * Lop 3 la co che thu hoi. Bo no thi doi mat khau khong duoi duoc ke dang
   * giu the cu ra khoi he thong — va do dung la ly do nguoi ta doi mat khau.
   */
  async verifySession(token: string): Promise<Principal | null> {
    const claims = await this.tokens.verify(token);
    if (!claims) return null;

    const user = await this.daos.users.findById(claims.sub);
    if (!user || user.status !== 'active') return null;

    if (claims.pwd !== pwdStamp(user.passwordChangedAt, user.createdAt)) return null;

    return { userId: user.id, role: user.role };
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    const user = await this.daos.users.findById(input.userId);
    if (!user) throw new UnauthorizedError('AUTH_INVALID_CREDENTIALS', LOGIN_FAILED);

    const creds = await this.daos.users.findByEmailWithCredentials(user.email);
    if (!creds) throw new UnauthorizedError('AUTH_INVALID_CREDENTIALS', LOGIN_FAILED);

    // Kiem mat khau HIEN TAI: the phien bi danh cap van khong doi duoc
    // mat khau neu ke cap khong biet mat khau cu.
    if (!(await this.hasher.verify(creds.passwordHash, input.currentPassword))) {
      throw new UnauthorizedError('AUTH_CURRENT_PASSWORD_WRONG', 'Mat khau hien tai khong dung');
    }

    this.assertPasswordStrong(input.newPassword);

    // Mat khau moi trung mat khau cu la khong doi gi ca — va nguoi dung
    // thuong doi mat khau vi nghi bi lo.
    if (await this.hasher.verify(creds.passwordHash, input.newPassword)) {
      throw new ConflictError('AUTH_PASSWORD_UNCHANGED', 'Mat khau moi phai khac mat khau cu');
    }

    const hash = await this.hasher.hash(input.newPassword);
    // `passwordChangedAt` doi -> moi the da phat truoc do het hieu luc.
    await this.daos.users.updatePassword(user.id, hash, new Date());
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ token: string; userId: string } | null> {
    const user = await this.daos.users.findByEmail(email.trim().toLowerCase());
    // `null` khong phai la loi — tang api van tra ve 200 nhu binh thuong.
    if (!user || user.status === 'disabled') return null;

    const token = await this.resetTokens.sign(
      { sub: user.id, pwd: pwdStamp(user.passwordChangedAt, user.createdAt) },
      this.cfg.resetTtlSeconds,
    );
    return { token, userId: user.id };
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const claims = await this.resetTokens.verify(input.token);
    if (!claims) {
      throw new UnauthorizedError('AUTH_RESET_TOKEN_INVALID', 'Lien ket khong hop le hoac da het han');
    }

    const user = await this.daos.users.findById(claims.sub);
    if (!user || user.status === 'disabled') {
      throw new UnauthorizedError('AUTH_RESET_TOKEN_INVALID', 'Lien ket khong hop le hoac da het han');
    }

    /**
     * THE DUNG MOT LAN, khong can bang danh sach da dung.
     *
     * The mang theo `password_changed_at` luc phat. Sau lan dat lai dau tien,
     * moc do doi, nen chinh cai the vua dung tro thanh khong hop le. Mot
     * lien ket bi chuyen tiep hoac con trong hop thu cung khong dung lai duoc.
     */
    if (claims.pwd !== pwdStamp(user.passwordChangedAt, user.createdAt)) {
      throw new UnauthorizedError('AUTH_RESET_TOKEN_USED', 'Lien ket da duoc su dung');
    }

    this.assertPasswordStrong(input.newPassword);

    const hash = await this.hasher.hash(input.newPassword);
    await this.daos.transaction(async (tx) => {
      await tx.users.updatePassword(user.id, hash, new Date());
      /**
       * Dat lai mat khau MO KHOA tai khoan.
       *
       * Tai khoan bi khoa vi go sai nhieu lan; chung minh duoc quyen truy cap
       * hop thu la du de mo. Khong mo thi nguoi dung dat lai mat khau xong
       * van khong vao duoc, va khong hieu tai sao.
       */
      if (user.status === 'locked') await tx.users.setStatus(user.id, 'active');
    });
  }

  /**
   * Do dai la yeu cau DUY NHAT.
   *
   * Khong ep "phai co chu hoa, so, ky tu dac biet": nhung quy tac do day
   * nguoi dung toi `Matkhau@123` — ngan, doan duoc, va thoa het dieu kien.
   * Mot cau dai de nho manh hon nhieu. Day cung la khuyen nghi hien tai cua
   * NIST (SP 800-63B).
   */
  private assertPasswordStrong(pw: string): void {
    if (pw.length < this.cfg.minPasswordLength) {
      throw new DomainError(
        'AUTH_PASSWORD_TOO_SHORT',
        `Mat khau phai it nhat ${this.cfg.minPasswordLength} ky tu`,
        'VALIDATION_FAILED',
      );
    }
    if (pw.length > 200) {
      // Chan tu choi dich vu qua mat khau dai: Argon2 bam chuoi 1 MB rat lau.
      throw new DomainError('AUTH_PASSWORD_TOO_LONG', 'Mat khau qua dai', 'VALIDATION_FAILED');
    }
  }
}

/**
 * Moc thu hoi, tinh bang MILI GIAY.
 *
 * Ban dau toi lam tron xuong GIAY, voi ly do "`exp`/`iat` cua JWT tinh bang
 * giay nen cho dong bo". Ly do do sai, va no che mot lo hong that:
 *
 *   tao tai khoan -> dang nhap -> doi mat khau, tat ca trong CUNG MOT GIAY
 *   => `created_at` va `password_changed_at` lam tron ra cung mot so
 *   => moc khong doi => phien cu VAN SONG sau khi doi mat khau
 *
 * Ba bai kiem do vi cho nay, va chung do dung. Kich ban khong he hiem: tai
 * khoan quan tri dau tien duoc tao roi buoc doi mat khau ngay — dung la
 * chuoi thao tac tren, va no chay trong vai chuc mili giay.
 *
 * `pwd` la truong cua rieng ta, khong phai `exp`/`iat`, nen khong co rang
 * buoc nao bat no phai tinh bang giay. So mili giay van la so nguyen chinh
 * xac trong JavaScript den tan nam 287396.
 *
 * Tai khoan chua bao gio doi mat khau thi `password_changed_at` la NULL —
 * dung `created_at` lam moc. Dung `0` se lam moi tai khoan moi co chung mot
 * moc, va khong phan biet duoc the phat truoc hay sau khi tai khoan bi tao lai.
 */
function pwdStamp(passwordChangedAt: Date | null, createdAt: Date): number {
  return (passwordChangedAt ?? createdAt).getTime();
}
