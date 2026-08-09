import { chiCo } from '../../shared/omit-undefined.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { Brand } from '../../dao/brands/object.js';
import type { ProductCategory } from '../../dao/product-categories/object.js';
import type { Application } from '../../dao/applications/object.js';
import type { Industry } from '../../dao/industries/object.js';
import type { Standard } from '../../dao/standards/object.js';
import type { ProductCard } from '../../dao/products/object.js';
import type {
  ApplicationCardView,
  ApplicationTreeView,
  BrandCardView,
  BrandDetailView,
  IndustryCardView,
  ProductCardView,
  ProductCategoryCardView,
  ProductCategoryTreeView,
  StandardCardView,
  StandardDetailView,
} from '@ltv/contracts';
import type { PageArg, PagedResult, TaxonomyService } from './interface.js';

export type TaxonomyDaos = DaoScope<
  'brands' | 'productCategories' | 'standards' | 'applications' | 'industries' | 'products'
>;

/**
 * `status: 'published'` xuat hien o MOI truy van cua file nay.
 *
 * Khai bao mot lan thanh hang so de doc duoc bang mat: neu mot phuong thuc moi
 * quen no thi cho thieu se lo ra ngay khi doc, chu khong an trong mot doi so.
 * Va co mot bai kiem tao ban nhap roi khang dinh no VO HINH o moi endpoint —
 * vi doc bang mat khong phai mot bao dam.
 */
const CHI_DA_PUBLISH = { status: 'published' } as const;

/** Tran trang theo `doc/06` PHAN II muc 2. */
const TRAN_TRANG = 100;

function trang(p: PageArg | undefined): { page: number; pageSize: number } {
  return {
    page: Math.max(1, Math.trunc(p?.page ?? 1)),
    pageSize: Math.min(TRAN_TRANG, Math.max(1, Math.trunc(p?.pageSize ?? 20))),
  };
}

// ─────────────────────── chuyen doi sang view ───────────────────────
const brandCard = (b: Brand): BrandCardView => ({
  slug: b.slug,
  name: b.name,
  brand_type: b.brandType,
  code: b.code,
  country_code: b.countryCode,
  logo_id: b.logoId,
  is_featured: b.isFeatured,
});

const categoryCard = (c: ProductCategory): ProductCategoryCardView => ({
  slug: c.slug,
  name: c.name,
  short_description: c.shortDescription,
  icon_id: c.iconId,
  featured_image_id: c.featuredImageId,
  depth: c.depth,
  is_featured: c.isFeatured,
});

const standardCard = (s: Standard): StandardCardView => ({
  slug: s.slug,
  organization: s.organization,
  code: s.code,
  name: s.name,
});

const applicationCard = (a: Application): ApplicationCardView => ({
  slug: a.slug,
  name: a.name,
  icon_id: a.iconId,
  depth: a.depth,
  is_featured: a.isFeatured,
});

const industryCard = (i: Industry): IndustryCardView => ({
  slug: i.slug,
  name: i.name,
  icon_id: i.iconId,
  featured_image_id: i.featuredImageId,
  is_featured: i.isFeatured,
});

const productCard = (p: ProductCard): ProductCardView => ({
  slug: p.slug,
  name: p.name,
  model: p.model,
  short_description: p.shortDescription,
  featured_image_id: p.featuredImageId,
  brand: { slug: p.brandSlug, name: p.brandName },
  is_featured: p.isFeatured,
  // ADR-011: co, khong phai loc. San pham ngung KD van tra ve va van index.
  discontinued: p.discontinuedAt !== null,
});

/**
 * Dung CAY LONG NHAU tu danh sach PHANG — mot vong, khong truy van them.
 *
 * Vi sao khong goi `findChildren` de quy: do la N+1 dung nghia, va voi ba cap
 * danh muc thi no la hang chuc truy van cho mot mega menu duoc goi o moi trang.
 * `list()` da tra ve ca cay trong mot cau; xep lai o bo nho la mot vong lap.
 *
 * Node co cha KHONG nam trong tap (vi cha chua publish) se bi BO chu khong noi
 * len goc: no la mot node mo coi, va treo no lam goc se cho ra mot muc menu
 * khong co duong dan hop le.
 */
