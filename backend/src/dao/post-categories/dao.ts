import { sql } from 'kysely';
import { TreeDao, type TreeTableName } from '../tree.dao.js';
import { SlugSupport } from '../slugged.dao.js';
import type { KyselyExecutor } from '../connection.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { PostCategoryDao } from './dao.interface.js';
import type {
  CreatePostCategoryInput,
  PostCategory,
  PostCategoryFilter,
  UpdatePostCategoryInput,
} from './object.js';
import { toPostCategory } from './mapper.js';

export class KyselyPostCategoryDao extends TreeDao implements PostCategoryDao {
  protected readonly table: TreeTableName = 'post_categories';
  private readonly slugs: SlugSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.slugs = new SlugSupport(db, 'post_categories');
  }

  async findById(id: string): Promise<PostCategory | null> {
    const row = await this.db.selectFrom('post_categories').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toPostCategory(row) : null;
  }

  async findBySlug(slug: string): Promise<PostCategory | null> {
    const row = await this.db.selectFrom('post_categories').selectAll()
      .where('slug', '=', slug).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toPostCategory(row) : null;
  }

  async list(filter: PostCategoryFilter, page?: Partial<Page>): Promise<Paged<PostCategory>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('post_categories').selectAll();
    let cq = this.db.selectFrom('post_categories').select(({ fn }) => fn.countAll<string>().as('n'));
    if (!filter.includeDeleted) { q = q.where('deleted_at', 'is', null); cq = cq.where('deleted_at', 'is', null); }
    if (filter.status) { q = q.where('status', '=', filter.status); cq = cq.where('status', '=', filter.status); }
    if (filter.parentId !== undefined) {
      q = filter.parentId === null ? q.where('parent_id', 'is', null) : q.where('parent_id', '=', filter.parentId);
      cq = filter.parentId === null ? cq.where('parent_id', 'is', null) : cq.where('parent_id', '=', filter.parentId);
    }
    const rows = await q.orderBy('display_order').orderBy('name')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toPostCategory), total, p);
  }

  async insert(input: CreatePostCategoryInput): Promise<PostCategory> {
    const placement = await this.computePlacement(input.parentId ?? null);
    const row = await this.db.insertInto('post_categories').values({
      parent_id: input.parentId ?? null,
      ancestor_ids: placement.ancestorIds,
      depth: placement.depth,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toPostCategory(row);
  }

  async update(id: string, input: UpdatePostCategoryInput): Promise<PostCategory> {
    const row = await this.db.updateTable('post_categories').set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.seoTitle !== undefined && { seo_title: input.seoTitle }),
      ...(input.seoDescription !== undefined && { seo_description: input.seoDescription }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toPostCategory(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('post_categories').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('post_categories').set({ deleted_at: null }).where('id', '=', id).execute();
  }
  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('post_categories').where('id', '=', id).execute();
  }

  async publish(id: string, at: Date): Promise<PostCategory> {
    await this.db.updateTable('post_categories')
      .set({ status: 'published', published_at: at }).where('id', '=', id).execute();
    await this.slugs.markFirstPublished(id, at);
    const row = await this.db.selectFrom('post_categories').selectAll()
      .where('id', '=', id).executeTakeFirstOrThrow();
    return toPostCategory(row);
  }

  async unpublish(id: string): Promise<PostCategory> {
    const row = await this.db.updateTable('post_categories').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toPostCategory(row);
  }

  async countPosts(id: string): Promise<number> {
    const r = await sql<{ n: string }>`
      SELECT count(*) AS n FROM ltv.posts WHERE category_id = ${id} AND deleted_at IS NULL
    `.execute(this.db);
    return Number(r.rows[0]?.n ?? 0);
  }

  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean> {
    return this.slugs.isSlugAvailable(slug, undefined, exceptId);
  }
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void> {
    return this.slugs.assertSlugAvailable(slug, undefined, exceptId);
  }
  canHardDelete(id: string): Promise<boolean> { return this.slugs.canHardDelete(id); }
}
