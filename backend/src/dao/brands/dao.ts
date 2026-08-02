import { TreeDao, type TreeTableName } from '../tree.dao.js';
import { SlugSupport } from '../slugged.dao.js';
import type { KyselyExecutor } from '../connection.js';
import { normalizePage, offsetOf, toPaged, type Paged, type Page } from '../helpers.js';
import type { BrandDao } from './dao.interface.js';
import type { Brand, BrandFilter, CreateBrandInput, UpdateBrandInput } from './object.js';
import { toBrand } from './mapper.js';

/**
 * `brands` la bang phuc tap nhat: vua la CAY, vua co SLUG, vua XOA MEM.
 *
 * Ke thua `TreeDao` (cau truc cay — cai chinh),
 * ket hop `SlugSupport` (slug — cai phu, vi khong ke thua hai lop duoc).
 */
export class KyselyBrandDao extends TreeDao implements BrandDao {
  protected readonly table: TreeTableName = 'brands';
  private readonly slugs: SlugSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.slugs = new SlugSupport(db, 'brands');
  }

  // ── doc ────────────────────────────────────────────────────────
  async findById(id: string): Promise<Brand | null> {
    const row = await this.db
      .selectFrom('brands').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null)
      .executeTakeFirst();
    return row ? toBrand(row) : null;
  }

  async findBySlug(slug: string): Promise<Brand | null> {
    const row = await this.db
      .selectFrom('brands').selectAll()
      .where('slug', '=', slug).where('deleted_at', 'is', null)
      .executeTakeFirst();
    return row ? toBrand(row) : null;
  }

  async list(filter: BrandFilter, page?: Partial<Page>): Promise<Paged<Brand>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('brands').selectAll();
    if (!filter.includeDeleted) q = q.where('deleted_at', 'is', null);
    if (filter.status) q = q.where('status', '=', filter.status);
    if (filter.isFeatured !== undefined) q = q.where('is_featured', '=', filter.isFeatured);
    if (filter.parentId !== undefined) {
      q = filter.parentId === null
        ? q.where('parent_id', 'is', null)
        : q.where('parent_id', '=', filter.parentId);
    }

    const rows = await q.orderBy('display_order').orderBy('name').limit(p.pageSize).offset(offsetOf(p)).execute();

    let cq = this.db.selectFrom('brands').select(({ fn }) => fn.countAll<string>().as('n'));
    if (!filter.includeDeleted) cq = cq.where('deleted_at', 'is', null);
    if (filter.status) cq = cq.where('status', '=', filter.status);
    if (filter.isFeatured !== undefined) cq = cq.where('is_featured', '=', filter.isFeatured);
    const total = Number((await cq.executeTakeFirstOrThrow()).n);

    return toPaged(rows.map(toBrand), total, p);
  }

  // ── ghi ────────────────────────────────────────────────────────
  async insert(input: CreateBrandInput): Promise<Brand> {
    // Vi tri trong cay do TreeDao tinh — DAO con khong tu tinh ancestor_ids.
    const placement = await this.computePlacement(input.parentId ?? null);
    const row = await this.db
      .insertInto('brands')
      .values({
        parent_id: input.parentId ?? null,
        ancestor_ids: placement.ancestorIds,
        depth: placement.depth,
        brand_type: input.brandType,
        name: input.name,
        slug: input.slug,
        short_description: input.shortDescription ?? null,
        code: input.code ?? null,
        country_code: input.countryCode ?? null,
        website_url: input.websiteUrl ?? null,
        logo_id: input.logoId ?? null,
        cover_image_id: input.coverImageId ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toBrand(row);
  }

  async update(id: string, input: UpdateBrandInput): Promise<Brand> {
    const row = await this.db
      .updateTable('brands')
      .set({
        ...(input.brandType !== undefined && { brand_type: input.brandType }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.shortDescription !== undefined && { short_description: input.shortDescription }),
        ...(input.code !== undefined && { code: input.code }),
        ...(input.countryCode !== undefined && { country_code: input.countryCode }),
        ...(input.websiteUrl !== undefined && { website_url: input.websiteUrl }),
        ...(input.logoId !== undefined && { logo_id: input.logoId }),
        ...(input.coverImageId !== undefined && { cover_image_id: input.coverImageId }),
        ...(input.isFeatured !== undefined && { is_featured: input.isFeatured }),
        ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    return toBrand(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('brands').set({ deleted_at: at }).where('id', '=', id).execute();
  }

  async restore(id: string): Promise<void> {
    await this.db.updateTable('brands').set({ deleted_at: null }).where('id', '=', id).execute();
  }

  /**
   * Xoa vinh vien. Nguoi goi PHAI kiem `canHardDelete` truoc —
   * ADR-002 muc 9 chi cho hard-delete khi chua tung cong khai.
   */
  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('brands').where('id', '=', id).execute();
  }

  async publish(id: string, at: Date): Promise<Brand> {
    const row = await this.db
      .updateTable('brands')
      .set({ status: 'published', published_at: at })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();
    // Set mot lan, khong ghi de khi republish (ADR-002 muc 7).
    await this.slugs.markFirstPublished(id, at);
    const fresh = await this.db.selectFrom('brands').selectAll().where('id', '=', id).executeTakeFirstOrThrow();
    void row;
    return toBrand(fresh);
  }

  async unpublish(id: string): Promise<Brand> {
    const row = await this.db
      .updateTable('brands').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toBrand(row);
  }

  // ── slug: uy quyen cho SlugSupport ─────────────────────────────
  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean> {
    return this.slugs.isSlugAvailable(slug, undefined, exceptId);
  }
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void> {
    return this.slugs.assertSlugAvailable(slug, undefined, exceptId);
  }
  wasEverPublished(id: string): Promise<boolean> {
    return this.slugs.wasEverPublished(id);
  }
  canHardDelete(id: string): Promise<boolean> {
    return this.slugs.canHardDelete(id);
  }
}

