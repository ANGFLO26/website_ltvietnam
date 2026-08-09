import type { DaoScope } from '../../dao/dao-scope.js';
import type { ProductCard, ProductDetail } from '../../dao/products/object.js';
import type {
  ProductCardView,
  ProductDetailView,
  ProductLandingView,
} from '@ltv/contracts';
import type { PageArg, PagedResult } from '../taxonomy/interface.js';
import type {
  ProductQueryService,
  PublicProductFilter,
  PublicProductSort,
} from './interface.js';

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
  brand: { slug: p.brandSlug, name: p.brandName },
  is_featured: p.isFeatured,
  discontinued: p.discontinuedAt !== null,
});

function detailView(d: ProductDetail): ProductDetailView {
  const p = d.product;
  return {
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

/** Bo khoa khong xac dinh — xem chu thich cung ten o `taxonomy/service.ts`. */
type BoUndefined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };
function chiCo<T extends Record<string, unknown>>(o: T): BoUndefined<T> {
  return Object.fromEntries(
    Object.entries(o).filter((e) => e[1] !== undefined),
  ) as BoUndefined<T>;
}

export class ProductQueryServiceImpl implements ProductQueryService {
  constructor(private readonly daos: ProductDaos) {}

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
    return detailView(d);
  }

  async landing(): Promise<ProductLandingView> {
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
