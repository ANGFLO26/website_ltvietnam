import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import type { KyselyExecutor } from '../connection.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { MediaDao } from './dao.interface.js';
import type { CreateMediaInput, Media, MediaFilter, UpdateMediaInput } from './object.js';
import { toMedia } from './mapper.js';

export class KyselyMediaDao extends BaseDao implements MediaDao {
  // ── doc ────────────────────────────────────────────────────────
  async findById(id: string): Promise<Media | null> {
    const row = await this.db
      .selectFrom('media').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null)
      .executeTakeFirst();
    return row ? toMedia(row) : null;
  }

  async findManyByIds(ids: readonly string[]): Promise<Media[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .selectFrom('media').selectAll()
      .where('id', 'in', [...ids]).where('deleted_at', 'is', null)
      .execute();
    return rows.map(toMedia);
  }

  async findByStoragePath(path: string): Promise<Media | null> {
    const row = await this.db
      .selectFrom('media').selectAll().where('storage_path', '=', path)
      .executeTakeFirst();
    return row ? toMedia(row) : null;
  }

  async findByChecksum(checksum: string): Promise<Media | null> {
    const row = await this.db
      .selectFrom('media').selectAll()
      .where('checksum', '=', checksum).where('deleted_at', 'is', null)
      .orderBy('created_at')
      .executeTakeFirst();
    return row ? toMedia(row) : null;
  }

  async list(filter: MediaFilter, page?: Partial<Page>): Promise<Paged<Media>> {
    const p = normalizePage(page);

    // Hai truy van song song (trang + tong) phai mang DUNG cung dieu kien.
    // Viet tay hai lan la cach de sai nhat, nhung Kysely khong cho dung chung
    // mot chuoi `where` giua select-all va select-count vi kieu tra ve khac
    // nhau. Danh chap nhan lap, va khoa lai bang test dem tren cung bo loc.
    let q = this.db.selectFrom('media').selectAll();
    let cq = this.db.selectFrom('media').select(({ fn }) => fn.countAll<string>().as('n'));

    if (!filter.includeDeleted) {
      q = q.where('deleted_at', 'is', null);
      cq = cq.where('deleted_at', 'is', null);
    }
    if (filter.storageClass) {
      q = q.where('storage_class', '=', filter.storageClass);
      cq = cq.where('storage_class', '=', filter.storageClass);
    }
    if (filter.uploadedBy) {
      q = q.where('uploaded_by', '=', filter.uploadedBy);
      cq = cq.where('uploaded_by', '=', filter.uploadedBy);
    }
    if (filter.mimeGroup) {
      // `image` -> `image/%`. Ghep tien to o day chu khong nhan `LIKE` tu client.
      const prefix = `${filter.mimeGroup}/%`;
      q = q.where('mime_type', 'like', prefix);
      cq = cq.where('mime_type', 'like', prefix);
    }
    if (filter.search) {
      const needle = `%${escapeLike(filter.search)}%`;
      q = q.where((eb) =>
        eb.or([
          eb('original_name', 'ilike', needle),
          eb('title', 'ilike', needle),
          eb('alt_text', 'ilike', needle),
        ]),
      );
      cq = cq.where((eb) =>
        eb.or([
          eb('original_name', 'ilike', needle),
          eb('title', 'ilike', needle),
          eb('alt_text', 'ilike', needle),
        ]),
      );
    }

    const rows = await q.orderBy('created_at', 'desc').limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toMedia), total, p);
  }

  // ── ghi ────────────────────────────────────────────────────────
  async insert(input: CreateMediaInput): Promise<Media> {
    const row = await this.db
      .insertInto('media')
      .values({
        file_name: input.fileName,
        original_name: input.originalName,
        storage_disk: input.storageDisk ?? 'local',
        storage_class: input.storageClass,
        storage_path: input.storagePath,
        public_url: input.publicUrl ?? null,
        variants: JSON.stringify(input.variants ?? {}),
        mime_type: input.mimeType,
        file_extension: input.fileExtension,
        // BIGINT: kieu sinh ra la `string`. Ep o day, khong de lot len interface.
        file_size: String(Math.trunc(input.fileSize)),
        width: input.width ?? null,
        height: input.height ?? null,
        checksum: input.checksum ?? null,
        title: input.title ?? null,
        alt_text: input.altText ?? null,
        caption: input.caption ?? null,
        credit: input.credit ?? null,
        uploaded_by: input.uploadedBy ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toMedia(row);
  }

  async update(id: string, input: UpdateMediaInput): Promise<Media> {
    const row = await this.db
      .updateTable('media')
      .set({
        ...(input.title !== undefined && { title: input.title }),
        ...(input.altText !== undefined && { alt_text: input.altText }),
        ...(input.caption !== undefined && { caption: input.caption }),
        ...(input.credit !== undefined && { credit: input.credit }),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toMedia(row);
  }

  async setVariants(id: string, variants: Readonly<Record<string, string>>): Promise<void> {
    await this.db
      .updateTable('media')
      .set({ variants: JSON.stringify(variants) })
      .where('id', '=', id)
      .execute();
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('media').set({ deleted_at: at }).where('id', '=', id).execute();
  }

  async restore(id: string): Promise<void> {
    await this.db.updateTable('media').set({ deleted_at: null }).where('id', '=', id).execute();
  }

  async markPurged(id: string, at: Date): Promise<void> {
    await this.db.updateTable('media').set({ purged_at: at }).where('id', '=', id).execute();
  }

  async findPurgeCandidates(before: Date, limit: number): Promise<Media[]> {
    const rows = await this.db
      .selectFrom('media').selectAll()
      .where('deleted_at', 'is not', null)
      .where('deleted_at', '<', before)
      .where('purged_at', 'is', null)
      .orderBy('deleted_at')
      .limit(Math.max(1, Math.trunc(limit)))
      .execute();
    return rows.map(toMedia);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('media').where('id', '=', id).execute();
  }

  /**
   * Dem tham chieu — LO HONG A4.
   *
   * Vi sao doc tu catalog thay vi liet ke 22 cot bang tay:
   * hom nay co 22 cot khoa ngoai tro toi `media`. Ngay mai ai do them bang
   * `case_studies(featured_image_id)`. Neu danh sach viet cung thi ham nay
   * tra ve thieu MOT cach im lang, va anh dang hien tren trang bi don di.
   * Doc tu `information_schema` thi bang moi tu dong duoc tinh.
   *
   * Chi phi: mot truy van catalog cho moi tien trinh, sau do cache.
   */
  async countReferences(id: string): Promise<number> {
    const cols = await loadMediaFkColumns(this.db);

    // UNION ALL cac lan dem roi cong lai — mot vong toi may chu, khong phai 23.
    const parts = cols.map(
      (c) => sql`SELECT COUNT(*) AS n FROM ${sql.table(c.table)} WHERE ${sql.ref(c.column)} = ${id}`,
    );
    const r = await sql<{ total: string }>`
      SELECT COALESCE(SUM(n), 0) AS total FROM (${sql.join(parts, sql` UNION ALL `)}) s
    `.execute(this.db);
    return Number(r.rows[0]?.total ?? 0);
  }
}

interface FkColumn {
  readonly table: string;
  readonly column: string;
}

/**
 * Cache o pham vi module: so do khong doi luc chay. Migration doi so do thi
 * tien trinh khoi dong lai, nen khong co tinh huong cache cu ma van chay.
 */
let fkColumnsCache: FkColumn[] | null = null;

async function loadMediaFkColumns(db: KyselyExecutor): Promise<FkColumn[]> {
  if (fkColumnsCache) return fkColumnsCache;
  const r = await sql<FkColumn>`
    SELECT src.relname AS "table", att.attname AS "column"
    FROM pg_constraint con
    JOIN pg_class     src ON src.oid = con.conrelid
    JOIN pg_class     tgt ON tgt.oid = con.confrelid
    JOIN pg_namespace ns  ON ns.oid  = src.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord) ON TRUE
    JOIN pg_attribute att ON att.attrelid = src.oid AND att.attnum = k.attnum
    WHERE con.contype = 'f'
      AND tgt.relname = 'media'
      AND ns.nspname  = 'ltv'
    ORDER BY 1, 2
  `.execute(db);
  fkColumnsCache = r.rows;
  return fkColumnsCache;
}

/** Chi dung trong test — buoc doc lai catalog. */
export function resetMediaFkCache(): void {
  fkColumnsCache = null;
}

/** `%` va `_` trong chuoi nguoi dung tim la ky tu THUONG, khong phai dai dien. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
