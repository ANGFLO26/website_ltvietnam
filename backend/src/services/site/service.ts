import type {
  BannerView,
  CustomerView,
  HomeView,
  Locale,
  MenuItemView,
  MenuView,
  NavLocation,
  NavigationView,
  OfficeView,
  ProductMegaMenuView,
  SearchHitView,
} from '@ltv/contracts';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { MenuItemNode, MenuLocation, MenuTree } from '../../dao/menus/object.js';
import type { TtlCache } from '../../shared/cache.js';
import type { ContentService } from '../content/interface.js';
import type { ProductQueryService } from '../products/interface.js';
import type { PageArg, PagedResult, TaxonomyService } from '../taxonomy/interface.js';
import { LinkResolver, type LinkRef } from './link-resolver.js';
import type { SiteService } from './interface.js';

/**
 * Tam bang cho tang dao, va TAM cai la nhieu hon can neu chi tinh khung site.
 *
 * Nam bang dau la cua F4 that (`menus`, `banners`, `customers`, `offices`,
 * `homepageSections`). Tam bang con lai (`pages`, `productCategories`, `brands`,
 * `services`, `postCategories`, `products`, `posts`, `projects`) khong duoc doc
 * truc tiep o day — chung la cua `LinkResolver`, de giai `link_target_id` cua
 * menu va banner thanh duong dan.
 *
 * `DaoScope` van co gia tri: mot bang khong nam trong danh sach nay thi khong
 * cham toi duoc, va viec danh sach DAI la thong tin — no noi ro rang mot muc menu
 * co the tro toi tam loai thuc the, va do la cai gia cua lien ket da hinh.
 */
export type SiteDaos = DaoScope<
  | 'menus'
  | 'banners'
  | 'customers'
  | 'offices'
  | 'homepageSections'
  | 'pages'
  | 'productCategories'
  | 'brands'
  | 'services'
  | 'postCategories'
  | 'products'
  | 'posts'
  | 'projects'
>;

/** Bao nhieu phan tu moi nhom o trang chu. */
const SO_NOI_BAT = 12;
/** Noi dung dai (dich vu, du an, tin) thi it hon — moi the chiem nhieu cho hon. */
const SO_NOI_DUNG = 6;
const SO_LOGO = 18;
const TRAN_TRANG = 100;

/**
 * `footer` cua API gop BON vi tri `footer_*` cua so do.
 *
 * Xem `NavLocation` trong contracts: chan trang co bon cot va frontend ve ca bon
 * cung mot luc, nen pho bon vi tri ra ngoai nghia la bon yeu cau HTTP cho mot
 * lan ve chan trang.
 *
 * Thu tu trong mang la thu tu CO Y — no la thu tu cot tu trai sang phai. `menus`
 * trong phan hoi giu dung thu tu nay, nen frontend khong phai biet ten vi tri de
 * sap lai.
 */
const VI_TRI: Readonly<Record<NavLocation, readonly MenuLocation[]>> = {
  header: ['header'],
  mobile: ['mobile'],
  footer: ['footer_company', 'footer_products', 'footer_services', 'footer_legal'],
};

function trang(p: PageArg | undefined): { page: number; pageSize: number } {
  return {
    page: Math.max(1, Math.trunc(p?.page ?? 1)),
    pageSize: Math.min(TRAN_TRANG, Math.max(1, Math.trunc(p?.pageSize ?? 20))),
  };
}

export class SiteServiceImpl implements SiteService {
  private readonly links: LinkResolver;

