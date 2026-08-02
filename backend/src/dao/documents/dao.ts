import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import { SlugSupport } from '../slugged.dao.js';
import type { KyselyExecutor } from '../connection.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { DocumentDao } from './dao.interface.js';
import type {
  AppDocument,
  CreateDocumentInput,
  DocumentFilter,
  DocumentLinks,
  DownloadableDocument,
  UpdateDocumentInput,
} from './object.js';
import { toDocument } from './mapper.js';

export class KyselyDocumentDao extends BaseDao implements DocumentDao {
  private readonly slugs: SlugSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.slugs = new SlugSupport(db, 'documents');
  }

  async findById(id: string): Promise<AppDocument | null> {
    const row = await this.db.selectFrom('documents').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toDocument(row) : null;
  }

  async findBySlug(slug: string): Promise<AppDocument | null> {
    const row = await this.db.selectFrom('documents').selectAll()
      .where('slug', '=', slug).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toDocument(row) : null;
  }

  /**
   * HAI dieu kien, khong phai mot.
   *
   * Tep cung phai con song: `file_id` tro toi media chua xoa mem. Thieu kiem
   * nay thi nut tai ve van hien va bam vao tra 404 — kieu hong khach thay
   * truoc minh.
   */
  async findDownloadableBySlug(slug: string): Promise<DownloadableDocument | null> {
    const row = await this.db
      .selectFrom('documents')
      .innerJoin('media', 'media.id', 'documents.file_id')
      .selectAll('documents')
      .where('documents.slug', '=', slug)
      .where('documents.deleted_at', 'is', null)
      .where('documents.status', '=', 'published')
      .where('documents.visibility', '=', 'public')
      .where('media.deleted_at', 'is', null)
      .executeTakeFirst();
    if (!row) return null;
    // Bon dieu kien tren da bao dam hai truong nay, nen thu hep kieu o day
    // la ket luan cua truy van chu khong phai loi hua suong.
    return toDocument(row) as DownloadableDocument;
  }

  async list(filter: DocumentFilter, page?: Partial<Page>): Promise<Paged<AppDocument>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('documents').selectAll();
    let cq = this.db.selectFrom('documents').select(({ fn }) => fn.countAll<string>().as('n'));

    if (!filter.includeDeleted) { q = q.where('deleted_at', 'is', null); cq = cq.where('deleted_at', 'is', null); }
    if (filter.status) { q = q.where('status', '=', filter.status); cq = cq.where('status', '=', filter.status); }
    if (filter.visibility) { q = q.where('visibility', '=', filter.visibility); cq = cq.where('visibility', '=', filter.visibility); }
    if (filter.documentType) { q = q.where('document_type', '=', filter.documentType); cq = cq.where('document_type', '=', filter.documentType); }
    if (filter.language) { q = q.where('language', '=', filter.language); cq = cq.where('language', '=', filter.language); }
    if (filter.search) {
      const needle = `%${escapeLike(filter.search)}%`;
      q = q.where((eb) => eb.or([eb('title', 'ilike', needle), eb('description', 'ilike', needle)]));
      cq = cq.where((eb) => eb.or([eb('title', 'ilike', needle), eb('description', 'ilike', needle)]));
    }

    const rows = await q.orderBy('publication_date', 'desc').orderBy('title')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toDocument), total, p);
  }

  async insert(input: CreateDocumentInput): Promise<AppDocument> {
    const row = await this.db.insertInto('documents').values({
      document_type: input.documentType,
      file_id: input.fileId,
      title: input.title,
      slug: input.slug,
      description: input.description ?? null,
      language: input.language ?? 'en',
      version: input.version ?? null,
      publication_date: input.publicationDate ?? null,
      ...(input.visibility !== undefined && { visibility: input.visibility }),
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toDocument(row);
  }

  async update(id: string, input: UpdateDocumentInput): Promise<AppDocument> {
    const row = await this.db.updateTable('documents').set({
      ...(input.documentType !== undefined && { document_type: input.documentType }),
      ...(input.fileId !== undefined && { file_id: input.fileId }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.language !== undefined && { language: input.language }),
      ...(input.version !== undefined && { version: input.version }),
      ...(input.publicationDate !== undefined && {
        publication_date: input.publicationDate ?? null,
      }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
      ...(input.seoTitle !== undefined && { seo_title: input.seoTitle }),
      ...(input.seoDescription !== undefined && { seo_description: input.seoDescription }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toDocument(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('documents').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('documents').set({ deleted_at: null }).where('id', '=', id).execute();
  }
  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('documents').where('id', '=', id).execute();
  }

  async publish(id: string, at: Date): Promise<AppDocument> {
    await this.db.updateTable('documents')
      .set({ status: 'published', published_at: at }).where('id', '=', id).execute();
    await this.slugs.markFirstPublished(id, at);
    const row = await this.db.selectFrom('documents').selectAll()
      .where('id', '=', id).executeTakeFirstOrThrow();
    return toDocument(row);
  }

  async unpublish(id: string): Promise<AppDocument> {
    const row = await this.db.updateTable('documents').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toDocument(row);
  }

  async recordDownload(id: string, at: Date): Promise<void> {
    await sql`
      UPDATE ltv.documents SET download_count = download_count + 1, updated_at = ${at}
      WHERE id = ${id}
    `.execute(this.db);
  }

  async replaceLinks(id: string, links: DocumentLinks): Promise<void> {
    if (links.productIds !== undefined) {
      await this.db.deleteFrom('document_products').where('document_id', '=', id).execute();
      if (links.productIds.length > 0) {
        await this.db.insertInto('document_products')
          .values(links.productIds.map((x, i) => ({ document_id: id, product_id: x, display_order: i })))
          .execute();
      }
    }
    if (links.brandIds !== undefined) {
      await this.db.deleteFrom('document_brands').where('document_id', '=', id).execute();
      if (links.brandIds.length > 0) {
        await this.db.insertInto('document_brands')
          .values(links.brandIds.map((x) => ({ document_id: id, brand_id: x }))).execute();
      }
    }
    if (links.serviceIds !== undefined) {
      await this.db.deleteFrom('document_services').where('document_id', '=', id).execute();
      if (links.serviceIds.length > 0) {
        await this.db.insertInto('document_services')
          .values(links.serviceIds.map((x) => ({ document_id: id, service_id: x }))).execute();
      }
    }
    if (links.postIds !== undefined) {
      await this.db.deleteFrom('document_posts').where('document_id', '=', id).execute();
      if (links.postIds.length > 0) {
        await this.db.insertInto('document_posts')
          .values(links.postIds.map((x) => ({ document_id: id, post_id: x }))).execute();
      }
    }
  }

  async findLinks(id: string): Promise<Required<DocumentLinks>> {
    const pr = await this.db.selectFrom('document_products').select('product_id').where('document_id', '=', id).execute();
    const br = await this.db.selectFrom('document_brands').select('brand_id').where('document_id', '=', id).execute();
    const sv = await this.db.selectFrom('document_services').select('service_id').where('document_id', '=', id).execute();
    const po = await this.db.selectFrom('document_posts').select('post_id').where('document_id', '=', id).execute();
    return {
      productIds: pr.map((x) => x.product_id),
      brandIds: br.map((x) => x.brand_id),
      serviceIds: sv.map((x) => x.service_id),
      postIds: po.map((x) => x.post_id),
    };
  }

  /** MOT truy van — tab "Tai lieu" khong duoc sinh mot cau cho moi dong. */
  async findByProduct(productId: string): Promise<AppDocument[]> {
    const rows = await this.db
      .selectFrom('documents')
      .innerJoin('document_products', 'document_products.document_id', 'documents.id')
      .selectAll('documents')
      .where('document_products.product_id', '=', productId)
      .where('documents.deleted_at', 'is', null)
      .where('documents.status', '=', 'published')
      .orderBy('document_products.display_order')
      .execute();
    return rows.map(toDocument);
  }

  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean> {
    return this.slugs.isSlugAvailable(slug, undefined, exceptId);
  }
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void> {
    return this.slugs.assertSlugAvailable(slug, undefined, exceptId);
  }
  canHardDelete(id: string): Promise<boolean> { return this.slugs.canHardDelete(id); }
}

function escapeLike(s: string): string { return s.replace(/[\\%_]/g, (c) => `\\${c}`); }
