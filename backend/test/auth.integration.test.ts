import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { AuthServiceImpl } from '../src/services/auth/service.js';
import { Argon2Hasher } from '../src/shared/crypto/argon2.hasher.js';
import { JwtResetSigner, JwtSessionSigner } from '../src/shared/crypto/jwt.signer.js';
import type { PasswordHasher } from '../src/services/auth/crypto.port.js';
import { ConflictError, DomainError, UnauthorizedError } from '../src/shared/errors.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

/**
 * Bam GIA cho test.
 *
 * Argon2id co y cham (~50ms). Bo test nay co hon 30 lan xac thuc; dung bam
 * that thi ton them vai giay MOI LAN chay, va do la thu lam nguoi ta ngung
 * chay test. Bam that duoc kiem rieng o cuoi file, mot lan.
 */
class FakeHasher implements PasswordHasher {
  burns = 0;
  async hash(plain: string): Promise<string> { return `fake:${plain}`; }
  async verify(h: string, plain: string): Promise<boolean> { return h === `fake:${plain}`; }
  async burn(): Promise<void> { this.burns += 1; }
}

run('AuthService tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  let auth: AuthServiceImpl;
  let hasher: FakeHasher;
  const tag = `au-${Date.now()}`;
  const SECRET = 'x'.repeat(40);
  const RESET_SECRET = 'y'.repeat(40);

  const email = (k: string) => `${tag}-${k}@example.com`;

  const mkUser = async (k: string, password = 'mat-khau-du-dai-de-dung') => {
    const u = await daos.users.insert({
      name: `Nguoi ${k}`, email: email(k), passwordHash: `fake:${password}`,
    });
    return u;
  };

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, options: '-c search_path=ltv,public' });
    daos = createDaoManager(createKysely(pool));
    hasher = new FakeHasher();
    auth = new AuthServiceImpl(
      daos, hasher,
      new JwtSessionSigner(SECRET), new JwtResetSigner(RESET_SECRET),
      { sessionTtlSeconds: 8 * 3600, resetTtlSeconds: 1800, lockAfterAttempts: 3, minPasswordLength: 12 },
    );
  });
  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.users WHERE email LIKE $1`, [`${tag}-%`]);
    await pool.end();
  });

  // ══════════════════ dang nhap ══════════════════

  it('dang nhap dung thi tra ve the va cap nhat lan dang nhap cuoi', async () => {
    const u = await mkUser('ok');
    const r = await auth.login({ email: u.email, password: 'mat-khau-du-dai-de-dung' });
    expect(r.token).toBeTruthy();
    expect(r.user.id).toBe(u.id);
    expect(r.ttlSeconds).toBe(8 * 3600);
    expect((await daos.users.findById(u.id))!.lastLoginAt).not.toBeNull();
  });

  it('email khong phan biet hoa thuong va bo khoang trang', async () => {
    const u = await mkUser('hoa-thuong');
    const r = await auth.login({
      email: `  ${u.email.toUpperCase()}  `, password: 'mat-khau-du-dai-de-dung',
    });
    expect(r.user.id).toBe(u.id);
  });

  /**
   * BA nhanh that bai, MOT thong bao.
   *
   * Phan biet chung se cho ke tan cong biet email nao co that va tai khoan
   * nao dang bi khoa — hai manh thong tin ho can de nham dung muc tieu.
   */
  it('email khong ton tai, sai mat khau, tai khoan khoa — CUNG mot thong bao', async () => {
    const u = await mkUser('ba-nhanh');
    const messages: string[] = [];

    for (const attempt of [
      { email: email('khong-ton-tai'), password: 'gi-cung-duoc-12' },
      { email: u.email, password: 'sai-mat-khau-roi' },
    ]) {
      try { await auth.login(attempt); } catch (e) { messages.push((e as Error).message); }
    }

    await daos.users.setStatus(u.id, 'locked');
    try {
      await auth.login({ email: u.email, password: 'mat-khau-du-dai-de-dung' });
    } catch (e) { messages.push((e as Error).message); }

    expect(messages).toHaveLength(3);
    expect(new Set(messages).size, `ba nhanh phai cung mot thong bao: ${messages}`).toBe(1);
  });

  it('email khong ton tai VAN bam mot lan — chong do qua thoi gian', async () => {
    // Khong bam thi nhanh nay tra ve sau ~1ms con nhanh co that ton ~50ms,
    // va chenh lech do bien form dang nhap thanh cong cu liet ke email.
    const truoc = hasher.burns;
    await expect(auth.login({ email: email('ma'), password: 'gi-cung-duoc-12' }))
      .rejects.toThrow(UnauthorizedError);
    expect(hasher.burns).toBe(truoc + 1);
  });

  it('tai khoan bi khoa cung bam — khong ro ri qua thoi gian', async () => {
    const u = await mkUser('khoa-bam');
    await daos.users.setStatus(u.id, 'locked');
    const truoc = hasher.burns;
    await expect(auth.login({ email: u.email, password: 'mat-khau-du-dai-de-dung' }))
      .rejects.toThrow(UnauthorizedError);
    expect(hasher.burns).toBe(truoc + 1);
  });

  it('sai lien tiep du so lan thi tai khoan bi KHOA TRONG DATABASE', async () => {
    const u = await mkUser('bi-khoa');
    for (let i = 0; i < 3; i++) {
      await expect(auth.login({ email: u.email, password: 'sai-mat-khau-roi' }))
        .rejects.toThrow(UnauthorizedError);
    }
    // Khoa nay ben vung qua khoi dong lai tien trinh — khac voi bo dem trong RAM
    expect((await daos.users.findById(u.id))!.status).toBe('locked');

    // Va mat khau DUNG cung khong vao duoc nua
    await expect(auth.login({ email: u.email, password: 'mat-khau-du-dai-de-dung' }))
      .rejects.toThrow(UnauthorizedError);
  });

  it('dang nhap thanh cong XOA bo dem — sai vai lan roi dung thi khong bi khoa', async () => {
    const u = await mkUser('reset-dem');
    await expect(auth.login({ email: u.email, password: 'sai-1-lan-roi-day' })).rejects.toThrow();
    await auth.login({ email: u.email, password: 'mat-khau-du-dai-de-dung' });

    // Hai lan sai nua — chua du ba vi bo dem da ve khong
    for (let i = 0; i < 2; i++) {
      await expect(auth.login({ email: u.email, password: 'sai-mat-khau-roi' })).rejects.toThrow();
    }
    expect((await daos.users.findById(u.id))!.status).toBe('active');
  });

  // ══════════════════ kiem the ══════════════════

  it('the hop le tra ve dung nguoi goi', async () => {
    const u = await mkUser('the-tot');
    const { token } = await auth.login({ email: u.email, password: 'mat-khau-du-dai-de-dung' });
    expect(await auth.verifySession(token)).toEqual({ userId: u.id, role: 'admin' });
  });

  it('the rac, the rong, the ky bang bi mat KHAC — deu la null', async () => {
    expect(await auth.verifySession('rac')).toBeNull();
    expect(await auth.verifySession('')).toBeNull();

    const keNgoai = new JwtSessionSigner('z'.repeat(40));
    const gia = await keNgoai.sign({ sub: crypto.randomUUID(), role: 'admin', pwd: 1 }, 3600);
    expect(await auth.verifySession(gia)).toBeNull();
  });

  it('the DAT LAI MAT KHAU khong dung duoc lam the phien', async () => {
    // Hai loai the deu ky HS256. Khong co `aud` phan biet thi mot the dat lai
    // mat khau se dung duoc de dang nhap neu ai do cau hinh chung bi mat.
    const u = await mkUser('nham-the');
    const r = await auth.requestPasswordReset(u.email);
    expect(await auth.verifySession(r!.token)).toBeNull();
  });

  it('the het han tra ve null', async () => {
    const u = await mkUser('het-han');
    const ngan = new AuthServiceImpl(
      daos, hasher, new JwtSessionSigner(SECRET), new JwtResetSigner(RESET_SECRET),
      { sessionTtlSeconds: -1, resetTtlSeconds: 1800, lockAfterAttempts: 3, minPasswordLength: 12 },
    );
    const { token } = await ngan.login({ email: u.email, password: 'mat-khau-du-dai-de-dung' });
    expect(await auth.verifySession(token)).toBeNull();
  });

  it('tai khoan bi vo hieu hoa thi the dang mo NGUNG hieu luc ngay', async () => {
    const u = await mkUser('vo-hieu');
    const { token } = await auth.login({ email: u.email, password: 'mat-khau-du-dai-de-dung' });
    expect(await auth.verifySession(token)).not.toBeNull();

    await daos.users.setStatus(u.id, 'disabled');
    // Khong doi den khi the het han: cho nghi viec luc 9 gio ma the con song
    // toi 5 gio chieu la khong chap nhan duoc.
    expect(await auth.verifySession(token)).toBeNull();
  });

  // ══════════════════ doi mat khau va thu hoi phien ══════════════════

  it('DOI MAT KHAU thu hoi MOI phien dang mo', async () => {
    const u = await mkUser('doi-mk');
    const a = await auth.login({ email: u.email, password: 'mat-khau-du-dai-de-dung' });
    const b = await auth.login({ email: u.email, password: 'mat-khau-du-dai-de-dung' });
    expect(await auth.verifySession(a.token)).not.toBeNull();
    expect(await auth.verifySession(b.token)).not.toBeNull();

    await auth.changePassword({
      userId: u.id,
      currentPassword: 'mat-khau-du-dai-de-dung',
      newPassword: 'mat-khau-hoan-toan-moi',
    });

    // Nguoi dung doi mat khau thuong vi nghi bi lo. Giu nguyen cac phien
    // khac la lam hong dung ky vong do.
    expect(await auth.verifySession(a.token)).toBeNull();
    expect(await auth.verifySession(b.token)).toBeNull();

    // Va mat khau moi dung duoc
    await expect(auth.login({ email: u.email, password: 'mat-khau-hoan-toan-moi' }))
      .resolves.toBeTruthy();
  });

  it('doi mat khau PHAI biet mat khau cu', async () => {
    const u = await mkUser('mk-cu');
    await expect(auth.changePassword({
      userId: u.id, currentPassword: 'doan-mo-ho-day', newPassword: 'mat-khau-hoan-toan-moi',
    })).rejects.toThrow(UnauthorizedError);
    // The phien bi danh cap van khong doi duoc mat khau
  });

  it('mat khau moi khong duoc trung mat khau cu', async () => {
    const u = await mkUser('trung-mk');
    await expect(auth.changePassword({
      userId: u.id,
      currentPassword: 'mat-khau-du-dai-de-dung',
      newPassword: 'mat-khau-du-dai-de-dung',
    })).rejects.toThrow(ConflictError);
  });

  it('mat khau qua ngan bi tu choi, do dai la yeu cau duy nhat', async () => {
    const u = await mkUser('ngan');
    await expect(auth.changePassword({
      userId: u.id, currentPassword: 'mat-khau-du-dai-de-dung', newPassword: 'ngan',
    })).rejects.toThrow(DomainError);

    // Khong ep chu hoa/so/ky tu dac biet: mot cau dai de nho manh hon
    // `Matkhau@123` (NIST SP 800-63B)
    await expect(auth.changePassword({
      userId: u.id,
      currentPassword: 'mat-khau-du-dai-de-dung',
      newPassword: 'con meo ngoi tren mai nha',
    })).resolves.toBeUndefined();
  });

  it('mat khau qua dai bi tu choi — chan tu choi dich vu qua bam', async () => {
    const u = await mkUser('dai');
    await expect(auth.changePassword({
      userId: u.id, currentPassword: 'mat-khau-du-dai-de-dung', newPassword: 'a'.repeat(5000),
    })).rejects.toThrow(/qua dai/);
  });

  // ══════════════════ quen / dat lai mat khau ══════════════════

  it('email khong ton tai tra ve null, KHONG nem loi', async () => {
    // Nem loi se cho biet email do khong co trong he thong.
    expect(await auth.requestPasswordReset(email('khong-he-co'))).toBeNull();
  });

  it('dat lai mat khau bang the hop le', async () => {
    const u = await mkUser('dat-lai');
    const r = await auth.requestPasswordReset(u.email);
    await auth.resetPassword({ token: r!.token, newPassword: 'mat-khau-sau-khi-dat-lai' });

    await expect(auth.login({ email: u.email, password: 'mat-khau-sau-khi-dat-lai' }))
      .resolves.toBeTruthy();
  });

  it('the dat lai DUNG MOT LAN — khong can bang danh sach da dung', async () => {
    const u = await mkUser('mot-lan');
    const r = await auth.requestPasswordReset(u.email);
    await auth.resetPassword({ token: r!.token, newPassword: 'mat-khau-lan-thu-nhat' });

    // The mang theo `password_changed_at` luc phat. Sau lan dat lai dau tien,
    // moc do doi, nen chinh cai the vua dung tro thanh khong hop le.
    await expect(auth.resetPassword({ token: r!.token, newPassword: 'mat-khau-lan-thu-hai' }))
      .rejects.toThrow(/da duoc su dung/);
  });

  it('the dat lai het hieu luc khi mat khau doi bang duong khac', async () => {
    const u = await mkUser('the-cu');
    const r = await auth.requestPasswordReset(u.email);
    // Nguoi dung nho ra mat khau va tu doi truoc khi bam lien ket trong mail
    await auth.changePassword({
      userId: u.id, currentPassword: 'mat-khau-du-dai-de-dung', newPassword: 'tu-doi-mat-khau-roi',
    });
    await expect(auth.resetPassword({ token: r!.token, newPassword: 'mat-khau-tu-lien-ket' }))
      .rejects.toThrow(/da duoc su dung/);
  });

  it('DAT LAI MAT KHAU mo khoa tai khoan bi khoa', async () => {
    const u = await mkUser('mo-khoa');
    await daos.users.setStatus(u.id, 'locked');

    const r = await auth.requestPasswordReset(u.email);
    await auth.resetPassword({ token: r!.token, newPassword: 'mat-khau-moi-sau-khoa' });

    // Khong mo khoa thi nguoi dung dat lai mat khau xong van khong vao duoc,
    // va khong hieu tai sao.
    expect((await daos.users.findById(u.id))!.status).toBe('active');
    await expect(auth.login({ email: u.email, password: 'mat-khau-moi-sau-khoa' }))
      .resolves.toBeTruthy();
  });

  it('tai khoan vo hieu hoa KHONG dat lai duoc — khoa nay do quan tri dat', async () => {
    const u = await mkUser('vo-hieu-reset');
    await daos.users.setStatus(u.id, 'disabled');
    expect(await auth.requestPasswordReset(u.email)).toBeNull();
  });

  it('the dat lai rac bi tu choi', async () => {
    await expect(auth.resetPassword({ token: 'rac', newPassword: 'mat-khau-du-dai-roi' }))
      .rejects.toThrow(/khong hop le hoac da het han/);
  });
});

// ══════════════════ Argon2id THAT — kiem mot lan ══════════════════

describe('Argon2id — bam that', () => {
  const h = new Argon2Hasher();

  it('bam va so khop duoc', async () => {
    const hash = await h.hash('mat-khau-cua-toi');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await h.verify(hash, 'mat-khau-cua-toi')).toBe(true);
    expect(await h.verify(hash, 'mat-khau-khac')).toBe(false);
  });

  it('hai lan bam cung mot mat khau cho ket qua KHAC nhau', async () => {
    // Muoi ngau nhien. Neu giong nhau thi hai nguoi dung chung mat khau se
    // co cung ma bam, va lo mot cai la lo ca hai.
    const a = await h.hash('cung-mot-mat-khau');
    const b = await h.hash('cung-mot-mat-khau');
    expect(a).not.toBe(b);
    expect(await h.verify(a, 'cung-mot-mat-khau')).toBe(true);
    expect(await h.verify(b, 'cung-mot-mat-khau')).toBe(true);
  });

  it('ma bam HONG tra ve false, KHONG nem loi', async () => {
    // Nem loi o day bien thanh HTTP 500, va 500 chi xuat hien voi email co
    // that — ke tan cong doc duoc su khac biet do.
    expect(await h.verify('khong-phai-ma-bam', 'gi-do')).toBe(false);
    expect(await h.verify('', 'gi-do')).toBe(false);
  });

  it('tham so dung muc khuyen nghi cua OWASP', async () => {
    const hash = await h.hash('x');
    // 19 MiB bo nho, 2 vong, 1 luong
    expect(hash).toContain('m=19456,t=2,p=1');
  });
});