  /**
   * Nhan BA SERVICE khac, khong tu goi tang dao cho nhung gi chung da lam.
   *
   * `HomeView` can the danh muc, the hang, the ung dung, the san pham, the dich
   * vu, the du an, the tin — BAY hinh dang view da ton tai va da co bai kiem o
   * F1/F2/F3. Viet lai chung o day nghia la:
   *
   *   - dieu kien HAI TRANG THAI cua nhom co ban dich (ADR-004) duoc viet lan
   *     thu hai, va ban thu hai se thieu mot nua
   *   - `is_featured` doc tu bay cho, va mot lan doi nghia la sua bay cho
   *   - `customer_name` cua the du an — luat `customer_visibility` — co mot ban
   *     sao nua, va day la luat PHAP LY chu khong phai luat hien thi
   *
   * Cai gia phai tra: trang chu goi ~10 phuong thuc service, moi cai mot den hai
   * truy van. Do la ly do co cache — xem `home()`.
   *
   * Vi sao KHONG dung `ProductQueryService.landing()` du no tra dung bon nhom noi
   * bat: `doc/06` PHAN IV va PHAN XV muc 2 tach hai duong nay co y ("KHONG dung
   * `/home` cho `/products`"). Hai trang can hai tap khac nhau (catalogue can
   * tieu chuan, trang chu can khach hang/tin/du an), va gop lai nghia la moi lan
   * doi trang chu se doi ca trang catalogue — im lang, vi ca hai van xanh.
   */
  constructor(
    private readonly daos: SiteDaos,
    private readonly taxonomy: TaxonomyService,
    private readonly content: ContentService,
    private readonly products: ProductQueryService,
    private readonly cache: TtlCache,
  ) {
    this.links = new LinkResolver(daos);
  }

  // ══════════════════════════ trang chu ══════════════════════════
  async home(locale: Locale): Promise<HomeView> {
    /**
     * CACHE, va day la endpoint dat nhat cua ca API cong khai.
     *
     * Chin nhom, moi nhom mot den hai truy van, cong cac lan lay quan he theo lo
     * ben trong tung service — do duoc khoang 20 cau SQL cho MOT luot xem trang
     * chu. Trang chu la trang duoc xem nhieu nhat, va du lieu cua no doi it nhat
     * (chi khi bien tap doi `is_featured` hoac them banner).
     *
     * Khoa co `locale`: hai ngon ngu la hai phan hoi khac nhau, va gop chung vao
     * mot khoa se cho nguoi doc tieng Viet thay noi dung tieng Anh — mot loi hien
     * ra binh thuong, khong bao gi ca.
     *
     * Gioi han cache mot tien trinh ghi o `shared/cache.ts`. Mutation admin site
     * xóa prefix `home:` ngay; TTL 60s vẫn là lưới an toàn khi chạy nhiều bản sao.
     */
    return this.cache.lay(`home:${locale}`, () => this.homeThat(locale));
  }

