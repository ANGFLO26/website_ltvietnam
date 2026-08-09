import type { Locale } from '@ltv/contracts';
import type { DaoScope } from '../../dao/dao-scope.js';

/**
 * Loai lien ket dung chung cho `menu_items` VA `banners`.
 *
 * Hai bang dung hai enum rieng nhung giao nhau gan het; giai o mot cho de luat
 * dung URL khong bi viet hai lan.
 */
export type LinkType =
  | 'page'
  | 'product_category'
  | 'brand'
  | 'service'
  | 'post_category'
  | 'product'
  | 'post'
  | 'project'
  | 'custom_url'
  | 'none';

export interface LinkRef {
  readonly linkType: string;
  readonly linkTargetId: string | null;
  readonly customUrl: string | null;
}

export type LinkResolverDaos = DaoScope<
  | 'pages'
  | 'productCategories'
  | 'brands'
  | 'services'
  | 'postCategories'
  | 'products'
  | 'posts'
  | 'projects'
>;

/**
 * GIAI `(link_type, link_target_id)` THANH URL — theo LO, khong theo tung muc.
 *
 * Vi sao lop nay ton tai:
 *
 * `menu_items.link_target_id` va `banners.link_target_id` la da hinh va KHONG co
 * khoa ngoai. Chu thich cua chinh tang dao noi ro hau qua phai chiu:
 *
 *   "Tang tren phai chiu duoc truong hop dich da bi xoa — bo qua muc do chu
 *    khong phat mot lien ket gay len menu."
 *
 * Menu xuat hien tren MOI trang. Mot muc tro toi noi dung da xoa se la mot lien
 * ket 404 tren toan bo site — thu Google thay truoc nguoi van hanh.
 *
 * NGAN SACH: mot truy van cho MOI LOAI co mat, khong phai mot truy van moi muc.
 * Menu header 20 muc thuoc ba loai = ba truy van, khong phai 20.
 */
export class LinkResolver {
  constructor(private readonly daos: LinkResolverDaos) {}

  /**
   * Tra ve `Map` tu `link_target_id` sang duong dan.
   *
   * Id KHONG co trong map nghia la muc tieu khong ton tai / chua publish, va
   * nguoi goi phai BO muc do. Tra ve chuoi rong hay `#` thay vi bo se cho ra mot
   * lien ket cho san sang trong menu.
   */
  async resolve(refs: readonly LinkRef[], locale: Locale): Promise<Map<string, string>> {
    const theoLoai = new Map<string, Set<string>>();
    for (const r of refs) {
      if (r.linkTargetId === null) continue;
      if (r.linkType === 'custom_url' || r.linkType === 'none') continue;
      const t = theoLoai.get(r.linkType) ?? new Set<string>();
      t.add(r.linkTargetId);
      theoLoai.set(r.linkType, t);
    }

    const ra = new Map<string, string>();
    /**
     * Chay SONG SONG: cac loai doc lap nhau, nen tong thoi gian la "cai cham
     * nhat" chu khong phai "cong lai". Menu nam tren duong nong cua moi trang.
     */
    await Promise.all(
      [...theoLoai].map(async ([loai, ids]) => {
        for (const [id, duong] of await this.theoMotLoai(loai, [...ids], locale)) {
          ra.set(id, duong);
        }
      }),
    );
    return ra;
  }

  /** `null` khi khong giai duoc — nguoi goi BO muc do. */
  urlOf(r: LinkRef, daGiai: Map<string, string>): string | null {
    if (r.linkType === 'custom_url') {
      /**
       * URL tuy y phai la `https://` hoac duong dan noi bo bat dau `/`.
       *
       * Khong kiem thi mot `javascript:alert(1)` do nguoi bien tap dan vao se
       * thanh mot lien ket thuc thi duoc tren moi trang. Day la dau vao co the
       * khong dang tin: no den tu man hinh quan tri, khong tu ma nguon.
       */
      const u = r.customUrl?.trim() ?? '';
      if (u.startsWith('https://') || u.startsWith('/')) return u;
      return null;
    }
    if (r.linkType === 'none') return null;
    if (r.linkTargetId === null) return null;
    return daGiai.get(r.linkTargetId) ?? null;
  }

  private async theoMotLoai(
    loai: string,
    ids: readonly string[],
    locale: Locale,
  ): Promise<Map<string, string>> {
    const ra = new Map<string, string>();
    const can = new Set(ids);
    const them = (id: string, duong: string): void => {
      if (can.has(id)) ra.set(id, duong);
    };

    /**
     * Duong dan viet o DAY, va day la noi duy nhat.
     *
     * Chung phai khop `ROUTES` trong `@ltv/contracts` (`/products/:slug`,
     * `/brands/:slug`...). Co mot bai kiem doi chieu tung mau voi `ROUTES` de
     * hai noi khong lech nhau — neu lech thi menu tro toi mot duong khong ton
     * tai, va do la loai loi chi nguoi dung phat hien.
     */
    switch (loai) {
      case 'product': {
        const r = await this.daos.products.list(
          { status: 'published' },
          { page: 1, pageSize: 100 },
        );
        for (const x of r.data) them(x.id, `/products/${x.slug}`);
        return ra;
      }
      case 'product_category': {
        const r = await this.daos.productCategories.list(
          { status: 'published' },
          { page: 1, pageSize: 100 },
        );
        for (const x of r.data) them(x.id, `/products/category/${x.slug}`);
        return ra;
      }
      case 'brand': {
        const r = await this.daos.brands.list({ status: 'published' }, { page: 1, pageSize: 100 });
        for (const x of r.data) them(x.id, `/brands/${x.slug}`);
        return ra;
      }
      case 'post_category': {
        const r = await this.daos.postCategories.list(
          { status: 'published' },
          { page: 1, pageSize: 100 },
        );
        for (const x of r.data) them(x.id, `/news/category/${x.slug}`);
        return ra;
      }
      /**
       * Bon nhom co BAN DICH: slug phu thuoc locale, va dieu kien la HAI trang
       * thai (cha publish + ban dich publish). `listPublicByLocale` da ap ca hai
       * — dung lai no thay vi viet lai dieu kien lan thu hai.
       */
      case 'page': {
        const r = await this.daos.pages.listPublicByLocale(locale, { limit: 100, offset: 0 });
        for (const x of r.rows) them(x.entityId, `/about/${x.slug}`);
        return ra;
      }
      case 'service': {
        const r = await this.daos.services.listPublicByLocale(locale, { limit: 100, offset: 0 });
        for (const x of r.rows) them(x.entityId, `/services/${x.slug}`);
        return ra;
      }
      case 'post': {
        const r = await this.daos.posts.listPublicByLocale(locale, { limit: 100, offset: 0 });
        for (const x of r.rows) them(x.entityId, `/news/${x.slug}`);
        return ra;
      }
      case 'project': {
        const r = await this.daos.projects.listPublicByLocale(locale, { limit: 100, offset: 0 });
        for (const x of r.rows) them(x.entityId, `/projects/${x.slug}`);
        return ra;
      }
      default:
        /**
         * Loai KHONG BIET -> tra rong, tuc muc do bi bo.
         *
         * Mot enum moi them o database ma quen them o day se lam muc menu bien
         * mat — on ao vua du de phat hien, va an toan hon la phat mot lien ket
         * doan duoc.
         */
        return ra;
    }
  }
}
