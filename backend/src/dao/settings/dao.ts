import { BaseDao } from '../base.dao.js';
import type { SettingDao } from './dao.interface.js';
import type { Setting, UpsertSettingInput } from './object.js';
import { toSetting } from './mapper.js';

export class KyselySettingDao extends BaseDao implements SettingDao {
  async findByGroup(group: string): Promise<Setting[]> {
    const rows = await this.db
      .selectFrom('settings')
      .selectAll()
      .where('group_name', '=', group)
      .orderBy('setting_key')
      .execute();
    return rows.map(toSetting);
  }

  async findOne(group: string, key: string): Promise<Setting | null> {
    const row = await this.db
      .selectFrom('settings')
      .selectAll()
      .where('group_name', '=', group)
      .where('setting_key', '=', key)
      .executeTakeFirst();
    return row ? toSetting(row) : null;
  }

  async findPublic(): Promise<Setting[]> {
    const rows = await this.db
      .selectFrom('settings')
      .selectAll()
      .where('is_public', '=', true)
      .orderBy(['group_name', 'setting_key'])
      .execute();
    return rows.map(toSetting);
  }

  async upsert(input: UpsertSettingInput): Promise<Setting> {
    const row = await this.db
      .updateTable('settings')
      .set({ value: input.value })
      .where('group_name', '=', input.group)
      .where('setting_key', '=', input.key)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toSetting(row);
  }
}