function dungCay<T extends { slug: string; depth: number }, V>(
  rows: readonly (T & { id: string; parentId: string | null })[],
  toView: (row: T) => V,
): readonly (V & { children: readonly unknown[] })[] {
  const node = new Map<string, V & { children: unknown[] }>();
  for (const r of rows) node.set(r.id, { ...toView(r), children: [] });

  const goc: (V & { children: unknown[] })[] = [];
  for (const r of rows) {
    const n = node.get(r.id)!;
    if (r.parentId === null) {
      goc.push(n);
      continue;
    }
    const cha = node.get(r.parentId);
    if (cha) cha.children.push(n);
    // else: node mo coi (cha chua publish) -> bo qua, khong treo lam goc
  }
  return goc as readonly (V & { children: readonly unknown[] })[];
}

export class TaxonomyServiceImpl implements TaxonomyService {
  /**
   * `chunk` la mot SEAM de test, khong phai mot nut tinh chinh.
   *
   * `layTatCa` phai lap khi so node vuot mot trang. Voi mac dinh 100 thi de kiem
   * duoc vong lap do phai dung 101 danh muc — cham va kho doc. Cho test dat
   * `chunk: 2` thi vong lap duoc kiem that voi ba node.
   */
  constructor(
    private readonly daos: TaxonomyDaos,
    private readonly chunk: number = TRAN_TRANG,
  ) {}

  /**
   * Lay TAT CA node cua mot cay — lap het trang, KHONG cat o trang dau.
   *
   * Ban dau toi goi `list(..., { pageSize: 100 })` mot lan. Do la mot loi CAT
   * NGAM: mot catalogue 101 danh muc se mat mot phan mega menu, khong bao loi,
   * va trieu chung la "mot muc menu bien mat" — thu khong ai lan ra tu ma nguon.
   * Voi catalogue thiet bi ba cap thi hon 100 danh muc la chuyen binh thuong.
   *
   * Ngan sach: HAI truy van moi trang (mot lay dong, mot dem — do la hop dong
   * cua `Paged`). Voi duoi 100 danh muc thi dung hai, va do la cai gia cua viec
   * khong bao gio cat ngam.
   */
  private async layTatCa<T>(
    doc: (page: { page: number; pageSize: number }) => Promise<{
      data: T[];
      meta: { totalItems: number };
    }>,
  ): Promise<T[]> {
    const ra: T[] = [];
    let page = 1;
    for (;;) {
      const r = await doc({ page, pageSize: this.chunk });
      ra.push(...r.data);
      if (ra.length >= r.meta.totalItems || r.data.length === 0) return ra;
      page += 1;
      // Chan vong lap vo han neu `totalItems` va so dong khong nhat quan.
      if (page > 1000) return ra;
    }
  }

  // ══════════════════════ brands ══════════════════════
  async listBrands(
    filter: {
      brandType?: string | undefined;
      featured?: boolean | undefined;
      parentSlug?: string | null | undefined;
    },
    page?: PageArg,
  ): Promise<PagedResult<BrandCardView>> {
    const p = trang(page);
    let parentId: string | null | undefined;
    if (filter.parentSlug !== undefined) {
      if (filter.parentSlug === null) parentId = null;
      else {
        const cha = await this.daos.brands.findBySlug(filter.parentSlug);
        /**
         * Cha khong ton tai / chua publish -> tra RONG, khong tra toan bo.
         *
         * Bo qua tham so khi khong giai duoc slug la cai bay im lang: nguoi goi
         * xin "con cua hang X" va nhan ve MOI hang, roi hien thi chung nhu con
         * cua X.
         */
        if (!cha || cha.status !== 'published') {
          return { items: [], page: p.page, pageSize: p.pageSize, totalItems: 0 };
        }
        parentId = cha.id;
      }
    }

    const r = await this.daos.brands.list(
      { ...CHI_DA_PUBLISH, ...chiCo({ isFeatured: filter.featured, parentId }) },
      p,
    );
    const items = r.data
      .filter((b) => filter.brandType === undefined || b.brandType === filter.brandType)
      .map(brandCard);
    return { items, page: p.page, pageSize: p.pageSize, totalItems: r.meta.totalItems };
  }

