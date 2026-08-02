import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import type { HomepageSectionDao } from './dao.interface.js';
import type { HomepageSection, UpsertHomepageSectionInput } from './object.js';
import { toHomepageSection } from './mapper.js';

export class KyselyHomepageSectionDao extends BaseDao implements HomepageSectionDao {
  async listAll(): Promise<HomepageSection[]> {
    const rows = await this.db.selectFrom('homepage_sections').selectAll()
      .orderBy('display_order').orderBy('section_type').execute();
    return rows.map(toHomepageSection);
  }

  async listEnabled(): Promise<HomepageSection[]> {
    const rows = await this.db.selectFrom('homepage_sections').selectAll()
      .where('is_enabled', '=', true)
      .orderBy('display_order').orderBy('section_type').execute();
    return rows.map(toHomepageSection);
  }

  async findByType(sectionType: string): Promise<HomepageSection | null> {
    const row = await this.db.selectFrom('homepage_sections').selectAll()
      .where('section_type', '=', sectionType).executeTakeFirst();
    return row ? toHomepageSection(row) : null;
  }

  async upsert(input: UpsertHomepageSectionInput): Promise<HomepageSection> {
    const changes = {
      ...(input.isEnabled !== undefined && { is_enabled: input.isEnabled }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
      ...(input.settings !== undefined && { settings: JSON.stringify(input.settings) }),
    };

    /**
     * `DO UPDATE SET` KHONG duoc rong.
     *
     * Neu nguoi goi chi truyen `sectionType` — tao khoi voi cau hinh mac dinh
     * — thi `changes` rong, va `doUpdateSet({})` sinh ra
     * `ON CONFLICT ... DO UPDATE SET RETURNING *`, tuc la SQL sai cu phap.
     * Loi chi lo ra khi hang DA TON TAI, nen lan chay dau tien tren so do
     * sach van xanh. Bai kiem sap xep bat duoc cho nay.
     */
    const row = Object.keys(changes).length === 0
      ? await this.db.insertInto('homepage_sections')
          .values({ section_type: input.sectionType, settings: JSON.stringify(input.settings ?? {}) })
          .onConflict((oc) => oc.column('section_type').doNothing())
          .returningAll()
          .executeTakeFirst()
        ?? await this.db.selectFrom('homepage_sections').selectAll()
          .where('section_type', '=', input.sectionType).executeTakeFirstOrThrow()
      : await this.db.insertInto('homepage_sections').values({
          section_type: input.sectionType,
          ...(input.isEnabled !== undefined && { is_enabled: input.isEnabled }),
          ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
          settings: JSON.stringify(input.settings ?? {}),
        }).onConflict((oc) => oc.column('section_type').doUpdateSet(changes))
          .returningAll().executeTakeFirstOrThrow();

    return toHomepageSection(row);
  }

  async setEnabled(sectionType: string, enabled: boolean): Promise<void> {
    await this.db.updateTable('homepage_sections').set({ is_enabled: enabled })
      .where('section_type', '=', sectionType).execute();
  }

  /**
   * MOT cau lenh cho ca danh sach.
   *
   * `UPDATE ... FROM unnest(...) WITH ORDINALITY` gan thu tu moi cho tat ca
   * trong mot lenh, nen khong co khoanh khac nao trang chu thay nua thu tu cu
   * nua thu tu moi. Vong lap `for` goi N lan UPDATE thi co, tru khi nguoi goi
   * nho boc transaction — ma "nho" chinh la thu DaoManager duoc dung de tranh.
   */
  async reorder(sectionTypesInOrder: readonly string[]): Promise<void> {
    if (sectionTypesInOrder.length === 0) return;
    await sql`
      UPDATE ltv.homepage_sections s
      SET display_order = v.ord - 1
      FROM unnest(${[...sectionTypesInOrder]}::text[]) WITH ORDINALITY AS v(section_type, ord)
      WHERE s.section_type = v.section_type
    `.execute(this.db);
  }
}
