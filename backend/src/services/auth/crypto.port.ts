/**
 * CONG MAT MA — tang service khai bao CAN GI, khong biet AI lam.
 *
 * Vi sao tach cong: `AuthService` khong duoc biet Argon2 hay `jose` la gi.
 * Ba ly do cu the, khong phai nguyen tac chung:
 *
 *   1. Test `AuthService` khong phai bam mat khau that. Argon2id co y cham
 *      (~50ms mot lan); mot bo test co 30 lan dang nhap se ton 1.5 giay chi
 *      de bam. Ban gia trong test chay tuc thi.
 *   2. Doi tham so Argon2 (bo nho, so vong) la viec van hanh, khong phai
 *      viec nghiep vu. No chi cham mot file.
 *   3. Neu mai nay doi sang thu vien khac — hoac Argon2 co lo hong — thi
 *      chi mot adapter phai sua.
 */

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
export const TOKEN_SIGNER = Symbol('TOKEN_SIGNER');

export interface PasswordHasher {
  hash(plain: string): Promise<string>;

  /**
   * So khop mat khau voi ma bam.
   *
   * PHAI tra `false` thay vi nem loi khi ma bam hong hoac sai dinh dang:
   * mot ban ghi hong khong duoc bien thanh loi 500 lo ra rang tai khoan do
   * co ton tai.
   */
  verify(hash: string, plain: string): Promise<boolean>;

  /**
   * Bam mot chuoi rac de tieu ton thoi gian tuong duong mot lan xac thuc that.
   *
   * Day la cach chan DO TAI KHOAN qua thoi gian phan hoi: neu email khong ton
   * tai ma tra ve ngay, con email co that phai doi 50ms bam, thi ke tan cong
   * do duoc danh sach email chi bang cach bam gio. Goi ham nay o nhanh
   * "khong tim thay" de hai nhanh ton thoi gian nhu nhau.
   */
  burn(): Promise<void>;
}

/** Noi dung ben trong the phien. Khong chua thong tin nhay cam. */
export interface SessionClaims {
  readonly sub: string;
  readonly role: string;
  /**
   * `password_changed_at` luc phat the, tinh bang giay.
   *
   * Day la co che THU HOI PHIEN, va no khong can bang nao ca: doi mat khau
   * lam moi the da phat truoc do het hieu luc, vi moc trong the se cu hon
   * moc trong database. Mot danh sach den se can bang moi, can don dep, va
   * can dong bo giua cac tien trinh — bo ba van de doi lay dung mot tinh nang
   * ma cot san co da lam duoc.
   */
  readonly pwd: number;
}

export interface TokenSigner {
  sign(claims: SessionClaims, ttlSeconds: number): Promise<string>;
  /** `null` khi the sai chu ky, het han, hoac sai dinh dang. Khong nem loi. */
  verify(token: string): Promise<SessionClaims | null>;
}

/**
 * The dat lai mat khau — ky bang BI MAT RIENG, khong dung chung voi the phien.
 *
 * Neu dung chung mot bi mat thi mot the dat lai mat khau bi lo se doi duoc
 * thanh the phien va nguoc lai. Hai muc dich, hai bi mat.
 */
export interface ResetClaims {
  readonly sub: string;
  readonly pwd: number;
}

export interface ResetTokenSigner {
  sign(claims: ResetClaims, ttlSeconds: number): Promise<string>;
  verify(token: string): Promise<ResetClaims | null>;
}
