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
 * Chuoi thay the cho gia tri bi che.
 *
 * Dat o day — trong `object.ts` — chu khong trong `mapper.ts`, vi tang
 * service can doc no de nhan ra "nguoi dung gui lai dung chuoi che, nghia la
 * ho khong doi gi ca". Ma `mapper.ts` thi chua kieu hang cua Kysely nen tang
 * service khong duoc import (Luat 2).
 *
 * Hai noi cung dung mot hang so nay. Viet hai lan la cach chac chan de mot
 * ngay nao do chung lech nhau, va khi do gia tri that bi ghi de bang dau sao.
 */
export const MASKED_VALUE = '********';

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
