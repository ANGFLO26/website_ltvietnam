import { hash, verify } from '@node-rs/argon2';
import type { PasswordHasher } from '../../services/auth/crypto.port.js';

/**
 * Argon2id — thuat toan bam mat khau duoc khuyen nghi hien nay.
 *
 * Tham so theo muc "moderate" cua OWASP: 19 MiB bo nho, 2 vong, 1 luong.
 * Bo nho la thu quan trong nhat — no lam cho viec bam song song tren GPU
 * dat do, va do la khac biet giua Argon2id voi bcrypt.
 *
 * Khong dat tham so vao bien moi truong: doi chung lam moi ma bam CU van
 * doc duoc (tham so nam trong chuoi bam) nhung ma bam MOI se khac, va mot
 * lan go nham se ha do kho ma khong ai thay.
 */
/**
 * `Algorithm.Argon2id` la ambient const enum — `isolatedModules` khong doc
 * duoc no luc bien dich. Dung thang gia tri so, kem ten day du de ai doc
 * cung biet day la gi.
 *   0 = Argon2d · 1 = Argon2i · 2 = Argon2id
 */
const ARGON2ID = 2;

const PARAMS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Mat khau rac dung cho `burn()`. Do dai giong mat khau that de ton thoi gian tuong duong. */
const DUMMY = 'khong-phai-mat-khau-that-chi-de-ton-thoi-gian';

export class Argon2Hasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return hash(plain, PARAMS);
  }

  async verify(h: string, plain: string): Promise<boolean> {
    try {
      return await verify(h, plain, PARAMS);
    } catch {
      /**
       * Ma bam hong hoac sai dinh dang -> `false`, KHONG nem loi.
       *
       * Nem loi o day bien thanh HTTP 500, va 500 chi xuat hien voi email co
       * that (email khong ton tai thi khong co ma bam de hong). Ke tan cong
       * doc duoc su khac biet do.
       */
      return false;
    }
  }

  async burn(): Promise<void> {
    await hash(DUMMY, PARAMS);
  }
}
