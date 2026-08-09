import type { MaskedSetting, Setting } from '../../dao/settings/object.js';

export const SETTING_SERVICE = Symbol('SETTING_SERVICE');

export interface SettingService {
  listAll(): Promise<MaskedSetting[]>;
  /**
   * Doc theo nhom cho man hinh quan tri — secret DA duoc che.
   *
   * Tra ve `MaskedSetting` chu khong phai `Setting`: kieu tra ve la thu ep
   * viec che, chu khong phai nho.
   */
  listGroup(group: string): Promise<MaskedSetting[]>;

  /** Setting cong khai cho frontend. Setting `is_encrypted` KHONG bao gio o day. */
  listPublic(): Promise<MaskedSetting[]>;

  /**
   * Doc gia tri THAT — chi cho ma nguon phia may chu dung (vd lay mat khau
   * SMTP de gui mail). Khong bao gio di ra response.
   */
  readSecret(group: string, key: string): Promise<Setting | null>;

  update(group: string, key: string, value: string | null): Promise<MaskedSetting>;
  updateGroup(
    group: string,
    values: Readonly<Record<string, string | null>>,
  ): Promise<MaskedSetting[]>;
}
