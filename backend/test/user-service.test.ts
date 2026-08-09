import { beforeEach, describe, expect, it } from 'vitest';
import { UserServiceImpl, type UserDaos } from '../src/services/users/service.js';
import type { UserDao } from '../src/dao/users/dao.interface.js';
import type { CreateUserInput, User, UserStatus } from '../src/dao/users/object.js';
import type { PasswordHasher } from '../src/services/auth/crypto.port.js';
import { DomainError } from '../src/shared/errors.js';

/**
 * `UserService` — truoc F-1d KHONG CO MOT TEST NAO.
 *
 * Do la cho de nhat de bo qua: `AuthService` co 28 test vi dang nhap "nghe co
 * ve bao mat", con quan ly nguoi dung "chi la CRUD". Nhung mot trong nhung luat
 * o day — khong duoc vo hieu hoa quan tri vien hoat dong cuoi cung — la luat
 * ma neu hong thi CACH DUY NHAT de vao lai he thong la sua thang trong
 * database. Khong co gi trong ung dung cuu duoc.
 *
 * Dung DAO gia chu khong dung database: moi luat o day la luat cua tang
 * service, va DAO gia cho phep dung nhung trang thai kho dung that (dung mot
 * quan tri con lai, nguoi dung bi xoa giua hai buoc). Nhung dieu phu thuoc
 * SQL — `countActiveAdmins` dem dung khong — thuoc test tich hop.
 */

class UserDaoGia implements UserDao {
  rows: User[] = [];
  /** Ghi lai moi lan ghi de kiem "khong ghi gi ca" — chu khong chi "nem loi". */
  daGhi: string[] = [];

  private next = 1;

  async findById(id: string): Promise<User | null> {
    return this.rows.find((u) => u.id === id) ?? null;
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.rows.find((u) => u.email === email) ?? null;
  }
  async findByEmailWithCredentials(): Promise<never> {
    throw new Error('UserService khong duoc goi ham nay');
  }
  async insert(input: CreateUserInput): Promise<User> {
    this.daGhi.push(`insert:${input.email}`);
    const u: User = {
      id: `u${this.next++}`,
      name: input.name,
      email: input.email,
      role: input.role ?? 'admin',
      status: 'active',
      lastLoginAt: null,
      passwordChangedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    this.rows.push(u);
    return u;
  }
  async updateLastLogin(): Promise<void> {
    throw new Error('khong dung');
  }
  async updatePassword(): Promise<void> {
    throw new Error('khong dung');
  }
  async setStatus(id: string, status: UserStatus): Promise<void> {
    this.daGhi.push(`setStatus:${id}=${status}`);
    this.rows = this.rows.map((u) => (u.id === id ? { ...u, status } : u));
  }
  async lockActiveAdmins(): Promise<void> {}
  async countActiveAdmins(): Promise<number> {
    return this.rows.filter((u) => u.status === 'active' && u.role === 'admin').length;
  }
  async countAll(): Promise<number> {
    return this.rows.length;
  }

  /** Dung san mot nguoi dung, khong di qua `insert` (de dat trang thai tuy y). */
  seed(u: Partial<User> & { id: string }): User {
    const day: User = {
      name: 'Nguoi',
      email: `${u.id}@vd.local`,
      role: 'admin',
      status: 'active',
      lastLoginAt: null,
      passwordChangedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      ...u,
    };
    this.rows.push(day);
    return day;
  }
}

class HasherGia implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `bam:${plain}`;
  }
  async verify(): Promise<boolean> {
    throw new Error('khong dung');
  }
  async burn(): Promise<void> {
    throw new Error('khong dung');
  }
}

const MIN = 12;
const MK = 'mat-khau-du-dai-that';

let dao: UserDaoGia;
let svc: UserServiceImpl;

beforeEach(() => {
  dao = new UserDaoGia();
  const scope = {
    users: dao,
    transaction: async <T>(fn: (tx: { users: UserDao }) => Promise<T>) => fn({ users: dao }),
  };
  svc = new UserServiceImpl(scope as UserDaos, new HasherGia(), MIN);
});

