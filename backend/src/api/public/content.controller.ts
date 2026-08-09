import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@ltv/contracts';
import { DomainError, NotFoundError } from '../../shared/errors.js';
import { page, type Page } from '../../shared/http/envelope.js';
import { Public } from '../admin/auth.guard.js';
import { SlugPipe } from '../../shared/http/slug.pipe.js';
import { CONTENT_SERVICE, type ContentService } from '../../services/content/interface.js';
import type { PagedResult } from '../../services/taxonomy/interface.js';

/**
 * NOI DUNG CO BAN DICH — F3.
 *
 * `?locale=vi|en`, mac dinh `en` (ADR-001: tieng Anh o goc, tieng Viet o `/vi`).
 *
 * Vi sao locale la THAM SO TRUY VAN chu khong phai tien to duong dan: URL cong
 * khai co tien to (`/vi/tin-tuc/...`) nhung do la URL cua FRONTEND. API phang
 * (ADR-001), va frontend giai locale tu URL cua no roi noi vao day. Nhan them
 * `/api/v1/vi/...` se tao hai cach viet cho cung mot endpoint, va Luat 16 se
 * phai khai bao ca hai.
 */
@Public()
@Controller()
export class ContentController {
  constructor(@Inject(CONTENT_SERVICE) private readonly cs: ContentService) {}

  // ══════════════════════════ pages ══════════════════════════
  @Get('pages/:slug')
  async page(@Param('slug', SlugPipe) slug: string, @Query() q: unknown) {
    const dto = doc(localeQuery, q);
    return khongRong(await this.cs.findPage(dto.locale, slug), 'PAGE', slug);
  }

  // ══════════════════════════ services ══════════════════════════
  @Get('services')
  async services(@Query() q: unknown) {
    const dto = doc(featuredQuery, q);
    return toPage(await this.cs.listServices(dto.locale, { featured: dto.featured }, dto));
  }

  /** TRUOC `:slug` — neu khong thi `tree` bi hieu la mot slug. */
  @Get('services/tree')
  async serviceTree(@Query() q: unknown) {
    return this.cs.serviceTree(doc(localeQuery, q).locale);
  }

  @Get('services/:slug')
  async service(@Param('slug', SlugPipe) slug: string, @Query() q: unknown) {
    const dto = doc(localeQuery, q);
    return khongRong(await this.cs.findService(dto.locale, slug), 'SERVICE', slug);
  }

  // ══════════════════════════ projects ══════════════════════════
  @Get('projects')
  async projects(@Query() q: unknown) {
    const dto = doc(projectQuery, q);
    return toPage(
      await this.cs.listProjects(
        dto.locale,
        { projectType: dto.type, featured: dto.featured },
        dto,
      ),
    );
  }

  @Get('projects/:slug')
  async project(@Param('slug', SlugPipe) slug: string, @Query() q: unknown) {
    const dto = doc(localeQuery, q);
    return khongRong(await this.cs.findProject(dto.locale, slug), 'PROJECT', slug);
  }

  // ══════════════════════════ posts ══════════════════════════
  @Get('posts')
  async posts(@Query() q: unknown) {
    const dto = doc(postQuery, q);
    const r = await this.cs.listPosts(dto.locale, { categorySlug: dto.category }, dto);
    /**
     * `null` = DANH MUC trong bo loc khong ton tai -> 404.
     *
     * Khong phai "khong co bai nao" (mang rong). Bo qua mot bo loc khong giai
     * duoc se tra ve TOAN BO bai viet, va nguoi dung thay "bo loc khong co tac
     * dung" chu khong thay "danh muc nay khong ton tai".
     */
    if (r === null) throw new NotFoundError('POST_CATEGORY_NOT_FOUND', `Khong tim thay danh muc`);
    return toPage(r);
  }

  @Get('posts/:slug')
  async post(@Param('slug', SlugPipe) slug: string, @Query() q: unknown) {
    const dto = doc(localeQuery, q);
    return khongRong(await this.cs.findPost(dto.locale, slug), 'POST', slug);
  }

  // ══════════ post categories (KHONG co ban dich — ADR-014) ══════════
  @Get('post-categories')
  async postCategories(@Query() q: unknown) {
    const dto = doc(coBanQuery, q);
    return toPage(await this.cs.listPostCategories(dto));
  }

  @Get('post-categories/:slug/posts')
  async postsOfCategory(@Param('slug', SlugPipe) slug: string, @Query() q: unknown) {
    const dto = doc(phanTrangQuery, q);
    const r = await this.cs.postsOfCategory(dto.locale, slug, dto);
    if (r === null) throw new NotFoundError('POST_CATEGORY_NOT_FOUND', `Khong tim thay "${slug}"`);
    return toPage(r);
  }

