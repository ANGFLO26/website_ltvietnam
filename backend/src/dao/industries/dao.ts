import { BaseDao } from '../base.dao.js';
import { SlugSupport } from '../slugged.dao.js';
import type { KyselyExecutor } from '../connection.js';
import { fromBlocks } from '../content.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { IndustryDao } from './dao.interface.js';
import type {
  CreateIndustryInput,
  Industry,
  IndustryFilter,
  UpdateIndustryInput,
} from './object.js';
import { toIndustry } from './mapper.js';

export class KyselyIndustryDao extends BaseDao implements IndustryDao {
  private readonly slugs: SlugSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.slugs = new SlugSupport(db, 'industries');
  }

  async findById(id: string): Promise<Industry | null> {
    const row = await this.db.selectFrom('industries').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toIndustry(row) : null;
  }

  async findBySlug(slug: string): Promise<Industry | null> {
    const row = await this.db.selectFrom('industries').selectAll()
      .where('slug', '=', slug).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toIndustry(row) : null;
  }

  async list(filter: IndustryFilter, page?: Partial<Page>): Promise<Paged<Industry>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('industries').selectAll();
    let cq = this.db.selectFrom('industries').select(({ fn }) => fn.countAll<string>().as('n'));

    if (!filter.includeDeleted) { q = q.where('deleted_at', 'is', null); cq = cq.where('deleted_at', 'is', null); }
    if (filter.status) { q = q.where('status', '=', filter.status); cq = cq.where('status', '=', filter.status); }
    if (filter.isFeatured !== undefined) {
      q = q.where('is_featured', '=', filter.isFeatured);
      cq = cq.where('is_featured', '=', filter.isFeatured);
    }

    const rows = await q.orderBy('display_order').orderBy('name')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toIndustry), total, p);
  }

  async insert(input: CreateIndustryInput): Promise<Industry> {
    const row = await this.db.insertInto('industries').values({
      name: input.name,
      slug: input.slug,
      description: fromBlocks(input.description),
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
      featured_image_id: input.featuredImageId ?? null,
      icon_id: input.iconId ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toIndustry(row);
  }

  async update(id: string, input: UpdateIndustryInput): Promise<Industry> {
    const row = await this.db.updateTable('industries').set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.description !== undefined && { description: fromBlocks(input.description) }),
      ...(input.seoTitle !== undefined && { seo_title: input.seoTitle }),
      ...(input.seoDescription !== undefined && { seo_description: input.seoDescription }),
      ...(input.featuredImageId !== undefined && { featured_image_id: input.featuredImageId }),
      ...(input.iconId !== undefined && { icon_id: input.iconId }),
      ...(input.isFeatured !== undefined && { is_featured: input.isFeatured }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toIndustry(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('industries').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('industries').set({ deleted_at: null }).where('id', '=', id).execute();
  }
  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('industries').where('id', '=', id).execute();
  }

  async publish(id: string, at: Date): Promise<Industry> {
    await this.db.updateTable('industries')
      .set({ status: 'published', published_at: at }).where('id', '=', id).execute();
    await this.slugs.markFirstPublished(id, at);
    const row = await this.db.selectFrom('industries').selectAll()
      .where('id', '=', id).executeTakeFirstOrThrow();
    return toIndustry(row);
  }

  async unpublish(id: string): Promise<Industry> {
    const row = await this.db.updateTable('industries').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toIndustry(row);
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
