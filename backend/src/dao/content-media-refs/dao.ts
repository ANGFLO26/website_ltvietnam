import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import type { ContentMediaRefDao } from './dao.interface.js';
import type { ContentFieldRef, ContentMediaRef } from './object.js';
import { toContentMediaRef } from './mapper.js';

export class KyselyContentMediaRefDao extends BaseDao implements ContentMediaRefDao {
  async replaceForField(field: ContentFieldRef, mediaIds: readonly string[]): Promise<void> {
    const locale = field.locale ?? null;

    // `locale` co the la NULL, va `= NULL` khong bao gio dung.
    // `IS NOT DISTINCT FROM` xu ly ca hai truong hop bang mot bieu thuc.
    await sql`
      DELETE FROM ltv.content_media_refs
      WHERE entity_type = ${field.entityType}
        AND entity_id   = ${field.entityId}
        AND field_name  = ${field.fieldName}
        AND locale IS NOT DISTINCT FROM ${locale}
    `.execute(this.db);

    const unique = [...new Set(mediaIds)];
    if (unique.length === 0) return;

    await this.db
      .insertInto('content_media_refs')
      .values(
        unique.map((mediaId) => ({
          media_id: mediaId,
          entity_type: field.entityType,
          entity_id: field.entityId,
          field_name: field.fieldName,
          locale,
        })),
      )
      // Chay lai cung mot noi dung khong duoc bao loi.
      .onConflict((oc) =>
        oc.columns(['media_id', 'entity_type', 'entity_id', 'field_name', 'locale']).doNothing(),
      )
      .execute();
  }

  async deleteForEntity(entityType: string, entityId: string): Promise<void> {
    await this.db
      .deleteFrom('content_media_refs')
      .where('entity_type', '=', entityType)
      .where('entity_id', '=', entityId)
      .execute();
  }

  async findByMedia(mediaId: string): Promise<ContentMediaRef[]> {
    const rows = await this.db
      .selectFrom('content_media_refs')
      .selectAll()
      .where('media_id', '=', mediaId)
      .orderBy('entity_type')
      .orderBy('field_name')
      .execute();
    return rows.map(toContentMediaRef);
  }

  async countByMedia(mediaId: string): Promise<number> {
    const r = await sql<{ n: string }>`
      SELECT count(*) AS n FROM ltv.content_media_refs WHERE media_id = ${mediaId}
    `.execute(this.db);
    return Number(r.rows[0]?.n ?? 0);
  }

  /**
   * Kiem tung loai thuc the mot bang `NOT EXISTS`.
   *
   * Danh sach loai viet cung o day la co y: mot loai moi xuat hien ma khong
   * duoc them vao day se khong bi coi la mo coi — tuc la ham bao "sach" trong
   * khi thuc te chua kiem. De tranh im lang, loai NGOAI danh sach cung bi
   * bao la mo coi, nen quen them van lo ra.
   */
  async findOrphans(limit: number): Promise<ContentMediaRef[]> {
    const rows = await sql<{
      id: string;
      media_id: string;
      entity_type: string;
      entity_id: string;
      locale: string | null;
      field_name: string;
    }>`
      SELECT r.* FROM ltv.content_media_refs r
      WHERE CASE r.entity_type
        WHEN 'product'  THEN NOT EXISTS (SELECT 1 FROM ltv.products   x WHERE x.id = r.entity_id)
        WHEN 'brand'    THEN NOT EXISTS (SELECT 1 FROM ltv.brands     x WHERE x.id = r.entity_id)
        WHEN 'industry' THEN NOT EXISTS (SELECT 1 FROM ltv.industries x WHERE x.id = r.entity_id)
        WHEN 'application'      THEN NOT EXISTS (SELECT 1 FROM ltv.applications        x WHERE x.id = r.entity_id)
        WHEN 'product_category' THEN NOT EXISTS (SELECT 1 FROM ltv.product_categories  x WHERE x.id = r.entity_id)
        WHEN 'page_translation'    THEN NOT EXISTS (SELECT 1 FROM ltv.page_translations    x WHERE x.id = r.entity_id)
        WHEN 'post_translation'    THEN NOT EXISTS (SELECT 1 FROM ltv.post_translations    x WHERE x.id = r.entity_id)
        WHEN 'service_translation' THEN NOT EXISTS (SELECT 1 FROM ltv.service_translations x WHERE x.id = r.entity_id)
        WHEN 'project_translation' THEN NOT EXISTS (SELECT 1 FROM ltv.project_translations x WHERE x.id = r.entity_id)
        ELSE TRUE
      END
      ORDER BY r.created_at
      LIMIT ${Math.max(1, Math.trunc(limit))}
    `.execute(this.db);
    return rows.rows.map((r) => toContentMediaRef(r as never));
  }
}
