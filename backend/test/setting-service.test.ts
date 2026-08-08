import { beforeEach, describe, expect, it } from 'vitest';
import { SettingServiceImpl, type SettingDaos } from '../src/services/settings/service.js';
import type { SettingDao } from '../src/dao/settings/dao.interface.js';
import {
  MASKED_VALUE,
  type Setting,
  type SettingValueType,
  type UpsertSettingInput,
} from '../src/dao/settings/object.js';
import { DomainError } from '../src/shared/errors.js';

/**
 * `SettingService` — truoc F-1d KHONG CO MOT TEST NAO.
 *
 * Luat quan trong nhat o day: gui lai dung chuoi che (`********`) thi KHONG
 * duoc ghi de. Man hinh quan tri hien `********` o o mat khau SMTP; nguoi dung
 * sua mot o khac roi bam Luu, va CA form duoc gui di. Khong chan thi mat khau
 * SMTP that bi thay bang tam dau sao, va email ngung gui — mot loi khong ai lan
 * ra tu trieu chung.
 */

class SettingDaoGia implements SettingDao {
  rows: Setting[] = [];
  daGhi: UpsertSettingInput[] = [];

  async findByGroup(group: string): Promise<Setting[]> {
    return this.rows.filter((s) => s.group === group);
  }
  async findOne(group: string, key: string): Promise<Setting | null> {
    return this.rows.find((s) => s.group === group && s.key === key) ?? null;
  }
  async findPublic(): Promise<Setting[]> {
    return this.rows.filter((s) => s.isPublic);
  }
  async upsert(input: UpsertSettingInput): Promise<Setting> {
    this.daGhi.push(input);
    const i = this.rows.findIndex((s) => s.group === input.group && s.key === input.key);
    const day: Setting =
      i >= 0
        ? { ...this.rows[i]!, value: input.value }
        : {
            id: `s${this.rows.length + 1}`, group: input.group, key: input.key,
            value: input.value, valueType: 'string', isPublic: false, isEncrypted: false,
          };
    if (i >= 0) this.rows[i] = day;
    else this.rows.push(day);
    return day;
  }

  seed(s: Partial<Setting> & { group: string; key: string }): Setting {
    const day: Setting = {
      id: `s${this.rows.length + 1}`, value: null, valueType: 'string' as SettingValueType,
      isPublic: false, isEncrypted: false, ...s,
    };
    this.rows.push(day);
    return day;
  }
}

let dao: SettingDaoGia;
let svc: SettingServiceImpl;

beforeEach(() => {
  dao = new SettingDaoGia();
  svc = new SettingServiceImpl({ settings: dao } as unknown as SettingDaos);
});

const bat = async (fn: () => Promise<unknown>): Promise<DomainError> => {
  try {
    await fn();
  } catch (e) {
    if (e instanceof DomainError) return e;
    throw e;
  }
  throw new Error('mong doi mot DomainError');
};

describe('che secret', () => {
  it('listGroup che gia tri cua setting duoc danh dau ma hoa', async () => {
    dao.seed({ group: 'email', key: 'smtp_password', value: 'bi-mat-that', isEncrypted: true });
    dao.seed({ group: 'email', key: 'smtp_host', value: 'smtp.vd.local' });
    const ra = await svc.listGroup('email');
    const mk = ra.find((s) => s.key === 'smtp_password')!;
    expect(mk.value).toBe(MASKED_VALUE);
    expect(mk.masked).toBe(true);
    // Setting binh thuong KHONG bi che — che het thi man hinh quan tri vo dung.
    expect(ra.find((s) => s.key === 'smtp_host')!.value).toBe('smtp.vd.local');
  });

  it('`valueType = encrypted` cung bi che, khong chi co `isEncrypted`', async () => {
    /**
     * Hai duong danh dau mot secret, va `mask` xet CA HAI. Neu chi xet
     * `isEncrypted` thi mot hang khai `value_type = 'encrypted'` ma quen dat co
     * se lo gia tri that.
     */
    dao.seed({ group: 'x', key: 'k', value: 'bi-mat', valueType: 'encrypted' });
    expect((await svc.listGroup('x'))[0]!.value).toBe(MASKED_VALUE);
  });

  it('secret RONG che thanh null, khong thanh `********`', async () => {
    /**
     * Khac biet nay co that: `********` noi "co gia tri, khong cho xem", con
     * `null` noi "chua dat". Man hinh quan tri can phan biet de biet co phai
     * cau hinh con thieu hay khong.
     */
    dao.seed({ group: 'email', key: 'smtp_password', value: null, isEncrypted: true });
    const ra = (await svc.listGroup('email'))[0]!;
    expect(ra.value).toBeNull();
    expect(ra.masked).toBe(true);
  });

  it('listPublic che MOT LAN NUA du DAO da loc', async () => {
    /**
     * Ve ly thuyet mot setting khong the vua `is_public` vua `is_encrypted`.
     * Nhung dieu do do DU LIEU bao dam chu khong phai rang buoc — mot dong
     * `UPDATE` sua tay la du de pha. DAO gia o day dung dung trang thai "khong
     * nen ton tai" do, va service phai van che.
     */
    dao.seed({ group: 'email', key: 'smtp_password', value: 'bi-mat', isPublic: true, isEncrypted: true });
    expect((await svc.listPublic())[0]!.value).toBe(MASKED_VALUE);
  });

  it('readSecret tra gia tri THAT — day la duong duy nhat lay duoc', async () => {
    dao.seed({ group: 'email', key: 'smtp_password', value: 'bi-mat-that', isEncrypted: true });
    expect((await svc.readSecret('email', 'smtp_password'))!.value).toBe('bi-mat-that');
  });
});

