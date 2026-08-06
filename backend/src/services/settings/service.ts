import { DomainError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import { MASKED_VALUE, type MaskedSetting, type Setting } from '../../dao/settings/object.js';
import { mask } from '../../dao/settings/mapper.js';
import type { SettingService } from './interface.js';

export type SettingDaos = DaoScope<'settings'>;

export class SettingServiceImpl implements SettingService {
  constructor(private readonly daos: SettingDaos) {}

  async listGroup(group: string): Promise<MaskedSetting[]> {
    return (await this.daos.settings.findByGroup(group)).map(mask);
  }

  /**
   * Che MOT LAN NUA du DAO da loc `is_public`.
   *
   * Ve ly thuyet mot setting khong the vua `is_public` vua `is_encrypted`.
   * Nhung dieu do do DU LIEU bao dam chu khong phai rang buoc — mot dong
   * `UPDATE` sua tay la du de pha. Che o day ton mot vong `map`; khong che
   * thi mot ngay nao do mat khau SMTP di thang ra frontend.
   */
  async listPublic(): Promise<MaskedSetting[]> {
    return (await this.daos.settings.findPublic()).map(mask);
  }

  readSecret(group: string, key: string): Promise<Setting | null> {
    return this.daos.settings.findOne(group, key);
  }

  async update(group: string, key: string, value: string | null): Promise<MaskedSetting> {
    const existing = await this.daos.settings.findOne(group, key);

    /**
     * CHI sua duoc setting DA CO trong ban khoi tao.
     *
     * Ma nguon doc setting bang khoa co dinh (`company.short_name`). Cho tao
     * khoa moi qua API nghia la nguoi dung go duoc mot khoa khong ai doc, roi
     * thac mac tai sao doi ma khong thay gi. Khoa moi phai di kem ma nguon
     * doc no, nen no thuoc ve migration.
     */
    if (!existing) {
      throw new DomainError(
        'SETTING_UNKNOWN_KEY',
        `Khong co cau hinh ${group}.${key}`,
        'NOT_FOUND',
      );
    }

    /**
     * Gui lai dung chuoi che thi KHONG ghi de.
     *
     * Man hinh quan tri hien `********` o o mat khau. Nguoi dung sua mot o
     * khac roi bam Luu, va ca form duoc gui di — ke ca chuoi che. Khong chan
     * o day thi mat khau SMTP that bi thay bang tam dau sao, va email ngung
     * gui ma khong ai hieu tai sao.
     */
    if (existing.isEncrypted && value === MASKED_VALUE) {
      return mask(existing);
    }

    return mask(await this.daos.settings.upsert({ group, key, value }));
  }
}
