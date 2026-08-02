import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import {
  TranslationSupport,
  type HreflangAlternate,
  type Locale,
  type TranslationStatus,
} from '../translation.support.js';
import type { KyselyExecutor } from '../connection.js';
import { fromBlocks } from '../content.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { ProjectDao } from './dao.interface.js';
import type {
  CreateProjectInput,
  Project,
  ProjectFilter,
  ProjectLinks,
  ProjectTranslation,
  ProjectWithTranslation,
  UpdateProjectInput,
  UpsertProjectTranslationInput,
} from './object.js';
import { toProject, toProjectTranslation } from './mapper.js';

export class KyselyProjectDao extends BaseDao implements ProjectDao {
  private readonly tr: TranslationSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.tr = new TranslationSupport(db, {
      parentTable: 'projects',
      trTable: 'project_translations',
      parentKey: 'project_id',
      titleColumn: 'title',
    });
  }

  async findById(id: string): Promise<Project | null> {
    const row = await this.db.selectFrom('projects').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toProject(row) : null;
  }

  async list(filter: ProjectFilter, page?: Partial<Page>): Promise<Paged<Project>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('projects').selectAll();
    let cq = this.db.selectFrom('projects').select(({ fn }) => fn.countAll<string>().as('n'));
    if (!filter.includeDeleted) { q = q.where('deleted_at', 'is', null); cq = cq.where('deleted_at', 'is', null); }
    if (filter.status) { q = q.where('status', '=', filter.status); cq = cq.where('status', '=', filter.status); }
    if (filter.projectType) { q = q.where('project_type', '=', filter.projectType); cq = cq.where('project_type', '=', filter.projectType); }
    if (filter.isFeatured !== undefined) {
      q = q.where('is_featured', '=', filter.isFeatured);
      cq = cq.where('is_featured', '=', filter.isFeatured);
    }
    const rows = await q.orderBy('completed_at', 'desc').orderBy('id')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toProject), total, p);
  }

  async insert(input: CreateProjectInput): Promise<Project> {
    const row = await this.db.insertInto('projects').values({
      project_type: input.projectType,
      customer_id: input.customerId ?? null,
      // Mac dinh la `public` theo so do. Day la mot mac dinh toi KHONG thich
      // (an toan hon la `hide_name`), nhung doi no la doi so do va anh huong
      // ADR-013 baseline. Da ghi vao `05` de ban quyet dinh o P4.
      ...(input.customerVisibility !== undefined && { customer_visibility: input.customerVisibility }),
      location_text: input.locationText ?? null,
      country_code: input.countryCode ?? null,
      started_at: input.startedAt ?? null,
      completed_at: input.completedAt ?? null,
      featured_image_id: input.featuredImageId ?? null,
      created_by: input.createdBy ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toProject(row);
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const row = await this.db.updateTable('projects').set({
      ...(input.projectType !== undefined && { project_type: input.projectType }),
      ...(input.customerId !== undefined && { customer_id: input.customerId }),
      ...(input.customerVisibility !== undefined && { customer_visibility: input.customerVisibility }),
      ...(input.locationText !== undefined && { location_text: input.locationText }),
      ...(input.countryCode !== undefined && { country_code: input.countryCode }),
      ...(input.startedAt !== undefined && { started_at: input.startedAt }),
      ...(input.completedAt !== undefined && { completed_at: input.completedAt }),
      ...(input.featuredImageId !== undefined && { featured_image_id: input.featuredImageId }),
      ...(input.isFeatured !== undefined && { is_featured: input.isFeatured }),
      ...(input.updatedBy !== undefined && { updated_by: input.updatedBy }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toProject(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('projects').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('projects').set({ deleted_at: null }).where('id', '=', id).execute();
  }

  async publish(id: string, at: Date): Promise<Project> {
    const row = await this.db.updateTable('projects')
      .set({ status: 'published', published_at: at })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toProject(row);
  }

  async unpublish(id: string): Promise<Project> {
    const row = await this.db.updateTable('projects').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toProject(row);
  }

  /**
   * TEN KHACH HANG DUOC PHEP HIEN — cong duy nhat.
   *
   * Bang quyet dinh, theo dung `customer_visibility`:
   *
   *   confidential   -> null, luon luon. Ke ca khi bien tap da go ten vao
   *                     `customer_display_name`: co the ho go truoc khi hop
   *                     dong doi sang NDA. Cot muc do la trong tai cuoi.
   *   industry_only  -> ten nganh, khong phai ten khach
   *   hide_name      -> ten hien thi do bien tap dat, KHONG lay ten that
   *   public         -> ten hien thi neu co, neu khong thi ten that
   *
   * Vi sao `confidential` bo qua ca `customer_display_name`: neu de lot, thi
   * mot du an bi chuyen sang mat sau khi da viet noi dung se van hien ten cu
   * — va khong ai nho quay lai xoa o do.
   */
  async resolvePublicCustomerName(id: string, locale: Locale): Promise<string | null> {
    const r = await sql<{
      visibility: string; display_name: string | null;
      customer_name: string | null; industry_name: string | null;
    }>`
      SELECT p.customer_visibility AS visibility,
             t.customer_display_name AS display_name,
             c.name AS customer_name,
             i.name AS industry_name
      FROM ltv.projects p
      LEFT JOIN ltv.project_translations t ON t.project_id = p.id AND t.locale = ${locale}
      LEFT JOIN ltv.customers  c ON c.id = p.customer_id AND c.deleted_at IS NULL
      LEFT JOIN ltv.industries i ON i.id = c.industry_id AND i.deleted_at IS NULL
      WHERE p.id = ${id} AND p.deleted_at IS NULL
    `.execute(this.db);

    const row = r.rows[0];
    if (!row) return null;

    switch (row.visibility) {
      case 'confidential':
        return null;
      case 'industry_only':
        return row.industry_name;
      case 'hide_name':
        return row.display_name;
      case 'public':
        return row.display_name ?? row.customer_name;
      default:
        // Gia tri la trong cot muc do — chon phia an toan, khong phia tien loi.
        return null;
    }
  }

  // ── ban dich ───────────────────────────────────────────────────
  async findBySlug(locale: Locale, slug: string): Promise<ProjectWithTranslation | null> {
    const tr = await this.db.selectFrom('project_translations').selectAll()
      .where('locale', '=', locale).where('slug', '=', slug).executeTakeFirst();
    if (!tr) return null;
    const p = await this.db.selectFrom('projects').selectAll()
      .where('id', '=', tr.project_id).where('deleted_at', 'is', null).executeTakeFirst();
    if (!p) return null;
    return { project: toProject(p), translation: toProjectTranslation(tr) };
  }

  async findTranslation(id: string, locale: Locale): Promise<ProjectTranslation | null> {
    const row = await this.db.selectFrom('project_translations').selectAll()
      .where('project_id', '=', id).where('locale', '=', locale).executeTakeFirst();
    return row ? toProjectTranslation(row) : null;
  }

  async upsertTranslation(
    id: string,
    input: UpsertProjectTranslationInput,
  ): Promise<ProjectTranslation> {
    const values = {
      project_id: id,
      locale: input.locale,
      title: input.title,
      slug: input.slug,
      short_description: input.shortDescription ?? null,
      scope_of_work: fromBlocks(input.scopeOfWork),
      implementation: fromBlocks(input.implementation),
      result: fromBlocks(input.result),
      customer_display_name: input.customerDisplayName ?? null,
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
    };
    const row = await this.db.insertInto('project_translations').values(values)
      .onConflict((oc) =>
        oc.columns(['project_id', 'locale']).doUpdateSet({
          title: values.title,
          slug: values.slug,
          short_description: values.short_description,
          scope_of_work: values.scope_of_work,
          implementation: values.implementation,
          result: values.result,
          customer_display_name: values.customer_display_name,
          seo_title: values.seo_title,
          seo_description: values.seo_description,
        }),
      )
      .returningAll().executeTakeFirstOrThrow();
    return toProjectTranslation(row);
  }

  listTranslations(id: string): Promise<TranslationStatus[]> { return this.tr.listTranslations(id); }
  publishTranslation(id: string, locale: Locale, at: Date): Promise<void> {
    return this.tr.publishTranslation(id, locale, at);
  }
  unpublishTranslation(id: string, locale: Locale): Promise<void> {
    return this.tr.unpublishTranslation(id, locale);
  }
  hreflangAlternates(id: string): Promise<HreflangAlternate[]> { return this.tr.hreflangAlternates(id); }
  publishedLocales(id: string): Promise<Locale[]> { return this.tr.publishedLocales(id); }
  isLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<boolean> {
    return this.tr.isLocaleSlugAvailable(locale, slug, exceptId);
  }
  assertLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<void> {
    return this.tr.assertLocaleSlugAvailable(locale, slug, exceptId);
  }

  // ── quan he ────────────────────────────────────────────────────
  async replaceLinks(id: string, links: ProjectLinks): Promise<void> {
    if (links.productIds !== undefined) {
      await this.db.deleteFrom('project_products').where('project_id', '=', id).execute();
      if (links.productIds.length > 0) {
        await this.db.insertInto('project_products')
          .values(links.productIds.map((x, i) => ({ project_id: id, product_id: x, display_order: i })))
          .execute();
      }
    }
    if (links.serviceIds !== undefined) {
      await this.db.deleteFrom('project_services').where('project_id', '=', id).execute();
      if (links.serviceIds.length > 0) {
        await this.db.insertInto('project_services')
          .values(links.serviceIds.map((x) => ({ project_id: id, service_id: x }))).execute();
      }
    }
    if (links.brandIds !== undefined) {
      await this.db.deleteFrom('project_brands').where('project_id', '=', id).execute();
      if (links.brandIds.length > 0) {
        await this.db.insertInto('project_brands')
          .values(links.brandIds.map((x) => ({ project_id: id, brand_id: x }))).execute();
      }
    }
  }

  async replaceMedia(
    id: string,
    media: readonly { mediaId: string; caption?: string | null }[],
  ): Promise<void> {
    await this.db.deleteFrom('project_media').where('project_id', '=', id).execute();
    if (media.length === 0) return;
    await this.db.insertInto('project_media').values(
      media.map((m, i) => ({
        project_id: id, media_id: m.mediaId, caption: m.caption ?? null, display_order: i,
      })),
    ).execute();
  }

  async findLinks(id: string): Promise<Required<ProjectLinks>> {
    const pr = await this.db.selectFrom('project_products').select('product_id').where('project_id', '=', id).execute();
    const sv = await this.db.selectFrom('project_services').select('service_id').where('project_id', '=', id).execute();
    const br = await this.db.selectFrom('project_brands').select('brand_id').where('project_id', '=', id).execute();
    return {
      productIds: pr.map((x) => x.product_id),
      serviceIds: sv.map((x) => x.service_id),
      brandIds: br.map((x) => x.brand_id),
    };
  }

  /** Dieu kien publish (`05` PHAN IV): du an phai co it nhat mot anh. */
  async countMedia(id: string): Promise<number> {
    const r = await sql<{ n: string }>`
      SELECT count(*) AS n FROM ltv.project_media WHERE project_id = ${id}
    `.execute(this.db);
    return Number(r.rows[0]?.n ?? 0);
  }
}
