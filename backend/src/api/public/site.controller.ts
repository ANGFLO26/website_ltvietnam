import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  DEFAULT_LOCALE,
  LOCALES,
  type CustomerView,
  type HomeView,
  type Locale,
  type NavLocation,
  type NavigationView,
  type OfficeView,
  type SearchHitView,
} from '@ltv/contracts';
import { DomainError } from '../../shared/errors.js';
import { page, type Page } from '../../shared/http/envelope.js';
import { SlugPipe } from '../../shared/http/slug.pipe.js';
import { Public } from '../admin/auth.guard.js';
import { SITE_SERVICE, type SiteService } from '../../services/site/interface.js';
import type { PagedResult } from '../../services/taxonomy/interface.js';

/**
 * KHUNG SITE — F4: nam endpoint.
 *
 * Cung quy uoc voi ba controller truoc: `?locale=vi|en` mac dinh `en`, vo phan hoi
 * do `EnvelopeInterceptor` dat, va `@Public()` o cap lop vi ca nam duong deu cong
 * khai.
 */
@Public()
@Controller()
export class SiteController {
  constructor(@Inject(SITE_SERVICE) private readonly site: SiteService) {}

  @Get('home')
  async home(@Query() q: unknown): Promise<HomeView> {
    return this.site.home(doc(localeQuery, q).locale);
  }

  /**
   * `location` la ENUM, khong phai slug — nen no qua HAI cua kiem.
   *
   * `SlugPipe` chan byte NUL va chuoi qua dai (Luat 17: moi `@Param` phai co pipe;
   * mot `%00` trong duong dan tung thanh HTTP 500 vi `pg` tu choi byte do). Nhung
   * `SlugPipe` KHONG biet ba gia tri hop le cua vi tri dieu huong, nen zod kiem
   * tiep — va sai gia tri la 400 kem thong bao, khong phai mot menu rong.
   *
   * Mot menu rong cho gia tri go sai la truong hop toi te nhat: frontend ve mot
   * thanh dieu huong trong, trang van 200, va khong co gi de tim.
   */
  @Get('navigation/:location')
  async navigation(
    @Param('location', SlugPipe) location: string,
    @Query() q: unknown,
  ): Promise<NavigationView> {
    const r = navLocation.safeParse(location);
    if (!r.success) {
      throw new DomainError(
        'VALIDATION_FAILED',
        `Vi tri dieu huong khong hop le: "${location}"`,
        'VALIDATION_FAILED',
        { fields: [{ field: 'location', message: 'phai la header | mobile | footer' }] },
      );
    }
    return this.site.navigation(r.data, doc(localeQuery, q).locale);
  }

  @Get('customers')
  async customers(@Query() q: unknown): Promise<readonly CustomerView[]> {
    return this.site.customers(doc(customerQuery, q).limit);
  }

  @Get('offices')
  async offices(): Promise<readonly OfficeView[]> {
    return this.site.offices();
  }

  @Get('search')
  async search(@Query() q: unknown): Promise<Page<SearchHitView>> {
    const dto = doc(searchQuery, q);
    return toPage(await this.site.search(dto.q, dto.locale, dto));
  }
}

// ─────────────────────── tham so truy van ───────────────────────
const loc = {
  locale: z.enum(LOCALES as unknown as [Locale, ...Locale[]]).default(DEFAULT_LOCALE),
};

const localeQuery = z.object({ ...loc }).strict();

const navLocation: z.ZodType<NavLocation> = z.enum(['header', 'mobile', 'footer']);

const customerQuery = z
  .object({ limit: z.coerce.number().int().min(1).max(100).optional() })
  .strict();

/**
 * `q` TOI THIEU HAI ky tu.
 *
 * `q=a` sinh ra `ILIKE '%a%'` tren nam truong cong ba truy van con — khop gan het
 * catalogue, tra ve mot trang ket qua vo nghia, va lam viec do that su ton kem.
 * Mot ky tu khong phai mot y dinh tim kiem; do la trang thai giua hai lan bam.
 *
 * Tra 400 chu khong tra mang rong: frontend chi nen goi tu ky tu thu hai, va mot
 * mang rong se lam no tuong "khong co ket qua" roi hien dung cau do cho nguoi
 * dung — sai thong tin, va khong ai biet.
 */
const searchQuery = z
  .object({
    ...loc,
    q: z.string().trim().min(2).max(120),
    page: z.coerce.number().int().min(1).optional(),
    page_size: z.coerce.number().int().min(1).max(100).optional(),
  })
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
