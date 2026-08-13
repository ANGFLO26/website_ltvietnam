import { chiCo } from '../../shared/omit-undefined.js';
import type { TtlCache } from '../../shared/cache.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { ProductCard, ProductDetail } from '../../dao/products/object.js';
import type { ProductCardView, ProductDetailView, ProductLandingView } from '@ltv/contracts';
import type { PageArg, PagedResult } from '../taxonomy/interface.js';
import type { ProductQueryService, PublicProductFilter, PublicProductSort } from './interface.js';
import { detailSeo } from '../seo/metadata.js';

export type ProductDaos = DaoScope<
  'products' | 'productCategories' | 'brands' | 'standards' | 'applications'
>;

const TRAN_TRANG = 100;
/** Bao nhieu phan tu moi nhom o trang landing. */
const SO_NOI_BAT = 12;

function trang(p: PageArg | undefined): { page: number; pageSize: number } {
  return {
    page: Math.max(1, Math.trunc(p?.page ?? 1)),
    pageSize: Math.min(TRAN_TRANG, Math.max(1, Math.trunc(p?.pageSize ?? 20))),
  };
}

export const productCard = (p: ProductCard): ProductCardView => ({
  slug: p.slug,
  name: p.name,
  model: p.model,
  short_description: p.shortDescription,
  featured_image_id: p.featuredImageId,
  featured_image_url: p.featuredImageUrl,
  featured_image_alt: p.featuredImageAlt,
  brand: { slug: p.brandSlug, name: p.brandName },
  standards: p.standards,
  is_featured: p.isFeatured,
  discontinued: p.discontinuedAt !== null,
});

function detailView(d: ProductDetail, siteUrl: string): ProductDetailView {
  const p = d.product;
  return {
    ...detailSeo(siteUrl, `/products/${p.slug}`),
    slug: p.slug,
    name: p.name,
    model: p.model,
    short_description: p.shortDescription,
    brand: { slug: d.brand.slug, name: d.brand.name },

    overview: p.overview,
    features: p.features,
    applications_text: p.applicationsText,
    principle: p.principle,
    sample_types: p.sampleTypes,
    operating_conditions: p.operatingConditions,
    accessories_options: p.accessoriesOptions,

    categories: d.categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      is_primary: c.isPrimary,
    })),
    standards: d.standards.map((s) => ({
      slug: s.slug,
      organization: s.organization,
      code: s.code,
      name: s.name,
      compliance_type: s.complianceType,
      note: s.note,
    })),
    applications: d.applications.map((a) => ({ slug: a.slug, name: a.name })),
    industries: d.industries.map((i) => ({ slug: i.slug, name: i.name })),
    specifications: d.specifications.map((s) => ({
      group_key: s.groupKey,
      label: s.label,
      value: s.value,
      unit: s.unit,
    })),
    media: d.media.map((m) => ({
      media_id: m.id,
      public_url: m.publicUrl,
      alt_text: m.altText,
      caption: m.caption,
      width: m.width,
      height: m.height,
      media_role: m.mediaRole,
    })),
    related: d.related.map((r) => ({
      relation_type: r.relationType,
      product: productCard(r.card),
    })),

    featured_image_id: p.featuredImageId,
    is_featured: p.isFeatured,
    discontinued: p.discontinuedAt !== null,
    discontinued_at: p.discontinuedAt?.toISOString() ?? null,
    seo_title: p.seoTitle,
    seo_description: p.seoDescription,
  };
}

export class ProductQueryServiceImpl implements ProductQueryService {
  /**
   * `cache` la TUY CHON.
   *
   * `list()` va `findBySlug()` KHONG dung cache — chung nhan bo loc tu nguoi dung,
   * va mot khoa cache ghep tu bo loc la mot khoa khong gioi han: `?brand=` co bao
   * nhieu gia tri thi co bao nhieu khoa. Chi `landing()` duoc cache, va no khong
   * co tham so nao.
   *
   * De tuy chon vi ca bai kiem lan `seed-demo` khoi tao service nay truc tiep. Bat
   * buoc truyen cache o do nghia la moi noi phai biet ve mot thu chung khong dung;
   * `undefined` thi `landing()` tinh that moi lan, va do dung la hanh vi bai kiem
   * can (khong co cache nghia la khong co ket qua cu lan sang).
   */
  constructor(
    private readonly daos: ProductDaos,
    private readonly cache?: TtlCache,
    private readonly siteUrl: string = 'http://localhost:3000',
  ) {}

  async list(
    filter: PublicProductFilter,
    sort: PublicProductSort = 'default',
    page?: PageArg,
  ): Promise<PagedResult<ProductCardView>> {
    const p = trang(page);

    /**
     * KHONG truyen `status`, `includeDeleted`, `excludeDiscontinued`.
     *
     * `ProductFilter` cua tang DAO co ca ba. Bo trong `status` la cach DAO hieu
     * "chi published" (xem chu thich cua chinh no), va de trong hai co kia la
     * cach giu ADR-011: san pham ngung kinh doanh VAN nam trong danh sach, kem
     * co `discontinued`, vi URL cu phai song va van duoc index.
     */
    const r = await this.daos.products.filter(
      chiCo({
        brandSlugs: filter.brandSlugs,
        categorySlugs: filter.categorySlugs,
        applicationSlugs: filter.applicationSlugs,
        industrySlugs: filter.industrySlugs,
        standardSlugs: filter.standardSlugs,
        search: filter.search,
        isFeatured: filter.featured,
      }),
      sapXep(sort),
      p,
    );
    return {
      items: r.data.map(productCard),
      page: p.page,
      pageSize: p.pageSize,
      totalItems: r.meta.totalItems,
    };
  }

