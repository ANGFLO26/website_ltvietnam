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
import type { PostDao } from './dao.interface.js';
import type {
  CreatePostInput,
  Post,
  PostFilter,
  PostLinks,
  PostTranslation,
  PostWithTranslation,
  UpdatePostInput,
  UpsertPostTranslationInput,
} from './object.js';
import { toPost, toPostTranslation } from './mapper.js';

export class KyselyPostDao extends BaseDao implements PostDao {
  private readonly tr: TranslationSupport;

  constructor(db: KyselyExecutor) {
    super(db);
    this.tr = new TranslationSupport(db, {
      parentTable: 'posts',
      trTable: 'post_translations',
      parentKey: 'post_id',
      titleColumn: 'title',
    });
  }

  async findById(id: string): Promise<Post | null> {
    const row = await this.db.selectFrom('posts').selectAll()
      .where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst();
    return row ? toPost(row) : null;
  }

  async list(filter: PostFilter, page?: Partial<Page>): Promise<Paged<Post>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('posts').selectAll();
    let cq = this.db.selectFrom('posts').select(({ fn }) => fn.countAll<string>().as('n'));
    if (!filter.includeDeleted) { q = q.where('deleted_at', 'is', null); cq = cq.where('deleted_at', 'is', null); }
    if (filter.status) { q = q.where('status', '=', filter.status); cq = cq.where('status', '=', filter.status); }
    if (filter.categoryId) { q = q.where('category_id', '=', filter.categoryId); cq = cq.where('category_id', '=', filter.categoryId); }
    if (filter.isFeatured !== undefined) {
      q = q.where('is_featured', '=', filter.isFeatured);
      cq = cq.where('is_featured', '=', filter.isFeatured);
    }
    // Bai moi len truoc; `id` giu thu tu on dinh giua cac trang.
    const rows = await q.orderBy('published_at', 'desc').orderBy('id')
      .limit(p.pageSize).offset(offsetOf(p)).execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toPost), total, p);
  }

  async insert(input: CreatePostInput): Promise<Post> {
    const row = await this.db.insertInto('posts').values({
      category_id: input.categoryId,
      featured_image_id: input.featuredImageId ?? null,
      author_id: input.authorId ?? null,
    }).returningAll().executeTakeFirstOrThrow();
    return toPost(row);
  }

  async update(id: string, input: UpdatePostInput): Promise<Post> {
    const row = await this.db.updateTable('posts').set({
      ...(input.categoryId !== undefined && { category_id: input.categoryId }),
      ...(input.featuredImageId !== undefined && { featured_image_id: input.featuredImageId }),
      ...(input.authorId !== undefined && { author_id: input.authorId }),
      ...(input.isFeatured !== undefined && { is_featured: input.isFeatured }),
    }).where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toPost(row);
  }

  async softDelete(id: string, at: Date): Promise<void> {
    await this.db.updateTable('posts').set({ deleted_at: at }).where('id', '=', id).execute();
  }
  async restore(id: string): Promise<void> {
    await this.db.updateTable('posts').set({ deleted_at: null }).where('id', '=', id).execute();
  }
  async hardDelete(id: string): Promise<void> {
    await this.db.deleteFrom('posts').where('id', '=', id).execute();
  }

  async publish(id: string, at: Date): Promise<Post> {
    const row = await this.db.updateTable('posts')
      .set({ status: 'published', published_at: at })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toPost(row);
  }

  async unpublish(id: string): Promise<Post> {
    const row = await this.db.updateTable('posts').set({ status: 'hidden' })
      .where('id', '=', id).returningAll().executeTakeFirstOrThrow();
    return toPost(row);
  }

  // ── ban dich ───────────────────────────────────────────────────
  async findBySlug(locale: Locale, slug: string): Promise<PostWithTranslation | null> {
    const tr = await this.db.selectFrom('post_translations').selectAll()
      .where('locale', '=', locale).where('slug', '=', slug).executeTakeFirst();
    if (!tr) return null;
    const p = await this.db.selectFrom('posts').selectAll()
      .where('id', '=', tr.post_id).where('deleted_at', 'is', null).executeTakeFirst();
    if (!p) return null;
    return { post: toPost(p), translation: toPostTranslation(tr) };
  }

  async findTranslation(id: string, locale: Locale): Promise<PostTranslation | null> {
    const row = await this.db.selectFrom('post_translations').selectAll()
      .where('post_id', '=', id).where('locale', '=', locale).executeTakeFirst();
    return row ? toPostTranslation(row) : null;
  }

  async upsertTranslation(
    id: string,
    input: UpsertPostTranslationInput,
  ): Promise<PostTranslation> {
    const values = {
      post_id: id,
      locale: input.locale,
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt ?? null,
      content: fromBlocks(input.content),
      seo_title: input.seoTitle ?? null,
      seo_description: input.seoDescription ?? null,
    };
    const row = await this.db.insertInto('post_translations').values(values)
      .onConflict((oc) =>
        oc.columns(['post_id', 'locale']).doUpdateSet({
          title: values.title,
          slug: values.slug,
          excerpt: values.excerpt,
          content: values.content,
          seo_title: values.seo_title,
          seo_description: values.seo_description,
        }),
      )
      .returningAll().executeTakeFirstOrThrow();
    return toPostTranslation(row);
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

  // ── quan he: thay ca tap (ADR-008) ──────────────────────────────

  /**
   * Bon nhom quan he trong MOT lan goi.
   *
   * Vi sao khong tach thanh bon ham: chung luon doi cung nhau khi soan thao
   * luu bai. Goi bon lan thi nguoi goi phai nho boc ca bon vao transaction,
   * ma quen mot cai thi bai viet o trang thai nua voi. Mot ham thi khong
   * quen duoc.
   *
   * `undefined` nghia la "khong dong toi nhom nay"; mang rong nghia la
   * "xoa het". Hai y nghia khac nhau, va gop chung lai la cach de mat du lieu.
   */
  async replaceLinks(id: string, links: PostLinks): Promise<void> {
    if (links.productIds !== undefined) {
      await this.db.deleteFrom('post_products').where('post_id', '=', id).execute();
      if (links.productIds.length > 0) {
        await this.db.insertInto('post_products')
          .values(links.productIds.map((x) => ({ post_id: id, product_id: x }))).execute();
      }
    }
    if (links.serviceIds !== undefined) {
      await this.db.deleteFrom('post_services').where('post_id', '=', id).execute();
      if (links.serviceIds.length > 0) {
        await this.db.insertInto('post_services')
          .values(links.serviceIds.map((x) => ({ post_id: id, service_id: x }))).execute();
      }
    }
    if (links.projectIds !== undefined) {
      await this.db.deleteFrom('post_projects').where('post_id', '=', id).execute();
      if (links.projectIds.length > 0) {
        await this.db.insertInto('post_projects')
          .values(links.projectIds.map((x) => ({ post_id: id, project_id: x }))).execute();
      }
    }
    if (links.brandIds !== undefined) {
      await this.db.deleteFrom('post_brands').where('post_id', '=', id).execute();
      if (links.brandIds.length > 0) {
        await this.db.insertInto('post_brands')
          .values(links.brandIds.map((x) => ({ post_id: id, brand_id: x }))).execute();
      }
    }
  }

  async replaceMedia(id: string, mediaIds: readonly string[]): Promise<void> {
    await this.db.deleteFrom('post_media').where('post_id', '=', id).execute();
    if (mediaIds.length === 0) return;
    await this.db.insertInto('post_media')
      .values(mediaIds.map((m, i) => ({ post_id: id, media_id: m, display_order: i }))).execute();
  }

  async findLinks(id: string): Promise<Required<PostLinks>> {
    const [pr, sv, pj, br] = [
      await this.db.selectFrom('post_products').select('product_id').where('post_id', '=', id).execute(),
      await this.db.selectFrom('post_services').select('service_id').where('post_id', '=', id).execute(),
      await this.db.selectFrom('post_projects').select('project_id').where('post_id', '=', id).execute(),
      await this.db.selectFrom('post_brands').select('brand_id').where('post_id', '=', id).execute(),
    ];
    return {
      productIds: pr.map((x) => x.product_id),
      serviceIds: sv.map((x) => x.service_id),
      projectIds: pj.map((x) => x.project_id),
      brandIds: br.map((x) => x.brand_id),
    };
  }
}
