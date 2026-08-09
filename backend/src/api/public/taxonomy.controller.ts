import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import type {
  ApplicationCardView,
  ApplicationTreeView,
  BrandCardView,
  BrandDetailView,
  IndustryCardView,
  ProductCategoryCardView,
  ProductCategoryTreeView,
} from '@ltv/contracts';
import { DomainError, NotFoundError } from '../../shared/errors.js';
import { page, type Page } from '../../shared/http/envelope.js';
import { Public } from '../admin/auth.guard.js';
import { SlugPipe } from '../../shared/http/slug.pipe.js';
import {
  TAXONOMY_SERVICE,
  type PagedResult,
  type TaxonomyService,
} from '../../services/taxonomy/interface.js';

/**
 * NAM NHOM TAXONOMY, mot file.
 *
 * Vi sao khong tach nam file: nam controller nay giong nhau den muc chi khac
 * ten phuong thuc service duoc goi. Tach ra thi phan phan tich tham so va cach
 * tra 404 bi sao chep nam lan, va nam ban sao la nam co hoi lech nhau — dung
 * thu da xay ra voi `createPool` (sau ban sao, va chung DA lech).
 *
 * `@Public()` o cap LOP: toan bo tang doc cong khai khong can phien. Guard toan
 * cuc mac dinh doi dang nhap, nen thieu dong nay thi moi endpoint tra 401 —
 * huong sai la huong on ao.
 */
@Public()
@Controller()
export class TaxonomyController {
  constructor(@Inject(TAXONOMY_SERVICE) private readonly tx: TaxonomyService) {}

  // ══════════════════════════ brands ══════════════════════════
  @Get('brands')
  async brands(@Query() q: unknown): Promise<Page<BrandCardView>> {
    const dto = doc(brandQuery, q);
    return toPage(
      await this.tx.listBrands(
        { brandType: dto.type, featured: dto.featured, parentSlug: dto.parent },
        dto,
      ),
    );
  }

  @Get('brands/:slug/children')
  async brandChildren(@Param('slug', SlugPipe) slug: string): Promise<readonly BrandCardView[]> {
    /**
     * `brands/:slug/children` khai bao TRUOC `brands/:slug`.
     *
     * Nest chon route dang ky truoc. Neu `:slug` dung truoc thi Express van
     * phan giai dung o day (vi `/children` la mot doan nua), nhung thu tu nay
     * la thu tu ma `API_ENDPOINTS` khai bao va Luat 16 kiem — giu chung khop
     * nhau de nguoi doc khong phai doi chieu hai noi.
     */
    const r = await this.tx.listBrandChildren(slug);
    if (r === null) throw khongThay('BRAND', slug);
    return r;
  }

  @Get('brands/:slug')
  async brand(@Param('slug', SlugPipe) slug: string): Promise<BrandDetailView> {
    const r = await this.tx.findBrand(slug);
    if (!r) throw khongThay('BRAND', slug);
    return r;
  }

  // ═══════════════════ product categories ═══════════════════
  @Get('product-categories')
  async categories(@Query() q: unknown): Promise<Page<ProductCategoryCardView>> {
    const dto = doc(cayQuery, q);
    return toPage(
      await this.tx.listProductCategories({ featured: dto.featured, parentSlug: dto.parent }, dto),
    );
  }

  /** TRUOC `:slug` — neu khong thi `tree` bi hieu la mot slug. */
  @Get('product-categories/tree')
  async categoryTree(): Promise<readonly ProductCategoryTreeView[]> {
    return this.tx.productCategoryTree();
  }

  @Get('product-categories/:slug/products')
  async categoryProducts(@Param('slug', SlugPipe) slug: string, @Query() q: unknown) {
    return this.sanPham('category', slug, q);
  }

  @Get('product-categories/:slug')
  async category(@Param('slug', SlugPipe) slug: string): Promise<ProductCategoryCardView> {
    const r = await this.tx.findProductCategory(slug);
    if (!r) throw khongThay('PRODUCT_CATEGORY', slug);
    return r;
  }

  // ══════════════════════════ standards ══════════════════════════
  @Get('standards')
  async standards(@Query() q: unknown) {
    const dto = doc(standardQuery, q);
    return toPage(
      await this.tx.listStandards(
        { organization: dto.organization, search: dto.q, featured: dto.featured },
        dto,
      ),
    );
  }

  @Get('standards/:slug/products')
  async standardProducts(@Param('slug', SlugPipe) slug: string, @Query() q: unknown) {
    return this.sanPham('standard', slug, q);
  }

  @Get('standards/:slug')
  async standard(@Param('slug', SlugPipe) slug: string) {
    const r = await this.tx.findStandard(slug);
    if (!r) throw khongThay('STANDARD', slug);
    return r;
  }

  // ══════════════════════════ applications ══════════════════════════
  @Get('applications')
  async applications(@Query() q: unknown): Promise<Page<ApplicationCardView>> {
    const dto = doc(cayQuery, q);
    return toPage(
      await this.tx.listApplications({ featured: dto.featured, parentSlug: dto.parent }, dto),
    );
  }

  @Get('applications/tree')
  async applicationTree(): Promise<readonly ApplicationTreeView[]> {
    return this.tx.applicationTree();
  }