  private async homeThat(locale: Locale): Promise<HomeView> {
    /**
     * `Promise.all` cho MUOI nhom doc lap.
     *
     * Tong thoi gian la "cai cham nhat" chu khong phai "cong lai". Tuan tu thi
     * muoi lan di lai database cong don, va o day chung khong phu thuoc nhau.
     */
    const [khoi, banner, danhMuc, hang, ungDung, sanPham, dichVu, duAn, tin, khach] =
      await Promise.all([
        this.daos.homepageSections.listEnabled(),
        this.daos.banners.findActive(),
        this.taxonomy.listProductCategories({ featured: true }, { pageSize: SO_NOI_BAT }),
        this.taxonomy.listBrands({ featured: true }, { pageSize: SO_NOI_BAT }),
        this.taxonomy.listApplications({ featured: true }, { pageSize: SO_NOI_BAT }),
        this.products.list({ featured: true }, 'default', { pageSize: SO_NOI_BAT }),
        this.content.listServices(locale, { featured: true }, { pageSize: SO_NOI_DUNG }),
        this.content.listProjects(locale, { featured: true }, { pageSize: SO_NOI_DUNG }),
        /**
         * `latest_posts`, KHONG phai `featured_posts` — khong loc `is_featured`.
         *
         * `listPublicByLocale` sap theo `published_at DESC`, nen "moi nhat" la
         * thu tu tu nhien cua no. Mot trang tin tuc noi bat bang co `is_featured`
         * se dong bang: neu khong ai danh dau bai moi thi khoi tin tren trang chu
         * khong bao gio doi, va khong ai phat hien vi no van co noi dung.
         */
        this.content.listPosts(locale, {}, { pageSize: SO_NOI_DUNG }),
        this.daos.customers.findPublicWithLogo(SO_LOGO),
      ]);

    /**
     * Giai lien ket banner SAU khi co banner — khong the gop vao `Promise.all`
     * tren vi no phu thuoc ket qua cua no.
     *
     * Mot lan giai cho CA danh sach banner: `LinkResolver` gop theo LOAI, nen ba
     * banner tro toi ba san pham la MOT truy van chu khong phai ba.
     */
    const refBanner: LinkRef[] = banner.map((b) => ({
      linkType: b.linkType,
      linkTargetId: b.linkTargetId,
      customUrl: b.customUrl,
    }));
    const daGiai = await this.links.resolve(refBanner, locale);

    const banners: BannerView[] = banner.map((b, i) => ({
      title: b.title,
      subtitle: b.subtitle,
      image_id: b.imageId,
      mobile_image_id: b.mobileImageId,
      image_url: b.imagePublicUrl,
      mobile_image_url: b.mobileImagePublicUrl,
      image_alt: b.imageAlt,
      button_label: b.buttonLabel,
      /**
       * Banner giai khong ra dia chi thi GIU ANH, bo LIEN KET — khac voi muc menu,
       * cai bi bo han.
       *
       * Hai quyet dinh khac nhau cho cung mot van de, va su khac nhau la co ly:
       * mot muc menu chet la mot dong chu tro toi 404 (bo di thi khong ai thay),
       * con mot banner la ANH LON dau trang chu (bo di thi bang chay tro nen rong
       * hoac lech, va trang chu trong nhu bi hong). Anh van co gia tri thong tin
       * ma khong can lien ket.
       */
      url: this.links.urlOf(refBanner[i]!, daGiai),
      open_new_tab: b.openNewTab,
    }));

    return {
      locale,
      sections: khoi.map((s) => ({
        section_type: s.sectionType,
        display_order: s.displayOrder,
        settings: s.settings,
      })),
      banners,
      featured_categories: danhMuc.items,
      featured_brands: hang.items,
      featured_applications: ungDung.items,
      featured_products: sanPham.items,
      featured_services: dichVu.items,
      featured_projects: duAn.items,
      /**
       * `?? []` cho `listPosts`: no tra `null` khi DANH MUC trong bo loc khong ton
       * tai. O day khong truyen danh muc nao, nen `null` la khong the — nhung kieu
       * tra ve van la `| null`, va viet `!` de bo qua nghia la mot ngay ai do them
       * bo loc vao day se lam trang chu nem loi. Mang rong la ket qua dung cho
       * "khong co bai nao".
       */
      latest_posts: tin?.items ?? [],
      customers: khach.map(khachHang),
    };
  }

  // ══════════════════════════ dieu huong ══════════════════════════
  async navigation(location: NavLocation, locale: Locale): Promise<NavigationView> {
    /**
     * CACHE — dieu huong nam tren duong nong cua MOI trang.
     *
     * Trang chu duoc xem nhieu nhat, nhung dieu huong duoc goi o moi trang cua
     * moi phien. Va no la thu doi it nhat trong ca he thong: menu thay doi khi
     * bien tap sua menu, tuc vai lan mot nam.
     */
    return this.cache.lay(`nav:${location}:${locale}`, () => this.navThat(location, locale));
  }

