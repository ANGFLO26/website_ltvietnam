import { BaseDao } from '../base.dao.js';
import { SlugSupport } from '../slugged.dao.js';
import type { KyselyExecutor } from '../connection.js';
import { fromBlocks } from '../content.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { ProductDao } from './dao.interface.js';
import type {
  ApplicationLink,
  CategoryLink,
  CreateProductInput,
  IndustryLink,
  Product,
  ProductMediaLink,
  RelatedLink,
  Specification,
  StandardLink,
  UpdateProductInput,
} from './object.js';
import { toProduct } from './mapper.js';
import { ProductQueryRunner } from './query.js';
import type {
  ProductCard,
  ProductDetail,
  ProductFilter,
  ProductSort,
} from './object.js';

export class KyselyProductDao extends BaseDao implements ProductDao {
  private readonly slugs: SlugSupport;
  /**
   * Duong doc phuc tap song o `query.ts`. DAO uy quyen sang do thay vi tu
   * viet, nhung VAN la cong vao duy nhat: tang tren chi biet `tx.products`,
   * khong phai nho la co hai doi tuong cho mot bang.
   */
  private readonly q: ProductQueryRunner;

  constructor(db: KyselyExecutor) {
    super(db);
    this.slugs = new SlugSupport(db, 'products');
    this.q = new ProductQueryRunner(db);
  }

  // ── uy quyen sang query.ts ─────────────────────────────────────
  filter(
    filter: ProductFilter,
    sort?: { by?: ProductSort; direction?: 'asc' | 'desc' },
    page?: Partial<Page>,
  ): Promise<Paged<ProductCard>> {
    return this.q.filter(filter, sort, page);
  }
  findDetailBySlug(slug: string): Promise<ProductDetail | null> {
    return this.q.findDetailBySlug(slug);
  }
  findCardsByIds(ids: readonly string[]): Promise<ProductCard[]> {
    return this.q.findCardsByIds(ids);
  }
  findFeaturedCards(limit: number): Promise<ProductCard[]> {
    return this.q.findFeaturedCards(limit);
  }

  // ── doc ────────────────────────────────────────────────────────
  async findById(id: string): Promise<Product | null> {
    const row = await this.db.selectFrom('products').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toProduct(row) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    const row = await this.db.selectFrom('products').selectAll()
      .where('slug', '=', slug).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toProduct(row) : null;
  }

  async findByInternalCode(code: string): Promise<Product | null> {
    const row = await this.db.selectFrom('products').selectAll()
      .where('internal_code', '=', code).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toProduct(row) : null;
  }

  /**
   * Danh sach QUAN TRI, don gian.
   * Bo loc cong khai nhieu chieu nam o `query.ts` — no can JOIN va mo rong
   * nhanh con, khong the ghep tu ham nay.
   */
  async list(
    filter: { status?: string; brandId?: string },
    page?: Partial<Page>,
  ): Promise<Paged<Product>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('products').selectAll().where('deleted_at', 'is', null);
    let cq = this.db.selectFrom('products')
      .select(({ fn }) => fn.countAll<string>().as('n')).where('deleted_at', 'is', null);

    if (filter.status) {
      q = q.where('status', '=', filter.status);
      cq = cq.where('status', '=', filter.status);
    }
    if (filter.brandId) {
      q = q.where('brand_id', '=', filter.brandId);
      cq = cq.where('brand_id', '=', filter.brandId);
    }

