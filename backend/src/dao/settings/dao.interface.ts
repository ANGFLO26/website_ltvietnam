import type { Setting, UpsertSettingInput } from './object.js';

export interface SettingDao {
  findByGroup(group: string): Promise<Setting[]>;
  findOne(group: string, key: string): Promise<Setting | null>;
  /** Chi lay setting cong khai — dung cho frontend. */
  findPublic(): Promise<Setting[]>;
  upsert(input: UpsertSettingInput): Promise<Setting>;
}