  private async navThat(location: NavLocation, locale: Locale): Promise<NavigationView> {
    const cay = await this.daos.menus.findTreesByLocations(VI_TRI[location]);

    /**
     * MOT lan giai cho TAT CA muc cua TAT CA menu.
     *
     * Chan trang co bon menu, moi menu khoang nam muc. Giai tung menu la bon lan
     * goi; giai tung muc la 20. `LinkResolver` gop theo loai, nen ca 20 muc thuoc
     * ba loai la BA truy van — bat ke chung nam o menu nao.
     */
    const refs: LinkRef[] = [];
    const thu = (ns: readonly MenuItemNode[]): void => {
      for (const n of ns) {
        refs.push({ linkType: n.linkType, linkTargetId: n.linkTargetId, customUrl: n.customUrl });
        thu(n.children);
      }
    };
    for (const c of cay) thu(c.items);
    const daGiai = await this.links.resolve(refs, locale);

    const menus: MenuView[] = cay.map((c: MenuTree) => ({
      code: c.menu.code,
      name: c.menu.name,
      location: c.menu.location,
      items: this.mucMenu(c.items, daGiai),
    }));

    /**
     * MEGA MENU chi cho `header` va `mobile`.
     *
     * Chan trang khong co mega menu, va tra ve mot doi tuong rong o do se bat
     * frontend phan biet "vi tri nay khong co mega menu" voi "chua ai danh dau noi
     * bat" — hai truong hop khac nhau, cung mot hinh dang. `null` noi cai thu nhat.
     */
    const mega = location === 'footer' ? null : await this.megaMenu();
    return { location, menus, product_mega_menu: mega };
  }

  private async megaMenu(): Promise<ProductMegaMenuView> {
    const [danhMuc, hang] = await Promise.all([
      this.taxonomy.listProductCategories({ featured: true }, { pageSize: SO_NOI_BAT }),
      this.taxonomy.listBrands({ featured: true }, { pageSize: SO_NOI_BAT }),
    ]);
    return { categories: danhMuc.items, brands: hang.items };
  }

  /**
   * Dung `MenuItemView` va BO muc chet.
   *
   * BA truong hop, va chung khac nhau:
   *
   *   `link_type = 'none'`      TIEU DE nhom, khong phai lien ket. Cot chan trang
   *                             thuong co mot dong dau khong bam duoc. GIU, `url`
   *                             la `null`.
   *   giai khong ra, KHONG con  Muc tro toi noi dung da xoa / rut xuong nhap.
   *                             BO — de lai la mot lien ket 404 tren moi trang.
   *   giai khong ra, CO con     Muc tro toi noi dung da xoa NHUNG co muc con con
   *                             song. GIU nhu tieu de nhom. Bo ca nhanh nghia la
   *                             mat luon nhung lien ket con dung — mot muc cha
   *                             hong keo theo nam muc con lanh.
   */
  private mucMenu(
    ns: readonly MenuItemNode[],
    daGiai: Map<string, string>,
  ): readonly MenuItemView[] {
    const ra: MenuItemView[] = [];
    for (const n of ns) {
      const con = this.mucMenu(n.children, daGiai);
      const url = this.links.urlOf(
        { linkType: n.linkType, linkTargetId: n.linkTargetId, customUrl: n.customUrl },
        daGiai,
      );
      if (url === null && n.linkType !== 'none' && con.length === 0) continue;
      ra.push({
        label: n.label,
        label_i18n_key: n.labelI18nKey,
        url,
        open_new_tab: n.openNewTab,
        children: con,
      });
    }
    return ra;
  }

  // ══════════════════════════ khach hang · van phong ══════════════════════════
  async customers(limit?: number): Promise<readonly CustomerView[]> {
    /**
     * `findPublicWithLogo` — KHONG dung `list()`.
     *
     * `list({ status: 'published' })` se tra ve ca khach hang chua bat `is_public`,
     * va `is_public` la dieu kien PHAP LY: mot khach co the da duyet noi dung
     * nhung chua ky giay dong y cho dung logo. Dung logo khi chua duoc phep khong
     * phai loi giao dien.
     */
    const xs = await this.daos.customers.findPublicWithLogo(
      Math.min(TRAN_TRANG, Math.max(1, Math.trunc(limit ?? SO_LOGO))),
    );
    return xs.map(khachHang);
  }