    const rows = await q.orderBy('display_order').orderBy('name')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toProduct), total, p);
  }

  // ── ghi ────────────────────────────────────────────────────────
  async insert(input: CreateProductInput): Promise<Product> {
    const row = await this.db.insertInto('products').values({
      brand_id: input.brandId,
      name: input.name,
      slug: input.slug,
      short_description: input.shortDescription ?? null,
      model: input.model ?? null,
      internal_code: input.internalCode ?? null,
      sku: input.sku ?? null,
      product_type: input.productType ?? 'equipment',
      featured_image_id: input.featuredImageId ?? null,
      overview: fromBlocks(input.overview),
      features: fromBlocks(input.features),
      applications_text: fromBlocks(input.applicationsText),
      principle: fromBlocks(input.principle),
      sample_types: fromBlocks(input.sampleTypes),
      operating_conditions: fromBlocks(input.operatingConditions),
      accessories_options: fromBlocks(input.accessoriesOptions),
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
      created_by: input.createdBy ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toProduct(row);
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const row = await this.db.updateTable('products').set({
      ...(input.brandId !== undefined && { brand_id: input.brandId }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.shortDescription !== undefined && { short_description: input.shortDescription }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.internalCode !== undefined && { internal_code: input.internalCode }),
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.productType !== undefined && { product_type: input.productType }),
      ...(input.featuredImageId !== undefined && { featured_image_id: input.featuredImageId }),
      ...(input.overview !== undefined && { overview: fromBlocks(input.overview) }),
      ...(input.features !== undefined && { features: fromBlocks(input.features) }),
      ...(input.applicationsText !== undefined && { applications_text: fromBlocks(input.applicationsText) }),
      ...(input.principle !== undefined && { principle: fromBlocks(input.principle) }),
      ...(input.sampleTypes !== undefined && { sample_types: fromBlocks(input.sampleTypes) }),
      ...(input.operatingConditions !== undefined && { operating_conditions: fromBlocks(input.operatingConditions) }),
      ...(input.accessoriesOptions !== undefined && { accessories_options: fromBlocks(input.accessoriesOptions) }),
      ...(input.seoTitle !== undefined && { seo_title: input.seoTitle }),
      ...(input.seoDescription !== undefined && { seo_description: input.seoDescription }),
      ...(input.priceVisibility !== undefined && { price_visibility: input.priceVisibility }),
      ...(input.saleMode !== undefined && { sale_mode: input.saleMode }),
      ...(input.requiresConfiguration !== undefined && { requires_configuration: input.requiresConfiguration }),
      ...(input.warrantyMonths !== undefined && { warranty_months: input.warrantyMonths }),
      ...(input.isFeatured !== undefined && { is_featured: input.isFeatured }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
      ...(input.discontinuedAt !== undefined && { discontinued_at: input.discontinuedAt }),
      ...(input.updatedBy !== undefined && { updated_by: input.updatedBy }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toProduct(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('products').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('products').set({ deleted_at: null }).where('id', '=', id).execute();
  }
  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('products').where('id', '=', id).execute();
  }

  async publish(id: string, at: Date): Promise<Product> {
    await this.db.updateTable('products')
      .set({ status: 'published', published_at: at }).where('id', '=', id).execute();
    await this.slugs.markFirstPublished(id, at);
    const row = await this.db.selectFrom('products').selectAll()
      .where('id', '=', id).executeTakeFirstOrThrow();
    return toProduct(row);
  }

  async unpublish(id: string): Promise<Product> {
    const row = await this.db.updateTable('products').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toProduct(row);
  }

  /**
   * Ngung kinh doanh KHONG PHAI la xoa.
   *
   * ADR-011: URL cua may da ngung van phai song va van index — do la trang
   * dang co backlink va thu hang tim kiem sau nhieu nam. Danh dau
   * `discontinued_at` de giao dien hien nhan va goi y may thay the, chu khong
   * chuyen huong va khong an di.
   */
  async discontinue(id: string, at: Date): Promise<Product> {
    const row = await this.db.updateTable('products').set({ discontinued_at: at })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toProduct(row);
  }

  // ── quan he: thay ca tap (ADR-008) ──────────────────────────────
  async replaceCategories(productId: string, links: readonly CategoryLink[]): Promise<void> {
    await this.db.deleteFrom('product_category_links')
      .where('product_id', '=', productId).execute();
    if (links.length === 0) return;
    await this.db.insertInto('product_category_links').values(
      links.map((l) => ({
        product_id: productId,
        category_id: l.categoryId,
        is_primary: l.isPrimary ?? false,
      })),
    ).execute();
  }

  async replaceStandards(productId: string, links: readonly StandardLink[]): Promise<void> {
    await this.db.deleteFrom('product_standards').where('product_id', '=', productId).execute();
    if (links.length === 0) return;
    await this.db.insertInto('product_standards').values(
      links.map((l, i) => ({
        product_id: productId,
        standard_id: l.standardId,
        compliance_type: l.complianceType ?? 'compliance',
        note: l.note ?? null,
        display_order: l.displayOrder ?? i,
      })),
    ).execute();
  }

  async replaceApplications(productId: string, links: readonly ApplicationLink[]): Promise<void> {
    await this.db.deleteFrom('product_applications').where('product_id', '=', productId).execute();
    if (links.length === 0) return;
    await this.db.insertInto('product_applications').values(
      links.map((l) => ({
        product_id: productId,
        application_id: l.applicationId,
        is_primary: l.isPrimary ?? false,
      })),
    ).execute();
  }

  async replaceIndustries(productId: string, links: readonly IndustryLink[]): Promise<void> {
    await this.db.deleteFrom('product_industries').where('product_id', '=', productId).execute();
    if (links.length === 0) return;
    await this.db.insertInto('product_industries').values(
      links.map((l) => ({ product_id: productId, industry_id: l.industryId })),
    ).execute();
  }

  async replaceMedia(productId: string, links: readonly ProductMediaLink[]): Promise<void> {
    await this.db.deleteFrom('product_media').where('product_id', '=', productId).execute();
    if (links.length === 0) return;
    await this.db.insertInto('product_media').values(
      links.map((l, i) => ({
        product_id: productId,
        media_id: l.mediaId,
        media_role: l.mediaRole ?? 'gallery',
        display_order: l.displayOrder ?? i,
      })),
    ).execute();
  }

  async replaceRelated(productId: string, links: readonly RelatedLink[]): Promise<void> {
    await this.db.deleteFrom('related_products').where('product_id', '=', productId).execute();
    if (links.length === 0) return;
    await this.db.insertInto('related_products').values(
      links.map((l, i) => ({
        product_id: productId,
        related_product_id: l.relatedProductId,
        relation_type: l.relationType,
        display_order: l.displayOrder ?? i,
      })),
    ).execute();
  }

  async replaceSpecifications(productId: string, rows: readonly Specification[]): Promise<void> {
    await this.db.deleteFrom('product_specifications')
      .where('product_id', '=', productId).execute();
    if (rows.length === 0) return;
    await this.db.insertInto('product_specifications').values(
      rows.map((r, i) => ({
        product_id: productId,
        group_key: r.groupKey ?? null,
        label: r.label,
        value: r.value ?? null,
        unit: r.unit ?? null,
        display_order: r.displayOrder ?? i,
      })),
    ).execute();
  }

  async findPrimaryCategoryId(productId: string): Promise<string | null> {
    const row = await this.db.selectFrom('product_category_links').select('category_id')
      .where('product_id', '=', productId).where('is_primary', '=', true)
      .executeTakeFirst();
    return row?.category_id ?? null;
  }

  // ── slug ───────────────────────────────────────────────────────
  isSlugAvailable(slug: string, exceptId?: string): Promise<boolean> {
    return this.slugs.isSlugAvailable(slug, undefined, exceptId);
  }
  assertSlugAvailable(slug: string, exceptId?: string): Promise<void> {
    return this.slugs.assertSlugAvailable(slug, undefined, exceptId);
  }
  wasEverPublished(id: string): Promise<boolean> { return this.slugs.wasEverPublished(id); }
  canHardDelete(id: string): Promise<boolean> { return this.slugs.canHardDelete(id); }
}
