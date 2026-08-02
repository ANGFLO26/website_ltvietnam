import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import { SlugSupport } from '../slugged.dao.js';
import type { KyselyExecutor } from '../connection.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { StandardDao } from './dao.interface.js';
import type {
  CreateStandardInput,
  Standard,
  StandardFilter,
  UpdateStandardInput,
} from './object.js';
import { toStandard } from './mapper.js';

export class KyselyStandardDao extends BaseDao implements StandardDao {
  private readonly slugs: SlugSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.slugs = new SlugSupport(db, 'standards');
  }

  async findById(id: string): Promise<Standard | null> {
    const row = await this.db.selectFrom('standards').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toStandard(row) : null;
  }

  async findBySlug(slug: string): Promise<Standard | null> {
    const row = await this.db.selectFrom('standards').selectAll()
      .where('slug', '=', slug).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toStandard(row) : null;
  }

  /**
   * PHAI so khop qua `UPPER(...)` de trung voi bieu thuc cua chi muc duy nhat
   * `uq_standards_org_code`. So khop kieu khac thi ham nay noi "chua co" trong
   * khi INSERT lai bi tu choi vi trung — mot loi rat kho lan ra.
   */
  async findByCode(organization: string, code: string): Promise<Standard | null> {
    const row = await this.db.selectFrom('standards').selectAll()
      .where(sql<boolean>`upper(organization) = upper(${organization})`)
      .where(sql<boolean>`upper(code) = upper(${code})`)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
    return row ? toStandard(row) : null;
  }

  async findManyByCodes(
    pairs: readonly { organization: string; code: string }[],
  ): Promise<Standard[]> {
    if (pairs.length === 0) return [];
    // MOT truy van cho ca lo — nhap 200 san pham khong sinh 200 vong lap.
    const tuples = sql.join(
      pairs.map((p) => sql`(upper(${p.organization}), upper(${p.code}))`),
    );
    const rows = await this.db.selectFrom('standards').selectAll()
      .where(sql<boolean>`(upper(organization), upper(code)) IN (${tuples})`)
      .where('deleted_at', 'is', null)
      .execute();
    return rows.map(toStandard);
  }

  async list(filter: StandardFilter, page?: Partial<Page>): Promise<Paged<Standard>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('standards').selectAll();
    let cq = this.db.selectFrom('standards').select(({ fn }) => fn.countAll<string>().as('n'));

    if (!filter.includeDeleted) { q = q.where('deleted_at', 'is', null); cq = cq.where('deleted_at', 'is', null); }
    if (filter.status) { q = q.where('status', '=', filter.status); cq = cq.where('status', '=', filter.status); }
    if (filter.isFeatured !== undefined) {
      q = q.where('is_featured', '=', filter.isFeatured);
      cq = cq.where('is_featured', '=', filter.isFeatured);
    }
    if (filter.organization) {
      const cond = sql<boolean>`upper(organization) = upper(${filter.organization})`;
      q = q.where(cond); cq = cq.where(cond);
    }
    if (filter.search) {
      const needle = `%${escapeLike(filter.search)}%`;
      q = q.where((eb) => eb.or([eb('code', 'ilike', needle), eb('name', 'ilike', needle)]));
      cq = cq.where((eb) => eb.or([eb('code', 'ilike', needle), eb('name', 'ilike', needle)]));
    }

    const rows = await q.orderBy('display_order').orderBy('organization').orderBy('code')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toStandard), total, p);
  }

  async listOrganizations(): Promise<{ organization: string; count: number }[]> {
    const r = await sql<{ organization: string; n: string }>`
      SELECT organization, count(*) AS n
      FROM ltv.standards
      WHERE deleted_at IS NULL AND status = 'published'
      GROUP BY organization
      ORDER BY n DESC, organization
    `.execute(this.db);
    return r.rows.map((x) => ({ organization: x.organization, count: Number(x.n) }));
  }

  async insert(input: CreateStandardInput): Promise<Standard> {
    const row = await this.db.insertInto('standards').values({
      organization: input.organization,
      code: input.code,
      slug: input.slug,
      name: input.name ?? null,
      description: input.description ?? null,
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toStandard(row);
  }

  async update(id: string, input: UpdateStandardInput): Promise<Standard> {
    const row = await this.db.updateTable('standards').set({
      ...(input.organization !== undefined && { organization: input.organization }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.seoTitle !== undefined && { seo_title: input.seoTitle }),
      ...(input.seoDescription !== undefined && { seo_description: input.seoDescription }),
      ...(input.isFeatured !== undefined && { is_featured: input.isFeatured }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toStandard(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('standards').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('standards').set({ deleted_at: null }).where('id', '=', id).execute();
  }
  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('standards').where('id', '=', id).execute();
  }

  async publish(id: string, at: Date): Promise<Standard> {
    await this.db.updateTable('standards')
      .set({ status: 'published', published_at: at }).where('id', '=', id).execute();
    await this.slugs.markFirstPublished(id, at);
    const row = await this.db.selectFrom('standards').selectAll()
      .where('id', '=', id).executeTakeFirstOrThrow();
    return toStandard(row);
  }

  async unpublish(id: string): Promise<Standard> {
    const row = await this.db.updateTable('standards').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toStandard(row);
  }

  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean> {
    return this.slugs.isSlugAvailable(slug, undefined, exceptId);
  }
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void> {
    return this.slugs.assertSlugAvailable(slug, undefined, exceptId);
  }
  wasEverPublished(id: string): Promise<boolean> { return this.slugs.wasEverPublished(id); }
  canHardDelete(id: string): Promise<boolean> { return this.slugs.canHardDelete(id); }
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