const bat = async (fn: () => Promise<unknown>): Promise<DomainError> => {
  try {
    await fn();
  } catch (e) {
    if (e instanceof DomainError) return e;
    throw e;
  }
  throw new Error('mong doi mot DomainError nhung khong co loi nao');
};

describe('create', () => {
  it('chuan hoa email: bo khoang trang va ha chu', async () => {
    /**
     * Khong chuan hoa thi `Admin@LT.vn` va `admin@lt.vn` la HAI tai khoan, va
     * nguoi dung go hoa mot chu se khong dang nhap duoc vao tai khoan cua
     * chinh minh. Cot email la CITEXT nen database khong phan biet hoa thuong,
     * nhung dua vao dieu do nghia la logic dung nho mot chi tiet cua so do.
     */
    const u = await svc.create({ name: '  Tai  ', email: '  Admin@LT.VN ', password: MK });
    expect(u.email).toBe('admin@lt.vn');
    expect(u.name).toBe('Tai');
  });

  it('email da dung -> CONFLICT, va KHONG ghi gi', async () => {
    await svc.create({ name: 'A', email: 'a@vd.local', password: MK });
    dao.daGhi = [];
    const e = await bat(() => svc.create({ name: 'B', email: 'A@VD.LOCAL', password: MK }));
    expect(e.kind).toBe('CONFLICT');
    // Khang dinh quan trong hon "co nem loi": khong co ban ghi nao duoc tao.
    expect(dao.daGhi).toEqual([]);
    expect(dao.rows).toHaveLength(1);
  });

  it('mat khau ngan hon toi thieu -> VALIDATION_FAILED', async () => {
    const e = await bat(() =>
      svc.create({ name: 'A', email: 'a@vd.local', password: 'x'.repeat(MIN - 1) }),
    );
    expect(e.kind).toBe('VALIDATION_FAILED');
    expect(e.code).toBe('AUTH_PASSWORD_TOO_SHORT');
  });

  it('dai bang toi thieu thi ĐUOC — kiem dung bien, khong lech mot', async () => {
    await expect(
      svc.create({ name: 'A', email: 'a@vd.local', password: 'x'.repeat(MIN) }),
    ).resolves.toBeDefined();
  });

  it('mat khau qua dai -> VALIDATION_FAILED', async () => {
    /**
     * Tran tren khong phai de bat nguoi dung go ngan. Argon2 bam ca chuoi, nen
     * mot "mat khau" 1 MB la mot cach dot CPU ma khong can tai khoan nao.
     */
    const e = await bat(() =>
      svc.create({ name: 'A', email: 'a@vd.local', password: 'x'.repeat(201) }),
    );
    expect(e.code).toBe('AUTH_PASSWORD_TOO_LONG');
  });

  it('kiem mat khau TRUOC khi tra cuu email', async () => {
    /**
     * Thu tu nay co y nghia thuc te: kiem chuoi trong bo nho re, tra cuu
     * database thi khong. Neu tra cuu truoc thi mot ke gui mat khau rong lien
     * tuc van tao ra mot truy van moi lan.
     */
    const e = await bat(() => svc.create({ name: 'A', email: 'a@vd.local', password: 'ngan' }));
    expect(e.code).toBe('AUTH_PASSWORD_TOO_SHORT');
    expect(dao.daGhi).toEqual([]);
  });

  it('mat khau di qua ham bam, KHONG bao gio vao thang database', async () => {
    const goc = dao.insert.bind(dao);
    let daNhan = '';
    dao.insert = async (input) => {
      daNhan = input.passwordHash;
      return goc(input);
    };
    await svc.create({ name: 'A', email: 'a@vd.local', password: MK });
    expect(daNhan).toBe(`bam:${MK}`);
    expect(daNhan).not.toBe(MK);
  });
});

