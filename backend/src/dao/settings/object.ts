/** Thuc the nghiep vu `Setting`. */
export type SettingValueType = 'string' | 'integer' | 'boolean' | 'json' | 'encrypted';

export interface Setting {
  readonly id: string;
  readonly group: string;
  readonly key: string;
  readonly value: string | null;
  readonly valueType: SettingValueType;
  readonly isPublic: boolean;
  readonly isEncrypted: boolean;
}

/**
 * Dang an toan de tra ra ngoai: gia tri da duoc che neu la secret.
 *
 * `doc/06`: khong bao gio tra secret ve frontend — `smtp_password: "********"`.
 * Tach kieu de viec che tro thanh bat buoc, khong phai nho.
 */
export interface MaskedSetting extends Omit<Setting, 'value'> {
  readonly value: string | null;
  readonly masked: boolean;
}

export interface UpsertSettingInput {
  readonly group: string;
  readonly key: string;
  readonly value: string | null;
}
