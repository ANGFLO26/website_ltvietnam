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
import type { PageDao } from './dao.interface.js';
import type {
  AppPage,
  CreatePageInput,
  PageTranslation,
  PageWithTranslation,
  UpdatePageInput,
  UpsertPageTranslationInput,
} from './object.js';
import { toPage, toPageTranslation } from './mapper.js';

export class KyselyPageDao extends BaseDao implements PageDao {
  private readonly tr: TranslationSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.tr = new TranslationSupport(db, {
      parentTable: 'pages',
      trTable: 'page_translations',
      parentKey: 'page_id',
      titleColumn: 'title',
    });
  }

  async findById(id: string): Promise<AppPage | null> {
    const row = await this.db.selectFrom('pages').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toPage(row) : null;
  }

  async findByType(pageType: string): Promise<AppPage | null> {
    const row = await this.db.selectFrom('pages').selectAll()
      .where('page_type', '=', pageType).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toPage(row) : null;
  }

  /**
   * Khong phan trang. So trang tinh la mot con so nho va co gioi han tu nhien
   * (moi `page_type` mot hang, va `page_type` la UNIQUE) — phan trang o day
   * chi lam man hinh quan tri kho dung hon ma khong duoc gi.
   */
  async listAll(): Promise<AppPage[]> {
    const rows = await this.db.selectFrom('pages').selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('display_order').orderBy('page_type').execute();
    return rows.map(toPage);
  }

  async insert(input: CreatePageInput): Promise<AppPage> {
    const row = await this.db.insertInto('pages').values({
      page_type: input.pageType,
      featured_image_id: input.featuredImageId ?? null,
      is_system_page: input.isSystemPage ?? false,
      created_by: input.createdBy ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toPage(row);
  }

  /**
   * `page_type` va `is_system_page` KHONG co trong kieu cap nhat.
   *
   * `page_type` la khoa nghiep vu ma nguon tro toi — doi no la doi y nghia
   * cua hang, khong phai sua noi dung. `is_system_page` doi duoc thi ai do
   * co the ha co mot trang chinh sach roi xoa no.
   */
  async update(id: string, input: UpdatePageInput): Promise<AppPage> {
    const row = await this.db.updateTable('pages').set({
      ...(input.featuredImageId !== undefined && { featured_image_id: input.featuredImageId }),
      ...(input.displayOrder !== undefined && { display_order: input.displayOrder }),
      ...(input.updatedBy !== undefined && { updated_by: input.updatedBy }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toPage(row);
  }

  async publish(id: string, at: Date): Promise<AppPage> {
    const row = await this.db.updateTable('pages')
      .set({ status: 'published', published_at: at })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toPage(row);
  }

  async unpublish(id: string): Promise<AppPage> {
    const row = await this.db.updateTable('pages').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toPage(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('pages').set({ deleted_at: at }).where('id', '=', id).execute();
  }

  async canDelete(id: string): Promise<boolean> {
    const row = await this.db.selectFrom('pages').select('is_system_page')
      .where('id', '=', id).executeTakeFirst();
    return row ? !row.is_system_page : false;
  }

  /**
   * Trang he thong thieu ban tieng Anh da xuat ban.
   *
   * Kiem bang `NOT EXISTS` chu khong bang dem: mot trang co ban `en` o trang
   * thai `draft` VAN la thieu, va phep dem tren `page_translations` khong
   * phan biet duoc dieu do.
   */
  async findSystemPagesMissingEnglish(): Promise<string[]> {
    const r = await sql<{ page_type: string }>`
      SELECT p.page_type
      FROM ltv.pages p
      WHERE p.is_system_page = TRUE
        AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM ltv.page_translations t
          WHERE t.page_id = p.id AND t.locale = 'en' AND t.status = 'published'
        )
      ORDER BY p.page_type
    `.execute(this.db);
    return r.rows.map((x) => x.page_type);
  }

  async findBySlug(locale: Locale, slug: string): Promise<PageWithTranslation | null> {
    const tr = await this.db.selectFrom('page_translations').selectAll()
      .where('locale', '=', locale).where('slug', '=', slug).executeTakeFirst();
    if (!tr) return null;
    const p = await this.db.selectFrom('pages').selectAll()
      .where('id', '=', tr.page_id).where('deleted_at', 'is', null).executeTakeFirst();
    if (!p) return null;
    return { page: toPage(p), translation: toPageTranslation(tr) };
  }

  async findTranslation(id: string, locale: Locale): Promise<PageTranslation | null> {
    const row = await this.db.selectFrom('page_translations').selectAll()
      .where('page_id', '=', id).where('locale', '=', locale).executeTakeFirst();
    return row ? toPageTranslation(row) : null;
  }

  async upsertTranslation(
    id: string,
    input: UpsertPageTranslationInput,
  ): Promise<PageTranslation> {
    const values = {
      page_id: id,
      locale: input.locale,
      title: input.title,
      slug: input.slug,
      summary: input.summary ?? null,
      content: fromBlocks(input.content),
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
    };
    const row = await this.db.insertInto('page_translations').values(values)
      .onConflict((oc) =>
        oc.columns(['page_id', 'locale']).doUpdateSet({
          title: values.title,
          slug: values.slug,
          summary: values.summary,
          content: values.content,
          seo_title: values.seo_title,
          seo_description: values.seo_description,
        }),
      )
      .returningAll().executeTakeFirstOrThrow();
    return toPageTranslation(row);
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