describe('update', () => {
  it('khoa khong co trong ban khoi tao -> NOT_FOUND', async () => {
    /**
     * Chi sua duoc setting DA CO. Ma nguon doc setting bang khoa co dinh
     * (`company.short_name`); cho tao khoa moi qua API nghia la nguoi dung go
     * duoc mot khoa khong ai doc, roi thac mac tai sao doi ma khong thay gi.
     */
    const e = await bat(() => svc.update('company', 'khoa-bua', 'x'));
    expect(e.kind).toBe('NOT_FOUND');
    expect(e.code).toBe('SETTING_UNKNOWN_KEY');
    expect(dao.daGhi).toEqual([]);
  });

  it('GUI LAI CHUOI CHE thi KHONG ghi de — luat quan trong nhat o day', async () => {
    dao.seed({ group: 'email', key: 'smtp_password', value: 'bi-mat-that', isEncrypted: true });
    const ra = await svc.update('email', 'smtp_password', MASKED_VALUE);

    // Khang dinh manh hon "gia tri con dung": KHONG CO lenh ghi nao chay ca.
    expect(dao.daGhi).toEqual([]);
    expect((await svc.readSecret('email', 'smtp_password'))!.value).toBe('bi-mat-that');
    expect(ra.value).toBe(MASKED_VALUE);
    expect(ra.masked).toBe(true);
  });

  it('gia tri MOI that su thi CO ghi de', async () => {
    dao.seed({ group: 'email', key: 'smtp_password', value: 'cu', isEncrypted: true });
    const ra = await svc.update('email', 'smtp_password', 'moi-that');
    expect(dao.daGhi).toHaveLength(1);
    expect((await svc.readSecret('email', 'smtp_password'))!.value).toBe('moi-that');
    // Phan hoi van bi che, du vua ghi thanh cong.
    expect(ra.value).toBe(MASKED_VALUE);
  });

  it('XOA secret bang null thi ghi that', async () => {
    // `null` khac `********`: mot cai la "khong doi", mot cai la "xoa di".
    dao.seed({ group: 'email', key: 'smtp_password', value: 'cu', isEncrypted: true });
    await svc.update('email', 'smtp_password', null);
    expect(dao.daGhi).toEqual([{ group: 'email', key: 'smtp_password', value: null }]);
  });

  it('setting KHONG ma hoa dat dung chuoi `********` thi VAN ghi', async () => {
    /**
     * Cho bo qua chi ap cho setting ma hoa. Mot setting thuong — vd
     * `company.short_name` — hoan toan co the co gia tri la tam dau sao, va
     * chan no se la mot hanh vi kho hieu.
     */
    dao.seed({ group: 'company', key: 'short_name', value: 'LTV' });
    await svc.update('company', 'short_name', MASKED_VALUE);
    expect(dao.daGhi).toHaveLength(1);
    expect((await svc.readSecret('company', 'short_name'))!.value).toBe(MASKED_VALUE);
  });

  it('HAN CHE co that: khong the dat secret thanh dung chuoi `********`', async () => {
    /**
     * Ghi lai thay vi im lang. Neu ai do that su muon mat khau SMTP la tam dau
     * sao thi khong lam duoc qua API — yeu cau se bi hieu la "khong doi gi".
     *
     * Danh doi nay dung: mat mot mat khau vo nghia con hon ghi de mot mat khau
     * that. Nhung no la mot han che, khong phai mot tinh nang.
     */
    dao.seed({ group: 'email', key: 'smtp_password', value: 'cu', isEncrypted: true });
    await svc.update('email', 'smtp_password', MASKED_VALUE);
    expect((await svc.readSecret('email', 'smtp_password'))!.value).toBe('cu');
  });
});