  async findBySlug(slug: string): Promise<ProductDetailView | null> {
    const d = await this.daos.products.findDetailBySlug(slug);
    if (!d) return null;

    /**
     * `findDetailBySlug` KHONG tu loc trang thai — no la ham dung chung cho ca
     * duong quan tri. Nen loc o day, va loc TUONG MINH.
     *
     * `discontinued` KHONG bi loc: ADR-011 noi ro san pham ngung kinh doanh giu
     * nguyen URL va van duoc index. Chi `status` va `deleted_at` moi an trang.
     */
    if (d.product.status !== 'published') return null;
    return detailView(d, this.siteUrl);
  }

  async landing(): Promise<ProductLandingView> {
    const t = this.cache;
    return t === undefined ? this.landingThat() : t.lay('landing', () => this.landingThat());
  }

  /**
   * NAM cau `COUNT(*)` bi bo di — mot cho toi da ghi lai o F2 va hoan sang F4.
   *
   * Bon lan `list()` va mot lan `findFeaturedCards()` moi cai chay HAI cau: mot lay
   * dong, mot dem. Nhung `landing()` khong tra `total_items` cho nhom nao ca —
   * `ProductLandingView` la nam mang, khong co `meta`. Nen nam cau dem la cong viec
   * bi bo di hoan toan.
   *
   * Hai cach sua, va toi da can nhac ca hai:
   *
   *   a. them `listFeatured(limit)` cho bon DAO taxonomy -> bo duoc nam cau dem
   *   b. cache ket qua -> bo duoc CA MUOI cau, cho moi luot xem trong TTL
   *
   * Chon (b). Ly do do duoc: (a) van ton nam truy van MOI luot xem, con (b) ton
   * muoi truy van MOT LAN moi 60 giay cho ca tien trinh. Trang `/products` la trang
   * catalogue chinh — so luot xem cao hon so lan bien tap doi `is_featured` vai bac
   * do lon.
   *
   * NOI RO PHAN (b) KHONG SUA: lan tinh dau tien (cache lanh) VAN chay du muoi cau,
   * ke ca nam cau dem vo ich. Neu sau nay do duoc rang lan lanh do la van de — vi
   * du khi chay nhieu ban sao va moi ban co cache rieng, tuc so lan lanh nhan len
   * theo so ban — thi (a) la buoc tiep theo, va no cong duoc voi (b) chu khong thay
   * the. Toi khong lam (a) bay gio vi bon cau dem do la dem co chi muc tren bang
   * vai chuc dong.
   */
  private async landingThat(): Promise<ProductLandingView> {
    /**
     * NAM truy van SONG SONG, khong tuan tu.
     *
     * Nam nhom doc lap nhau, nen `Promise.all` bien tong thoi gian tu "cong lai"
     * thanh "cai cham nhat". Trang `/products` la trang catalogue chinh; chenh
     * lech nay nguoi dung thay duoc.
     *
     * `is_featured` la NGUON DUY NHAT quyet dinh noi bat (doc/06 PHAN VIII).
     * `homepage_sections.settings` chi chua cau hinh hien thi — neu no chua danh
     * sach id thi co hai nguon su that cho cung mot cau hoi, va chung se lech.
     */
    const [danhMuc, hang, tieuChuan, ungDung, sanPham] = await Promise.all([
      this.daos.productCategories.list(
        { status: 'published', isFeatured: true },
        { page: 1, pageSize: SO_NOI_BAT },
      ),
      this.daos.brands.list(
        { status: 'published', isFeatured: true },
        { page: 1, pageSize: SO_NOI_BAT },
      ),
      this.daos.standards.list(
        { status: 'published', isFeatured: true },
        { page: 1, pageSize: SO_NOI_BAT },
      ),
      this.daos.applications.list(
        { status: 'published', isFeatured: true },
        { page: 1, pageSize: SO_NOI_BAT },
      ),
      this.daos.products.findFeaturedCards(SO_NOI_BAT),
    ]);

    return {
      featured_categories: danhMuc.data.map((c) => ({
        slug: c.slug,
        name: c.name,
        short_description: c.shortDescription,
        icon_id: c.iconId,
        featured_image_id: c.featuredImageId,
        depth: c.depth,
        is_featured: c.isFeatured,
      })),
      featured_brands: hang.data.map((b) => ({
        slug: b.slug,
        name: b.name,
        brand_type: b.brandType,
        code: b.code,
        country_code: b.countryCode,
        logo_id: b.logoId,
        is_featured: b.isFeatured,
      })),
      featured_standards: tieuChuan.data.map((s) => ({
        slug: s.slug,
        organization: s.organization,
        code: s.code,
        name: s.name,
      })),
      featured_applications: ungDung.data.map((a) => ({
        slug: a.slug,
        name: a.name,
        icon_id: a.iconId,
        depth: a.depth,
        is_featured: a.isFeatured,
      })),
      featured_products: sanPham.map(productCard),
    };
  }
}

/**
 * Ba lua chon sap xep CONG KHAI, khong phai bon cot cua database.
 *
 * `ProductSort` cua tang DAO la `name | published_at | display_order |
 * created_at` — ten cot. Pho ra API thi URL cong khai phu thuoc ten cot, va doi
 * cot la doi hop dong. `newest` / `name` / `default` la ngu nghia cua NGUOI DUNG.
 */
function sapXep(s: PublicProductSort): {
  by: 'name' | 'published_at' | 'display_order';
  direction: 'asc' | 'desc';
} {
  if (s === 'name') return { by: 'name', direction: 'asc' };
  if (s === 'newest') return { by: 'published_at', direction: 'desc' };
  return { by: 'display_order', direction: 'asc' };
}
