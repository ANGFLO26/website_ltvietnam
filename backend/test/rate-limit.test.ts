import { describe, expect, it } from 'vitest';
import { SlidingWindowLimiter } from '../src/shared/rate-limit.js';
import { HashGate } from '../src/shared/crypto/hash-gate.js';
import { Argon2Hasher } from '../src/shared/crypto/argon2.hasher.js';
import { DomainError } from '../src/shared/errors.js';

/**
 * Hai lop chan viec doi endpoint dang nhap.
 *
 * Ca hai deu KHONG can database, nen bo test nay chay trong vai chuc mili giay
 * va co the chay o moi lan luu tep. Phep do tren HTTP that (300 yeu cau dong
 * thoi) nam o `scripts/smoke-auth.mjs`; day la phan logic.
 */

describe('SlidingWindowLimiter — cua so truot', () => {
  it('cho qua den han muc roi chan', () => {
    const l = new SlidingWindowLimiter(3, 60_000);
    const t = 1_000_000;
    expect(l.check('k', t).allowed).toBe(true);
    expect(l.check('k', t + 1).allowed).toBe(true);
    expect(l.check('k', t + 2).allowed).toBe(true);
    expect(l.check('k', t + 3).allowed).toBe(false);
  });

  it('khoa KHAC nhau dem rieng', () => {
    const l = new SlidingWindowLimiter(1, 60_000);
    expect(l.check('a').allowed).toBe(true);
    expect(l.check('b').allowed).toBe(true);
    expect(l.check('a').allowed).toBe(false);
  });

  it('CUA SO TRUOT khong co ke ho o ranh gioi', () => {
    /**
     * Day la ly do khong dung cua so co dinh.
     *
     * Cua so co dinh: 3 lan o giay cuoi cua so nay + 3 lan o giay dau cua so
     * sau = 6 lan trong hai giay, gap doi han muc. Cua so truot tinh theo moc
     * cua tung lan nen khong co ranh gioi de loi dung.
     */
    const l = new SlidingWindowLimiter(3, 10_000);
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) l.check('k', t + 9_000 + i);
    // Sang "cua so sau" theo cach nghi cua so co dinh — van phai bi chan
    expect(l.check('k', t + 10_100).allowed).toBe(false);
    // Chi khi ba lan cu ra khoi cua so thi moi co luot
    expect(l.check('k', t + 19_500).allowed).toBe(true);
  });

  it('cho luot lai sau khi cua so troi qua, va noi ro con bao lau', () => {
    const l = new SlidingWindowLimiter(1, 10_000);
    const t = 1_000_000;
    l.check('k', t);
    const bi = l.check('k', t + 3_000);
    expect(bi.allowed).toBe(false);
    expect(bi.retryAfterSeconds).toBe(7);
    expect(l.check('k', t + 10_001).allowed).toBe(true);
  });

  it('reset xoa bo dem — day la thu lam han muc thanh "5 lan THAT BAI"', () => {
    const l = new SlidingWindowLimiter(2, 60_000);
    l.check('k'); l.check('k');
    expect(l.check('k').allowed).toBe(false);
    l.reset('k');
    expect(l.check('k').allowed).toBe(true);
  });

  it('co TRAN so khoa — khong de bo dem tro thanh duong lam dung', () => {
    /**
     * Khong co tran thi ke tan cong doi IP lien tuc lam `Map` phinh ra cho toi
     * khi het bo nho — bien chinh cong cu chong lam dung thanh mot lo hong.
     */
    const l = new SlidingWindowLimiter(5, 60_000, 100);
    for (let i = 0; i < 1000; i++) l.check(`ip-${i}`);
    expect(l.size()).toBeLessThanOrEqual(100);
  });
});

describe('HashGate — tran so lan bam cung luc', () => {
  const cho = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it('khong bao gio chay qua tran cung luc', async () => {
    const gate = new HashGate(3, 100);
    let dangChay = 0;
    let dinh = 0;
    await Promise.all(
      Array.from({ length: 40 }, () =>
        gate.run(async () => {
          dangChay += 1;
          dinh = Math.max(dinh, dangChay);
          await cho(5);
          dangChay -= 1;
        }),
      ),
    );
    expect(dinh).toBe(3);
    expect(gate.trangThai()).toEqual({ dangChay: 0, dangCho: 0 });
  });

  it('vuot ca hang doi thi TU CHOI NGAY, khong cho vo han', async () => {
    /**
     * Hang doi vo han bien "cham" thanh "treo". Nguoi dung thu that thich
     * nhan loi trong 50ms roi thu lai hon la cho 30 giay khong biet gi.
     */
    const gate = new HashGate(1, 2);
    const dangGiu = gate.run(() => cho(50));
    const xepHang = [gate.run(() => cho(50)), gate.run(() => cho(50))];
    await expect(gate.run(async () => 'khong toi luot')).rejects.toThrow(DomainError);
    await Promise.all([dangGiu, ...xepHang]);
  });

  it('loi tu ham duoc bao ve KHONG lam ket cong', async () => {
    const gate = new HashGate(1, 0);
    await expect(gate.run(async () => { throw new Error('vo'); })).rejects.toThrow('vo');
    // Neu `finally` khong giam bo dem thi loi goi sau se bi tu choi vinh vien
    await expect(gate.run(async () => 'con dung duoc')).resolves.toBe('con dung duoc');
  });
});

describe('Argon2Hasher qua cong', () => {
  it('cong day thi verify nem loi CHU KHONG tra false', async () => {
    /**
     * Day la loi toi tu tao ra roi tu bat trong chinh F-1a.
     *
     * Ban dau `try/catch` cua `verify` boc ca `gate.run(...)`, nen khi cong day
     * thi `AUTH_BUSY` bi bien thanh `false` — "he thong qua tai" doc thanh
     * "sai mat khau". Te hon: `AuthService` dem do la mot lan sai va co the
     * KHOA OAN tai khoan cua nguoi dung.
     */
    const gate = new HashGate(1, 0);
    const hasher = new Argon2Hasher(gate);
    const h = await hasher.hash('mat-khau-de-thu');

    const dangGiu = hasher.verify(h, 'mat-khau-de-thu');
    await expect(hasher.verify(h, 'mat-khau-de-thu')).rejects.toThrow(/qua tai/i);
    await dangGiu;
  });

  it('ma bam HONG van tra false — khong nem loi ra ngoai', async () => {
    const hasher = new Argon2Hasher();
    expect(await hasher.verify('khong-phai-ma-bam', 'gi-do')).toBe(false);
  });

  it('burn() CUNG di qua cong', async () => {
    /**
     * `burn()` chi de tieu thoi gian, nhung no ton dung 19 MiB va mot luong
     * threadpool nhu bam that. Bo qua no o cong thi chi chan duoc mot nua
     * duong tan cong — ma nhanh email-khong-ton-tai lai la nhanh RE NHAT
     * de doi, vi ke tan cong khong can biet email nao co that.
     */
    const gate = new HashGate(1, 0);
    const hasher = new Argon2Hasher(gate);
    const dangGiu = hasher.burn();
    await expect(hasher.burn()).rejects.toThrow(/qua tai/i);
    await dangGiu;
  });
});