  async findBrand(slug: string): Promise<BrandDetailView | null> {
    const b = await this.daos.brands.findBySlug(slug);
    if (!b || b.status !== 'published') return null;

    /**
     * `parent_slug` can MOT truy van nua, va no dang gia.
     *
     * Trang chi tiet hang can duong dan phan cap ("PAC > sub-brand"), va
     * frontend khong the tu suy ra tu UUID vi view cong khai khong co UUID.
     * Mot truy van theo khoa chinh cho mot trang chi tiet la chap nhan duoc;
     * mot truy van cho MOI DONG trong danh sach thi khong — do la ly do
     * `BrandCardView` khong co truong nay.
     */
    let parentSlug: string | null = null;
    if (b.parentId) {
      const cha = await this.daos.brands.findById(b.parentId);
      parentSlug = cha && cha.status === 'published' ? cha.slug : null;
    }

    return {
      ...brandCard(b),
      short_description: b.shortDescription,
      website_url: b.websiteUrl,
      cover_image_id: b.coverImageId,
      parent_slug: parentSlug,
      depth: b.depth,
    };
  }

  async listBrandChildren(slug: string): Promise<readonly BrandCardView[] | null> {
    const b = await this.daos.brands.findBySlug(slug);
    if (!b || b.status !== 'published') return null;
    const rows = await this.layTatCa((p) =>
      this.daos.brands.list({ ...CHI_DA_PUBLISH, parentId: b.id }, p),
    );
    return rows.map(brandCard);
  }

  // ══════════════════════ product categories ══════════════════════
  async listProductCategories(
    filter: { featured?: boolean | undefined; parentSlug?: string | null | undefined },
    page?: PageArg,
  ): Promise<PagedResult<ProductCategoryCardView>> {
    const p = trang(page);
    let parentId: string | null | undefined;
    if (filter.parentSlug !== undefined) {
      if (filter.parentSlug === null) parentId = null;
      else {
        const cha = await this.daos.productCategories.findBySlug(filter.parentSlug);
        if (!cha || cha.status !== 'published') {
          return { items: [], page: p.page, pageSize: p.pageSize, totalItems: 0 };
        }
        parentId = cha.id;
      }
    }
    const r = await this.daos.productCategories.list(
      { ...CHI_DA_PUBLISH, ...chiCo({ isFeatured: filter.featured, parentId }) },
      p,
    );
    return {
      items: r.data.map(categoryCard),
      page: p.page,
      pageSize: p.pageSize,
      totalItems: r.meta.totalItems,
    };
  }

  async productCategoryTree(): Promise<readonly ProductCategoryTreeView[]> {
    const rows = await this.layTatCa((p) => this.daos.productCategories.list(CHI_DA_PUBLISH, p));
    return dungCay(rows, categoryCard) as readonly ProductCategoryTreeView[];
  }

  async findProductCategory(slug: string): Promise<ProductCategoryCardView | null> {
    const c = await this.daos.productCategories.findBySlug(slug);
    return c && c.status === 'published' ? categoryCard(c) : null;
  }

  // ══════════════════════ standards ══════════════════════
  async listStandards(
    filter: {
      organization?: string | undefined;
      search?: string | undefined;
      featured?: boolean | undefined;
    },
    page?: PageArg,
  ): Promise<PagedResult<StandardCardView>> {
    const p = trang(page);
    const r = await this.daos.standards.list(
      {
        ...CHI_DA_PUBLISH,
        ...chiCo({
          organization: filter.organization,
          search: filter.search,
          isFeatured: filter.featured,
        }),
      },
      p,
    );
    return {
      items: r.data.map(standardCard),
      page: p.page,
      pageSize: p.pageSize,
      totalItems: r.meta.totalItems,
    };
  }

  async findStandard(slug: string): Promise<StandardDetailView | null> {
    const s = await this.daos.standards.findBySlug(slug);
    if (!s || s.status !== 'published') return null;
    return { ...standardCard(s), description: s.description };
  }