  @Get('applications/:slug/products')
  async applicationProducts(@Param('slug', SlugPipe) slug: string, @Query() q: unknown) {
    return this.sanPham('application', slug, q);
  }

  @Get('applications/:slug')
  async application(@Param('slug', SlugPipe) slug: string): Promise<ApplicationCardView> {
    const r = await this.tx.findApplication(slug);
    if (!r) throw khongThay('APPLICATION', slug);
    return r;
  }

  // ══════════════════════════ industries ══════════════════════════
  @Get('industries')
  async industries(@Query() q: unknown): Promise<Page<IndustryCardView>> {
    const dto = doc(coBanQuery, q);
    return toPage(await this.tx.listIndustries({ featured: dto.featured }, dto));
  }

  @Get('industries/:slug/products')
  async industryProducts(@Param('slug', SlugPipe) slug: string, @Query() q: unknown) {
    return this.sanPham('industry', slug, q);
  }

  @Get('industries/:slug')
  async industry(@Param('slug', SlugPipe) slug: string): Promise<IndustryCardView> {
    const r = await this.tx.findIndustry(slug);
    if (!r) throw khongThay('INDUSTRY', slug);
    return r;
  }

  // ══════════════════════════ dung chung ══════════════════════════
  private async sanPham(
    dimension: 'category' | 'standard' | 'application' | 'industry',
    slug: string,
    q: unknown,
  ) {
    const dto = doc(coBanQuery, q);
    const r = await this.tx.productsOf(dimension, slug, dto);
    /**
     * `null` = nhanh KHONG TON TAI -> 404. Mang rong = nhanh co nhung chua co
     * san pham -> 200. Hai cau tra loi khac nhau; gop lai thi mot slug go sai
     * tra ve trang rong va Google index no.
     */
    if (r === null) throw khongThay(dimension.toUpperCase(), slug);
    return toPage(r);
  }
}

// ─────────────────────── tham so truy van ───────────────────────
/**
 * `page` / `page_size` dung `snake_case` — GIONG phan hoi.
 *
 * `doc/06` PHAN II muc 2 viet `?page=1&page_size=20`. Dung `pageSize` o dau vao
 * va `page_size` o dau ra la bat frontend nho hai cach viet cho cung mot khai
 * niem.
 */
const phanTrang = {
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(100).optional(),
};

/**
 * `featured` nhan `true`/`false`, KHONG nhan "co mat la true".
 *
 * `?featured` tran (khong gia tri) se thanh chuoi rong, va coi chuoi rong la
 * `true` nghia la `?featured=false` va `?featured` cho ket qua nguoc nhau theo
 * cach khong ai doan duoc. Bat buoc gia tri tuong minh.
 */
const coFeatured = {
  featured: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
};

const coBanQuery = z.object({ ...phanTrang, ...coFeatured }).strict();

/**
 * `parent` nhan slug, hoac `root` cho "chi lay cap goc".
 *
 * `?parent=` rong khong dung duoc lam "goc": mot chuoi rong trong URL thuong la
 * loi ghep chuoi o phia goi, va bien loi do thanh mot bo loc hop le se che di
 * bug cua nguoi goi. `root` la tuong minh.
 */
const cayQuery = z
  .object({
    ...phanTrang,
    ...coFeatured,
    parent: z
      .string()
      .min(1)
      .max(255)
      .transform((v) => (v === 'root' ? null : v))
      .optional(),
  })
  .strict();

const brandQuery = z
  .object({
    ...phanTrang,
    ...coFeatured,
    type: z
      .enum(['manufacturer', 'sub_brand', 'global_partner', 'service_partner', 'supplier'])
      .optional(),
    parent: z
      .string()
      .min(1)
      .max(255)
      .transform((v) => (v === 'root' ? null : v))
      .optional(),
  })
  .strict();

const standardQuery = z
  .object({
    ...phanTrang,
    ...coFeatured,
    organization: z.string().min(1).max(50).optional(),
    q: z.string().min(1).max(200).optional(),
  })
  .strict();

/**
 * `.strict()` tren moi schema: tham so LA khong duoc bo qua im lang.
 *
 * `?featurd=true` (go sai) bi bo qua thi nguoi goi thay danh sach day du va tin
 * rang bo loc khong co tac dung nao. Tra 422 thi ho sua trong mot phut.
 */
function doc<S extends z.ZodTypeAny>(
  schema: S,
  q: unknown,
): z.infer<S> & { page?: number | undefined; pageSize?: number | undefined } {
  const r = schema.safeParse(q);
  if (!r.success) {
    throw new DomainError('VALIDATION_FAILED', 'Tham so truy van khong hop le', 'VALIDATION_FAILED', {
      fields: r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  const d = r.data as z.infer<S> & { page?: number; page_size?: number };
  return { ...d, pageSize: d.page_size };
}

function toPage<T>(r: PagedResult<T>): Page<T> {
  return page(r.items, { page: r.page, pageSize: r.pageSize, totalItems: r.totalItems });
}

function khongThay(loai: string, slug: string): NotFoundError {
  return new NotFoundError(`${loai}_NOT_FOUND`, `Khong tim thay "${slug}"`);
}
