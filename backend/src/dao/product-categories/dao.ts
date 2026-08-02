import { TreeDao, type TreeTableName } from '../tree.dao.js';
import { SlugSupport } from '../slugged.dao.js';
import type { KyselyExecutor } from '../connection.js';
import { fromBlocks } from '../content.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { ProductCategoryDao } from './dao.interface.js';
import type {
  CreateProductCategoryInput,
  ProductCategory,
  ProductCategoryFilter,
  UpdateProductCategoryInput,
} from './object.js';
import { toProductCategory } from './mapper.js';

/** Cay + slug + xoa mem — cung hinh dang voi `brands`. */
export class KyselyProductCategoryDao extends TreeDao implements ProductCategoryDao {
  protected readonly table: TreeTableName = 'product_categories';
  private readonly slugs: SlugSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.slugs = new SlugSupport(db, 'product_categories');
  }

  async findById(id: string): Promise<ProductCategory | null> {
    const row = await this.db.selectFrom('product_categories').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toProductCategory(row) : null;
  }

  async findBySlug(slug: string): Promise<ProductCategory | null> {
    const row = await this.db.selectFrom('product_categories').selectAll()
      .where('slug', '=', slug).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toProductCategory(row) : null;
  }

  async list(filter: ProductCategoryFilter, page?: Partial<Page>): Promise<Paged<ProductCategory>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('product_categories').selectAll();
    let cq = this.db.selectFrom('product_categories').select(({ fn }) => fn.countAll<string>().as('n'));

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
    return toPaged(rows.map(toProductCategory), total, p);
  }

  async insert(input: CreateProductCategoryInput): Promise<ProductCategory> {
    const placement = await this.computePlacement(input.parentId ?? null);
    const row = await this.db.insertInto('product_categories').values({
      parent_id: input.parentId ?? null,
      ancestor_ids: placement.ancestorIds,
      depth: placement.depth,
      name: input.name,
      slug: input.slug,
      short_description: input.shortDescription ?? null,
      description: fromBlocks(input.description),
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
      code: input.code ?? null,
      featured_image_id: input.featuredImageId ?? null,
      icon_id: input.iconId ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toProductCategory(row);
  }

  async update(id: string, input: UpdateProductCategoryInput): Promise<ProductCategory> {
    const row = await this.db.updateTable('product_categories').set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.shortDescription !== undefined && { short_description: input.shortDescription }),
      ...(input.description !== undefined && { description: fromBlocks(input.description) }),
      ...(input.seoTitle !== undefined && { seo_title: input.seoTitle }),
      ...(input.seoDescription !== undefined && { seo_description: input.seoDescription }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.featuredImageId !== undefined && { featured_image_id: input.featuredImageId }),
      ...(input.iconId !== undefined && { icon_id: input.iconId }),
      ...(input.isFeatured !== undefined && { is_featured: input.isFeatured }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toProductCategory(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('product_categories').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('product_categories').set({ deleted_at: null }).where('id', '=', id).execute();
  }
  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('product_categories').where('id', '=', id).execute();
  }

  async publish(id: string, at: Date): Promise<ProductCategory> {
    await this.db.updateTable('product_categories')
      .set({ status: 'published', published_at: at }).where('id', '=', id).execute();
    await this.slugs.markFirstPublished(id, at);
    const row = await this.db.selectFrom('product_categories').selectAll()
      .where('id', '=', id).executeTakeFirstOrThrow();
    return toProductCategory(row);
  }

  async unpublish(id: string): Promise<ProductCategory> {
    const row = await this.db.updateTable('product_categories').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toProductCategory(row);
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
