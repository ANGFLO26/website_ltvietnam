import type { Selectable } from 'kysely';
import type { SettingsTable } from '@ltv/db';
import type { MaskedSetting, Setting, SettingValueType } from './object.js';

export function toSetting(row: Selectable<SettingsTable>): Setting {
  return {
    id: row.id,
    group: row.group_name,
    key: row.setting_key,
    value: row.value,
    valueType: row.value_type as SettingValueType,
    isPublic: row.is_public,
    isEncrypted: row.is_encrypted,
  };
}

/** Che gia tri cua setting duoc danh dau ma hoa (doc/06 PHAN IX). */
export function mask(s: Setting): MaskedSetting {
  const hidden = s.isEncrypted || s.valueType === 'encrypted';
  return { ...s, value: hidden ? (s.value ? '********' : null) : s.value, masked: hidden };
}