  // ══════════════════════ applications ══════════════════════
  async listApplications(
    filter: { featured?: boolean | undefined; parentSlug?: string | null | undefined },
    page?: PageArg,
  ): Promise<PagedResult<ApplicationCardView>> {
    const p = trang(page);
    let parentId: string | null | undefined;
    if (filter.parentSlug !== undefined) {
      if (filter.parentSlug === null) parentId = null;
      else {
        const cha = await this.daos.applications.findBySlug(filter.parentSlug);
        if (!cha || cha.status !== 'published') {
          return { items: [], page: p.page, pageSize: p.pageSize, totalItems: 0 };
        }
        parentId = cha.id;
      }
    }
    const r = await this.daos.applications.list(
      { ...CHI_DA_PUBLISH, ...chiCo({ isFeatured: filter.featured, parentId }) },
      p,
    );
    return {
      items: r.data.map(applicationCard),
      page: p.page,
      pageSize: p.pageSize,
      totalItems: r.meta.totalItems,
    };
  }

  async applicationTree(): Promise<readonly ApplicationTreeView[]> {
    const rows = await this.layTatCa((p) => this.daos.applications.list(CHI_DA_PUBLISH, p));
    return dungCay(rows, applicationCard) as readonly ApplicationTreeView[];
  }

  async findApplication(slug: string): Promise<ApplicationCardView | null> {
    const a = await this.daos.applications.findBySlug(slug);
    return a && a.status === 'published' ? applicationCard(a) : null;
  }

  // ══════════════════════ industries ══════════════════════
  async listIndustries(
    filter: { featured?: boolean | undefined },
    page?: PageArg,
  ): Promise<PagedResult<IndustryCardView>> {
    const p = trang(page);
    const r = await this.daos.industries.list(
      { ...CHI_DA_PUBLISH, ...chiCo({ isFeatured: filter.featured }) },
      p,
    );
    return {
      items: r.data.map(industryCard),
      page: p.page,
      pageSize: p.pageSize,
      totalItems: r.meta.totalItems,
    };
  }

  async findIndustry(slug: string): Promise<IndustryCardView | null> {
    const i = await this.daos.industries.findBySlug(slug);
    return i && i.status === 'published' ? industryCard(i) : null;
  }

  // ══════════════════════ san pham theo nhanh ══════════════════════
  async productsOf(
    dimension: 'category' | 'standard' | 'application' | 'industry',
    slug: string,
    page?: PageArg,
  ): Promise<PagedResult<ProductCardView> | null> {
    const p = trang(page);

    /**
     * KIEM slug ton tai TRUOC khi loc.
     *
     * `filter` cua `ProductQuery` nhan slug va tu mo rong nhanh con; mot slug
     * khong ton tai chi cho ra ket qua rong. Nhung "rong" va "khong ton tai" la
     * hai cau tra loi khac nhau: cai dau la 200 voi mang rong, cai sau la 404.
     * Gop lai thi mot slug go sai tra ve trang rong, va Google se index no.
     */
    const co = await this.slugTonTai(dimension, slug);
    if (!co) return null;

    const r = await this.daos.products.filter(
      dimension === 'category'
        ? { categorySlugs: [slug] }
        : dimension === 'standard'
          ? { standardSlugs: [slug] }
          : dimension === 'application'
            ? { applicationSlugs: [slug] }
            : { industrySlugs: [slug] },
      undefined,
      p,
    );
    return {
      items: r.data.map(productCard),
      page: p.page,
      pageSize: p.pageSize,
      totalItems: r.meta.totalItems,
    };
  }

  private async slugTonTai(
    dimension: 'category' | 'standard' | 'application' | 'industry',
    slug: string,
  ): Promise<boolean> {
    const e =
      dimension === 'category'
        ? await this.daos.productCategories.findBySlug(slug)
        : dimension === 'standard'
          ? await this.daos.standards.findBySlug(slug)
          : dimension === 'application'
            ? await this.daos.applications.findBySlug(slug)
            : await this.daos.industries.findBySlug(slug);
    return e !== null && e.status === 'published';
  }
}