  // ══════════ documents (KHONG co ban dich — ADR-014) ══════════
  @Get('documents')
  async documents(@Query() q: unknown) {
    const dto = doc(documentQuery, q);
    return toPage(await this.cs.listDocuments({ documentType: dto.type }, dto));
  }

  @Get('documents/:slug')
  async document(@Param('slug', SlugPipe) slug: string) {
    return khongRong(await this.cs.findDocument(slug), 'DOCUMENT', slug);
  }

  // ══════════════════════════ nganh -> dich vu ══════════════════════════
  /**
   * CHUYEN TU F1 SANG DAY — mot dinh chinh pham vi.
   *
   * Endpoint tra ve DICH VU, va dich vu la nhom co ban dich: doc cong khai can
   * locale + chi tra translation da publish (ADR-004). Toan bo duong do la viec
   * cua F3. Xep no o F1 nghia la F1 phai dung mot nua duong dich roi F3 viet lai.
   */
  @Get('industries/:slug/services')
  async industryServices(@Param('slug', SlugPipe) slug: string, @Query() q: unknown) {
    const dto = doc(phanTrangQuery, q);
    const r = await this.cs.servicesOfIndustry(dto.locale, slug, dto);
    if (r === null) throw new NotFoundError('INDUSTRY_NOT_FOUND', `Khong tim thay "${slug}"`);
    return toPage(r);
  }
}

// ─────────────────────── tham so truy van ───────────────────────
/**
 * `locale` co MAC DINH o tang HTTP, KHONG co mac dinh o tang service.
 *
 * Hai cho khac nhau va do la co y: mot yeu cau HTTP khong ghi locale la mot yeu
 * cau hop le (frontend tieng Anh khong can ghi), nen o day mac dinh `en` la
 * dung. Nhung `ContentService` bat buoc phai nhan locale — neu no cung co mac
 * dinh thi mot cho quen truyen se lang le doc tieng Anh cho nguoi dung Viet,
 * trang hien ra binh thuong va khong loi nao.
 */
const loc = {
  locale: z
    .enum(LOCALES as unknown as [Locale, ...Locale[]])
    .default(DEFAULT_LOCALE),
};

const phanTrang = {
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(100).optional(),
};

const localeQuery = z.object({ ...loc }).strict();
const coBanQuery = z.object({ ...phanTrang }).strict();
const phanTrangQuery = z.object({ ...loc, ...phanTrang }).strict();

/**
 * `featured` nhan `true`/`false` TUONG MINH, khong nhan "co mat la true".
 *
 * Cung ly do da ghi o `taxonomy.controller.ts`: `?featured` tran thanh chuoi
 * rong, va coi chuoi rong la `true` se lam `?featured` va `?featured=false` cho
 * ket qua nguoc nhau ma khong ai doan duoc.
 */
const coFeatured = {
  featured: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
};

const featuredQuery = z.object({ ...loc, ...phanTrang, ...coFeatured }).strict();

const projectQuery = z
  .object({
    ...loc,
    ...phanTrang,
    ...coFeatured,
    type: z.string().min(1).max(50).optional(),
  })
  .strict();

const postQuery = z
  .object({ ...loc, ...phanTrang, category: z.string().min(1).max(255).optional() })
  .strict();

const documentQuery = z
  .object({ ...phanTrang, type: z.string().min(1).max(50).optional() })
  .strict();

function doc<S extends z.ZodTypeAny>(
  schema: S,
  q: unknown,
): z.infer<S> & { page?: number | undefined; pageSize?: number | undefined } {
  const r = schema.safeParse(q);
  if (!r.success) {
    throw new DomainError(
      'VALIDATION_FAILED',
      'Tham so truy van khong hop le',
      'VALIDATION_FAILED',
      { fields: r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) },
    );
  }
  const d = r.data as z.infer<S> & { page?: number; page_size?: number };
  return { ...d, pageSize: d.page_size };
}

function toPage<T>(r: PagedResult<T>): Page<T> {
  return page(r.items, { page: r.page, pageSize: r.pageSize, totalItems: r.totalItems });
}

/** `null` tu service -> 404 voi ma nghiep vu rieng cho tung nhom. */
function khongRong<T>(v: T | null, loai: string, slug: string): T {
  if (v === null) {
    throw new NotFoundError(`${loai}_NOT_FOUND`, `Khong tim thay "${slug}"`);
  }
  return v;
}