  async offices(): Promise<readonly OfficeView[]> {
    const xs = await this.daos.offices.list({ status: 'published' });
    return xs.map((o) => ({
      office_type: o.officeType,
      name: o.name,
      address: o.address,
      working_hours: o.workingHours,
      phone: o.phone,
      fax: o.fax,
      email: o.email,
      map_url: o.mapUrl,
      latitude: o.latitude,
      longitude: o.longitude,
    }));
  }

  // ══════════════════════════ tim kiem ══════════════════════════
  async search(q: string, locale: Locale, page?: PageArg): Promise<PagedResult<SearchHitView>> {
    const p = trang(page);

    /**
     * San pham dung lai `ProductQueryService.list({ search })`, khong viet truy
     * van moi: duong do da co ADR-011 (san pham ngung kinh doanh VAN nam trong
     * ket qua, kem co), da khong nhan `status`, va da co bai kiem dem so truy van.
     *
     * San pham KHONG phu thuoc `locale` (ADR-014): ten may, model va ten hang
     * giu nguyen. Ba nhom noi dung thi CO ban dich, nen chung nhan `locale`.
     */
    const window = p.page * p.pageSize;
    const [products, content] = await Promise.all([
      this.products.list({ search: q }, 'default', { page: 1, pageSize: window }),
      this.content.searchContent(locale, q, window),
    ]);

    const productHits: SearchHitView[] = products.items.map((x) => ({
      type: 'product' as const,
      slug: x.slug,
      title: x.name,
      /**
       * `model` truoc `short_description`: nguoi tim "OptiDist" can biet ngay
       * day la model nao, va mo ta ngan cua nhieu san pham gan giong nhau.
       */
      subtitle: x.model ?? x.short_description,
    }));

    /**
     * GHEP roi CAT, thay vi phan trang tren tung nguon.
     *
     * Bon nguon co tong rieng, nen khong co mot `OFFSET` nao dung cho ca bon.
     * Cach lam o day la lay dung cua so `page * pageSize` dau tien tu moi nguon
     * roi cat lay trang can — voi cung mot thu tu uu tien, ket qua on dinh giua
     * cac trang va khong ban ghi nao xuat hien hai lan.
     *
     * GIOI HAN CO THAT: chi phi tang theo so trang, nen `TRAN_TRANG` chan lai o
     * 100. Tim kiem tren website nay khong di sau — nguoi khong tim thay o trang
     * dau se doi tu khoa chu khong lat den trang muoi. Neu ngay nao do can di
     * sau hon thi phai chuyen sang mot truy van UNION o tang DAO, va do la mot
     * viec khac han chu khong phai noi them vao day.
     */
    const all = [...productHits, ...content.items];
    const start = (p.page - 1) * p.pageSize;

    return {
      items: all.slice(start, start + p.pageSize),
      page: p.page,
      pageSize: p.pageSize,
      totalItems: products.totalItems + content.total,
    };
  }
}

/**
 * `logo_id` la `string`, khong phai `string | null`.
 *
 * `findPublicWithLogo` dung `innerJoin` tren `logo_id`, nen "co logo" la ket luan
 * cua truy van chu khong phai mot dieu kien phai kiem lai o day. Hinh dang view
 * noi dieu do ra: frontend khong can viet nhanh "neu khong co logo".
 */
function khachHang(c: {
  name: string;
  shortDescription: string | null;
  logoId: string;
  logoUrl: string;
  websiteUrl: string | null;
}): CustomerView {
  return {
    name: c.name,
    short_description: c.shortDescription,
    logo_id: c.logoId,
    logo_url: c.logoUrl,
    website_url: c.websiteUrl,
  };
}