describe('setStatus — hai lop bao ve', () => {
  it('khong tim thay -> NOT_FOUND', async () => {
    const e = await bat(() => svc.setStatus('khong-co', 'disabled', 'u1'));
    expect(e.kind).toBe('NOT_FOUND');
  });

  it('LOP 1 — khong the tu vo hieu hoa chinh minh', async () => {
    /**
     * Rieng le thi lop nay khong du (hai quan tri co the khoa lan nhau), nhung
     * no chan tinh huong pho bien nhat: bam nham dong cua minh trong danh sach.
     */
    dao.seed({ id: 'u1' });
    dao.seed({ id: 'u2' });
    const e = await bat(() => svc.setStatus('u1', 'disabled', 'u1'));
    expect(e.code).toBe('USER_CANNOT_DISABLE_SELF');
    expect(dao.daGhi).toEqual([]);
  });

  it('LOP 2 — khong the vo hieu hoa quan tri HOAT DONG CUOI CUNG', async () => {
    /**
     * Day la luat quan trong nhat trong file nay. Neu no hong thi mot cu bam
     * khoa toan bo doi ngu ra khoi he thong, va cach duy nhat de vao lai la
     * sua thang trong database — khong co gi trong ung dung cuu duoc.
     *
     * Chu y: nguoi THUC HIEN khac nguoi bi khoa, nen Lop 1 khong che duoc
     * truong hop nay. Do la ly do phai co hai lop.
     */
    dao.seed({ id: 'u1' });
    dao.seed({ id: 'u2', status: 'disabled' });
    const e = await bat(() => svc.setStatus('u1', 'disabled', 'u2'));
    expect(e.code).toBe('USER_LAST_ADMIN');
    expect(dao.daGhi).toEqual([]);
    expect((await dao.findById('u1'))!.status).toBe('active');
  });

  it('con HAI quan tri hoat dong thi khoa duoc mot', async () => {
    dao.seed({ id: 'u1' });
    dao.seed({ id: 'u2' });
    const sau = await svc.setStatus('u1', 'disabled', 'u2');
    expect(sau.status).toBe('disabled');
  });

  it('khoa nguoi DA bi vo hieu hoa khong tinh vao "cuoi cung"', async () => {
    /**
     * `user.status === 'active'` trong dieu kien la co y: chuyen mot nguoi tu
     * `disabled` sang `locked` khong lam giam so quan tri hoat dong, nen no
     * khong duoc bi chan. Thieu dieu kien do thi thao tac vo hai nay bi tu
     * choi khi he thong chi con mot quan tri — dung luc nguoi ta can don dep.
     */
    dao.seed({ id: 'u1' });
    dao.seed({ id: 'u2', status: 'disabled' });
    const sau = await svc.setStatus('u2', 'locked', 'u1');
    expect(sau.status).toBe('locked');
  });

  it('KICH HOAT LAI khong bi hai lop chan — ke ca chinh minh', async () => {
    /**
     * Ca hai lop chi chay khi `status !== 'active'`. Mo lai mot tai khoan
     * khong bao gio lam he thong mat quan tri, nen chan no chi tao ra mot the
     * bi khoa khong can thiet.
     */
    dao.seed({ id: 'u1', status: 'disabled' });
    const sau = await svc.setStatus('u1', 'active', 'u1');
    expect(sau.status).toBe('active');
  });

  it('bi xoa giua "doc" va "ghi" -> NOT_FOUND, khong phai 500', async () => {
    /**
     * `setStatus` doc, kiem, ghi, roi doc lai. Neu ban ghi bien mat giua chung
     * thi lan doc lai tra `null`. Nem `NOT_FOUND` thay vi de `null` di ra
     * ngoai: mot `TypeError` o tang tren se thanh 500, va 500 noi "he thong
     * hong" trong khi su that la "ban ghi khong con".
     */
    dao.seed({ id: 'u1' });
    dao.seed({ id: 'u2' });
    dao.setStatus = async (id, status) => {
      dao.daGhi.push(`setStatus:${id}=${status}`);
      dao.rows = dao.rows.filter((u) => u.id !== id); // bien mat
    };
    const e = await bat(() => svc.setStatus('u1', 'disabled', 'u2'));
    expect(e.kind).toBe('NOT_FOUND');
  });
});

