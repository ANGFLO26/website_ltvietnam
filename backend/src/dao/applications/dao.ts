import { TreeDao, type TreeTableName } from '../tree.dao.js';
import { SlugSupport } from '../slugged.dao.js';
import type { KyselyExecutor } from '../connection.js';
import { fromBlocks } from '../content.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { ApplicationDao } from './dao.interface.js';
import type {
  Application,
  ApplicationFilter,
  CreateApplicationInput,
  UpdateApplicationInput,
} from './object.js';
import { toApplication } from './mapper.js';

export class KyselyApplicationDao extends TreeDao implements ApplicationDao {
  protected readonly table: TreeTableName = 'applications';
  private readonly slugs: SlugSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.slugs = new SlugSupport(db, 'applications');
  }

  async findById(id: string): Promise<Application | null> {
    const row = await this.db.selectFrom('applications').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toApplication(row) : null;
  }

  async findBySlug(slug: string): Promise<Application | null> {
    const row = await this.db.selectFrom('applications').selectAll()
      .where('slug', '=', slug).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toApplication(row) : null;
  }

  async list(filter: ApplicationFilter, page?: Partial<Page>): Promise<Paged<Application>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('applications').selectAll();
    let cq = this.db.selectFrom('applications').select(({ fn }) => fn.countAll<string>().as('n'));

    if (!filter.includeDeleted) { q = q.where('deleted_at', 'is', null); cq = cq.where('deleted_at', 'is', null); }
    if (filter.status) { q = q.where('status', '=', filter.status); cq = cq.where('status', '=', filter.status); }
    if (filter.isFeatured !== undefined) {
      q = q.where('is_featured', '=', filter.isFeatured);
      cq = cq.where('is_featured', '=', filter.isFeatured);
    }
    if (filter.parentId !== undefined) {
      q = filter.parentId === null ? q.where('parent_id', 'is', null) : q.where('parent_id', '=', filter.parentId);
      cq = filter.parentId === null ? cq.where('parent_id', 'is', null) : cq.where('parent_id', '=', filter.parentId);
    }

    const rows = await q.orderBy('display_order').orderBy('name')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toApplication), total, p);
  }

  async insert(input: CreateApplicationInput): Promise<Application> {
    const placement = await this.computePlacement(input.parentId ?? null);
    const row = await this.db.insertInto('applications').values({
      parent_id: input.parentId ?? null,
      ancestor_ids: placement.ancestorIds,
      depth: placement.depth,
      name: input.name,
      slug: input.slug,
      description: fromBlocks(input.description),
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
      icon_id: input.iconId ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toApplication(row);
  }

  async update(id: string, input: UpdateApplicationInput): Promise<Application> {
    const row = await this.db.updateTable('applications').set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.description !== undefined && { description: fromBlocks(input.description) }),
      ...(input.seoTitle !== undefined && { seo_title: input.seoTitle }),
      ...(input.seoDescription !== undefined && { seo_description: input.seoDescription }),
      ...(input.iconId !== undefined && { icon_id: input.iconId }),
      ...(input.isFeatured !== undefined && { is_featured: input.isFeatured }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toApplication(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('applications').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('applications').set({ deleted_at: null }).where('id', '=', id).execute();
  }
  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('applications').where('id', '=', id).execute();
  }

  async publish(id: string, at: Date): Promise<Application> {
    await this.db.updateTable('applications')
      .set({ status: 'published', published_at: at }).where('id', '=', id).execute();
    await this.slugs.markFirstPublished(id, at);
    const row = await this.db.selectFrom('applications').selectAll()
      .where('id', '=', id).executeTakeFirstOrThrow();
    return toApplication(row);
  }

  async unpublish(id: string): Promise<Application> {
    const row = await this.db.updateTable('applications').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toApplication(row);
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
