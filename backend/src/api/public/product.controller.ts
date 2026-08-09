import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import type { ProductCardView, ProductDetailView, ProductLandingView } from '@ltv/contracts';
import { DomainError, NotFoundError } from '../../shared/errors.js';
import { page, type Page } from '../../shared/http/envelope.js';
import { Public } from '../admin/auth.guard.js';
import {
  PRODUCT_QUERY_SERVICE,
  type ProductQueryService,
} from '../../services/products/interface.js';

/**
 * BA ENDPOINT SAN PHAM — F2.
 *
 * `doc/06` PHAN XV muc 2: `GET /products/landing` la endpoint RIENG cho trang
 * `/products`, KHONG dung `GET /home`. Hai trang can hai tap du lieu khac nhau;
 * dung chung mot endpoint nghia la mot trong hai luon nhan thu no khong dung.
 */
@Public()
@Controller('products')
export class ProductController {
  constructor(@Inject(PRODUCT_QUERY_SERVICE) private readonly ps: ProductQueryService) {}

  /**
   * PHAI khai bao TRUOC `:slug` — day khong phai so thich, la mot loi cho san.
   *
   * Express chon route dang ky TRUOC. Neu `:slug` dung truoc thi `/products/landing`
   * duoc hieu la mot san pham co slug `landing`, tra 404 — va 404 do rat kho lan
   * vi CA HAI route deu "dung". `API_ENDPOINTS` khai bao cung thu tu nay va Luat
   * 16 kiem no, nen hai noi khong the lech nhau.
   */
  @Get('landing')
  async landing(): Promise<ProductLandingView> {
    return this.ps.landing();
  }

  @Get()
  async list(@Query() q: unknown): Promise<Page<ProductCardView>> {
    const dto = doc(productQuery, q);
    const r = await this.ps.list(
      {
        brandSlugs: dto.brand,
        categorySlugs: dto.category,
        applicationSlugs: dto.application,
        industrySlugs: dto.industry,
        standardSlugs: dto.standard,
        search: dto.q,
        featured: dto.featured,
      },
      dto.sort,
      { page: dto.page, pageSize: dto.page_size },
    );
    return page(r.items, {
      page: r.page,
      pageSize: r.pageSize,
      totalItems: r.totalItems,
    });
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string): Promise<ProductDetailView> {
    const r = await this.ps.findBySlug(slug);
    /**
     * San pham NGUNG KINH DOANH KHONG tra 404 — ADR-011.
     *
     * Chi `status !== 'published'` va da xoa moi cho ra 404 (service lo viec do).
     * Ngung kinh doanh thi van 200, kem co `discontinued` va `related` de trang
     * hien dai bao cong goi y hang thay the. Tra 404 cho chung se lam chet ~200
     * URL cu ma bang `redirects` dang co giu.
     */
    if (!r) throw new NotFoundError('PRODUCT_NOT_FOUND', `Khong tim thay san pham "${slug}"`);
    return r;
  }
}

// ─────────────────────── tham so truy van ───────────────────────
/**
 * `?brand=pac&brand=herzog` — KHOA LAP LAI, khong phai chuoi phay.
 *
 * `doc/06` PHAN VII chot cach viet nay (ADR-007). Ly do thuc te: slug co the
 * chua dau phay o mot ngon ngu khac, va tach theo phay se lam mot slug hop le
 * thanh hai slug rac. Khoa lap lai khong co su nhap nhang do.
 *
 * Express dua `?brand=pac` thanh chuoi va `?brand=pac&brand=herzog` thanh mang.
 * `bocMang` chuan hoa CA HAI thanh mang — neu khong thi loc mot hang hoat dong
 * khac loc hai hang, va do la loai loi chi lo ra khi nguoi dung bo chon mot o.
 */
const bocMang = z
  .union([z.string().min(1).max(255), z.array(z.string().min(1).max(255)).max(20)])
  .transform((v) => (Array.isArray(v) ? v : [v]))
  .optional();

const productQuery = z
  .object({
    brand: bocMang,
    category: bocMang,
    application: bocMang,
    industry: bocMang,
    standard: bocMang,
    q: z.string().min(1).max(200).optional(),
    featured: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
    /**
     * Ba gia tri NGU NGHIA, khong phai ten cot.
     *
     * Pho `published_at` / `display_order` ra URL cong khai thi doi cot la doi
     * hop dong cong khai.
     */
    sort: z.enum(['default', 'name', 'newest']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    page_size: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

function doc<S extends z.ZodTypeAny>(schema: S, q: unknown): z.infer<S> {
  const r = schema.safeParse(q);
  if (!r.success) {
    throw new DomainError(
      'VALIDATION_FAILED',
      'Tham so truy van khong hop le',
      'VALIDATION_FAILED',
      { fields: r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) },
    );
  }
  return r.data as z.infer<S>;
}