describe('bootstrapFirstAdmin', () => {
  it('chi chay khi CHUA co quan tri hoat dong nao', async () => {
    const u = await svc.bootstrapFirstAdmin({
      name: 'Quan tri',
      email: 'qt@vd.local',
      password: MK,
    });
    expect(u.email).toBe('qt@vd.local');
  });

  it('lan thu hai bi tu choi -> CONFLICT', async () => {
    await svc.bootstrapFirstAdmin({ name: 'A', email: 'a@vd.local', password: MK });
    const e = await bat(() =>
      svc.bootstrapFirstAdmin({ name: 'B', email: 'b@vd.local', password: MK }),
    );
    expect(e.code).toBe('USER_BOOTSTRAP_DONE');
    expect(dao.rows).toHaveLength(1);
  });

  it('van ap luat mat khau (di qua `create`)', async () => {
    const e = await bat(() =>
      svc.bootstrapFirstAdmin({ name: 'A', email: 'a@vd.local', password: 'ngan' }),
    );
    expect(e.code).toBe('AUTH_PASSWORD_TOO_SHORT');
  });
});

/**
 * LEO THANG DAC QUYEN — bo test hoi quy cho lo hong da khai thac duoc.
 *
 * `bootstrapFirstAdmin` truoc day hoi `countActiveAdmins() > 0`. Chuoi khai
 * thac chi can BIET EMAIL quan tri, khong can mat khau, va toi da chay no that
 * tren HTTP:
 *
 *   thu sai 5 lan                 -> 401 x5 roi 429
 *   trang thai tai khoan          -> locked
 *   quan tri that, mat khau DUNG  -> khong vao duoc
 *   POST /auth/bootstrap          -> 201 { "email": "ke-tan-cong@evil.test" }
 *   ke tan cong dang nhap         -> 201
 *
 * Loi khong nam o endpoint hay o han muc. No nam o CAU HOI: "con quan tri hoat
 * dong nao khong" tra loi mot chuyen khac han "he thong da khoi tao chua".
 */
describe('bootstrap — cong khong duoc mo lai', () => {
  const boot = () =>
    svc.bootstrapFirstAdmin({ name: 'Ke tan cong', email: 'ke@evil.test', password: MK });

  it('quan tri duy nhat bi LOCKED -> van tu choi', async () => {
    dao.seed({ id: 'u1', status: 'locked' });
    expect((await bat(boot)).code).toBe('USER_BOOTSTRAP_DONE');
    expect(dao.rows).toHaveLength(1);
  });

  it('quan tri duy nhat bi DISABLED -> van tu choi', async () => {
    dao.seed({ id: 'u1', status: 'disabled' });
    expect((await bat(boot)).code).toBe('USER_BOOTSTRAP_DONE');
  });

  it('MOI quan tri deu bi khoa -> van tu choi', async () => {
    dao.seed({ id: 'u1', status: 'locked' });
    dao.seed({ id: 'u2', status: 'disabled' });
    expect((await bat(boot)).code).toBe('USER_BOOTSTRAP_DONE');
  });

  it('dieu kien la BANG RONG, khong phai "co quan tri hoat dong"', async () => {
    /**
     * Phep kiem truc tiep vao nguyen nhan goc: `bootstrapFirstAdmin` phai goi
     * `countAll`, va KHONG duoc dua vao `countActiveAdmins`. Neu ai do doi lai
     * thi ba bai kiem tren do — nhung bai nay noi ro TAI SAO.
     */
    const daGoi: string[] = [];
    dao.countAll = async () => {
      daGoi.push('countAll');
      return 0;
    };
    dao.countActiveAdmins = async () => {
      daGoi.push('countActiveAdmins');
      return 0;
    };
    await svc.bootstrapFirstAdmin({ name: 'A', email: 'a@vd.local', password: MK });
    expect(daGoi).toContain('countAll');
    expect(daGoi).not.toContain('countActiveAdmins');
  });

  it('ke ca hang DA XOA MEM cung chan cong', async () => {
    /**
     * `countAll` co y khong loc `deleted_at`. Neu loc thi xoa mem quan tri cuoi
     * cung se mo lai cong — cung lo hong, chi qua mot cua khac.
     *
     * DAO gia khong mo phong `deleted_at`, nen phep kiem that nam o test tich
     * hop (`user-service.integration.test.ts`). O day chi khang dinh `countAll`
     * la ham duoc dung, va bai tren da lam viec do.
     */
    dao.seed({ id: 'u1', status: 'disabled' });
    expect((await bat(boot)).code).toBe('USER_BOOTSTRAP_DONE');
  });
});
