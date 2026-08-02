import { TreeDao, type TreeTableName } from '../tree.dao.js';
import { TranslationSupport, type HreflangAlternate, type Locale, type TranslationStatus } from '../translation.support.js';
import type { KyselyExecutor } from '../connection.js';
import { fromBlocks } from '../content.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { ServiceDao } from './dao.interface.js';
import type {
  CreateServiceInput,
  Service,
  ServiceFilter,
  ServiceTranslation,
  ServiceWithTranslation,
  UpdateServiceInput,
  UpsertServiceTranslationInput,
} from './object.js';
import { toService, toServiceTranslation } from './mapper.js';

/**
 * Dich vu: CAY lam lop cha, BAN DICH lam thanh phan ket hop.
 * Cung cach xep nhu `brands` (cay + slug) — mot khuon duy nhat cho ca tang.
 */
export class KyselyServiceDao extends TreeDao implements ServiceDao {
  protected readonly table: TreeTableName = 'services';
  private readonly tr: TranslationSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.tr = new TranslationSupport(db, {
      parentTable: 'services',
      trTable: 'service_translations',
      parentKey: 'service_id',
      titleColumn: 'name',
    });
  }

  // ── thuc the ───────────────────────────────────────────────────
  async findById(id: string): Promise<Service | null> {
    const row = await this.db.selectFrom('services').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toService(row) : null;
  }

  async list(filter: ServiceFilter, page?: Partial<Page>): Promise<Paged<Service>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('services').selectAll();
    let cq = this.db.selectFrom('services').select(({ fn }) => fn.countAll<string>().as('n'));

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

    const rows = await q.orderBy('display_order').orderBy('id')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toService), total, p);
  }

  async insert(input: CreateServiceInput): Promise<Service> {
    const placement = await this.computePlacement(input.parentId ?? null);
    const row = await this.db.insertInto('services').values({
      parent_id: input.parentId ?? null,
      ancestor_ids: placement.ancestorIds,
      depth: placement.depth,
      service_type: input.serviceType ?? null,
      featured_image_id: input.featuredImageId ?? null,
      created_by: input.createdBy ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toService(row);
  }

  async update(id: string, input: UpdateServiceInput): Promise<Service> {
    const row = await this.db.updateTable('services').set({
      ...(input.serviceType !== undefined && { service_type: input.serviceType }),
      ...(input.featuredImageId !== undefined && { featured_image_id: input.featuredImageId }),
      ...(input.isFeatured !== undefined && { is_featured: input.isFeatured }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
      ...(input.updatedBy !== undefined && { updated_by: input.updatedBy }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toService(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('services').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('services').set({ deleted_at: null }).where('id', '=', id).execute();
  }
  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('services').where('id', '=', id).execute();
  }

  /**
   * Xuat ban BANG CHA.
   *
   * Khong dung toi `first_published_at` — bang `services` khong co cot do, va
   * do la thiet ke dung: quy tac tai dung slug (ADR-002) gan voi SLUG, ma slug
   * nam o bang dich. Moc "lan dau cong khai" vi vay cung phai nam o do.
   */
  async publish(id: string, at: Date): Promise<Service> {
    const row = await this.db.updateTable('services')
      .set({ status: 'published', published_at: at })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toService(row);
  }

  async unpublish(id: string): Promise<Service> {
    const row = await this.db.updateTable('services').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toService(row);
  }

  // ── ban dich ───────────────────────────────────────────────────

  /**
   * Giai URL: mot truy van lay ca thuc the lan ban dich.
   *
   * KHONG loc theo `status` o day. Ly do: tang service can phan biet giua
   * "khong ton tai" (tra 404) va "ton tai nhung chua cong khai" (quan tri xem
   * truoc duoc, khach thi 404). DAO tra ve su that; quyet dinh hien hay an la
   * viec cua tang tren.
   */
  async findBySlug(locale: Locale, slug: string): Promise<ServiceWithTranslation | null> {
    const tr = await this.db.selectFrom('service_translations').selectAll()
      .where('locale', '=', locale).where('slug', '=', slug)
      .executeTakeFirst();
    if (!tr) return null;
    const s = await this.db.selectFrom('services').selectAll()
      .where('id', '=', tr.service_id).where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!s) return null;
    return { service: toService(s), translation: toServiceTranslation(tr) };
  }

  async findTranslation(id: string, locale: Locale): Promise<ServiceTranslation | null> {
    const row = await this.db.selectFrom('service_translations').selectAll()
      .where('service_id', '=', id).where('locale', '=', locale).executeTakeFirst();
    return row ? toServiceTranslation(row) : null;
  }

  /**
   * Ghi ban dich. `ON CONFLICT (service_id, locale)` — soan thao lai lan hai
   * khong tao hang moi, va khong can nguoi goi tu hoi "da co chua".
   *
   * KHONG dung toi `status`, `published_at`, `first_published_at`: sua noi dung
   * khong phai la xuat ban. Tach hai viec nay ra la co y — neu gop, thi mot
   * lan sua chinh ta cung se cap nhat `published_at` va lam sai sitemap.
   */
  async upsertTranslation(
    id: string,
    input: UpsertServiceTranslationInput,
  ): Promise<ServiceTranslation> {
    const values = {
      service_id: id,
      locale: input.locale,
      name: input.name,
      slug: input.slug,
      short_description: input.shortDescription ?? null,
      overview: fromBlocks(input.overview),
      customer_problems: fromBlocks(input.customerProblems),
      scope_of_work: fromBlocks(input.scopeOfWork),
      process: fromBlocks(input.process),
      benefits: fromBlocks(input.benefits),
      faq: fromBlocks(input.faq),
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
    };
    const row = await this.db.insertInto('service_translations').values(values)
      .onConflict((oc) =>
        oc.columns(['service_id', 'locale']).doUpdateSet({
          name: values.name,
          slug: values.slug,
          short_description: values.short_description,
          overview: values.overview,
          customer_problems: values.customer_problems,
          scope_of_work: values.scope_of_work,
          process: values.process,
          benefits: values.benefits,
          faq: values.faq,
          seo_title: values.seo_title,
          seo_description: values.seo_description,
        }),
      )
      .returningAll().executeTakeFirstOrThrow();
    return toServiceTranslation(row);
  }

  listTranslations(id: string): Promise<TranslationStatus[]> {
    return this.tr.listTranslations(id);
  }
  publishTranslation(id: string, locale: Locale, at: Date): Promise<void> {
    return this.tr.publishTranslation(id, locale, at);
  }
  unpublishTranslation(id: string, locale: Locale): Promise<void> {
    return this.tr.unpublishTranslation(id, locale);
  }
  deleteTranslation(id: string, locale: Locale): Promise<void> {
    return this.tr.deleteTranslation(id, locale);
  }
  hreflangAlternates(id: string): Promise<HreflangAlternate[]> {
    return this.tr.hreflangAlternates(id);
  }
  publishedLocales(id: string): Promise<Locale[]> {
    return this.tr.publishedLocales(id);
  }
  isLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<boolean> {
    return this.tr.isLocaleSlugAvailable(locale, slug, exceptId);
  }
  assertLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<void> {
    return this.tr.assertLocaleSlugAvailable(locale, slug, exceptId);
  }
}
