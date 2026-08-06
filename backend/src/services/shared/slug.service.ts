import { buildReservedPaths, isReservedPath, localizedPath, type Locale } from '@ltv/contracts';
import { ConflictError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type {
  RenameInput,
  SluggedEntity,
  SlugCheckInput,
  SlugCheckResult,
  SlugService,
} from './slug.interface.js';

/**
 * Nhung bang ma SlugService duoc cham.
 *
 * Danh sach nay la ranh gioi: go `this.daos.inquiries` la LOI BIEN DICH,
 * khong phai gop y luc review. Muon them bang thi phai them ten vao day, va
 * cho them do chinh la noi nguoi review nhin thay.
 */
export type SlugDaos = DaoScope<
  | 'redirects'
  | 'products' | 'brands' | 'productCategories' | 'standards' | 'applications'
  | 'industries' | 'documents' | 'postCategories'
  | 'pages' | 'posts' | 'services' | 'projects'
>;

/**
 * Tap DAO da gan transaction — chinh la thu `daos.transaction` truyen vao.
 * Khong co `transaction` ben trong: long transaction la loi, va kieu nay
 * lam dieu do thanh loi BIEN DICH thay vi loi luc chay.
 */
type SlugTx = Omit<SlugDaos, 'transaction'>;

/**
 * Tien to duong dan cong khai theo tung nhom (ADR-001 muc 3 va 4).
 *
 * Bang nay PHAI khop bang route o `02` PHAN II. Test doi chieu giu hai ben
 * khong lech — neu doi URL o mot noi ma quen noi kia, SlugService se kiem
 * nham duong dan va cho qua mot va cham that.
 */
const PATH_PREFIX: Readonly<Record<SluggedEntity, string>> = {
  product: '/products',
  brand: '/brands',
  product_category: '/products/category',
  standard: '/products/standard',
  application: '/products/application',
  industry: '/products/application',   // nganh dung chung khong gian voi ung dung
  document: '/resources',
  post_category: '/news/category',
  page: '/about',
  post: '/news',
  service: '/services',
  project: '/projects',
};

/** Bon nhom co ban dich (ADR-014) — duong dan cua chung mang tien to locale. */
const TRANSLATED: ReadonlySet<SluggedEntity> = new Set(['page', 'post', 'service', 'project']);

/**
 * Slug hop le: chu thuong, so, dau gach ngang. Khong dau gach o dau/cuoi,
 * khong hai gach lien tiep.
 *
 * Khong nhan chu hoa: `/products/OptiDist` va `/products/optidist` la hai
 * duong dan khac nhau voi Google nhung nguoi dung tuong la mot — nguon goc
 * cua noi dung trung lap.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class SlugServiceImpl implements SlugService {
  private readonly reserved: ReadonlySet<string>;

  constructor(private readonly daos: SlugDaos) {
    // Tinh MOT LAN: tap nay sinh tu hang so trong ma nguon, khong doi luc chay.
    this.reserved = buildReservedPaths();
  }

  publicPath(entity: SluggedEntity, slug: string, locale?: Locale): string {
    const base = `${PATH_PREFIX[entity]}/${slug}`;
    if (!TRANSLATED.has(entity) || locale === undefined) return base;
    return localizedPath(base, locale);
  }

  async check(input: SlugCheckInput): Promise<SlugCheckResult> {
    const path = this.publicPath(input.entity, input.slug, input.locale);

    if (!SLUG_PATTERN.test(input.slug)) {
      return { ok: false, path, reason: 'invalid_format', code: 'SLUG_INVALID' };
    }

    // ── (C) route he thong ─────────────────────────────────────────
    // Kiem TRUOC vi no khong cham database: mot slug ten `all` hay `category`
    // bi tu choi ngay ma khong ton mot truy van nao.
    if (isReservedPath(path, this.reserved)) {
      return { ok: false, path, reason: 'reserved_route', code: 'SLUG_RESERVED' };
    }

    // ── (B) namespace URL da tung dung ─────────────────────────────
    // Mot duong dan da nam trong `redirects.source_path` la duong dan da
    // tro toi noi khac. Cap lai cho noi dung moi tao ra hai y nghia cho cung
    // mot URL, va Google se giu y nghia cu trong nhieu thang.
    if (await this.daos.redirects.findActiveBySource(path)) {
      return { ok: false, path, reason: 'in_redirects', code: 'SLUG_IN_REDIRECTS' };
    }

    // ── (A) slug hien tai trong bang tuong ung ─────────────────────
    const taken = await this.isTaken(input);
    if (taken) {
      return { ok: false, path, reason: taken, code: taken === 'soft_deleted' ? 'SLUG_SOFT_DELETED' : 'SLUG_IN_USE' };
    }

    return { ok: true, path };
  }

  async assertAvailable(input: SlugCheckInput): Promise<void> {
    const r = await this.check(input);
    if (r.ok) return;
    throw new ConflictError(r.code, `Khong dung duoc duong dan ${r.path}: ${r.reason}`, {
      path: r.path,
      reason: r.reason,
    });
  }

  /**
   * Ba buoc trong MOT transaction.
   *
   * Thu tu la co y: kiem TRUOC khi ghi, va tao redirect trong cung don vi
   * voi lenh ghi. Neu tach redirect ra ngoai thi co mot khoang thoi gian —
   * du chi vai chuc mili giay — trang cu tra 404. Voi crawler dang o dung
   * tren trang do thi khoang do la du.
   */
  async rename(input: RenameInput): Promise<{ oldPath: string; newPath: string }> {
    const oldPath = this.publicPath(input.entity, input.currentSlug, input.locale);
    const newPath = this.publicPath(input.entity, input.slug, input.locale);

    if (oldPath === newPath) return { oldPath, newPath };

    await this.assertAvailable(input);

    return this.daos.transaction(async (tx) => {
      await this.writeSlug(tx, input);

      // Slug chua bao gio cong khai thi khong ai co lien ket toi no —
      // tao redirect chi lam ban bang `redirects` va them mot chang cho
      // moi yeu cau khong khop route.
      if (input.wasEverPublished) {
        await tx.redirects.createCollapsingChain({
          sourcePath: oldPath,
          targetPath: newPath,
          redirectType: 301,
        });
      }
      return { oldPath, newPath };
    });
  }

  async canHardDelete(entity: SluggedEntity, id: string): Promise<boolean> {
    switch (entity) {
      case 'product': return this.daos.products.canHardDelete(id);
      case 'brand': return this.daos.brands.canHardDelete(id);
      case 'product_category': return this.daos.productCategories.canHardDelete(id);
      case 'standard': return this.daos.standards.canHardDelete(id);
      case 'application': return this.daos.applications.canHardDelete(id);
      case 'industry': return this.daos.industries.canHardDelete(id);
      case 'document': return this.daos.documents.canHardDelete(id);
      case 'post_category': return this.daos.postCategories.canHardDelete(id);
      // Bon nhom co ban dich: moc "da tung cong khai" nam tren TUNG BAN DICH,
      // nen "co xoa duoc ca thuc the khong" la cau hoi khac va thuoc
      // PublishService. O day tra ve `false` — phia an toan.
      case 'page': case 'post': case 'service': case 'project':
        return false;
    }
  }

  // ── phan rieng theo bang ───────────────────────────────────────

  /**
   * (A) — slug co dang bi chiem khong, VA co phai boi noi dung da xoa mem.
   *
   * Phan biet hai truong hop vi thong bao khac nhau: "dang co san pham dung
   * ten nay" thi doi ten; "san pham cu da xoa nhung slug bi khoa vinh vien"
   * thi phai giai thich, khong thi nguoi soan thao se cu thu lai mai.
   */
  private async isTaken(
    input: SlugCheckInput,
  ): Promise<'in_use' | 'soft_deleted' | null> {
    const { entity, slug, locale, exceptId } = input;

    // Bon nhom co ban dich: rang buoc la `UNIQUE (locale, slug)`.
    if (TRANSLATED.has(entity)) {
      const loc = locale ?? 'en';
      const free = await this.translatedSlugFree(entity, loc, slug, exceptId);
      return free ? null : 'in_use';
    }

    // Nhom mot ngon ngu: `UNIQUE (slug)` tren chinh bang entity.
    const free = await this.singleSlugFree(entity, slug, exceptId);
    if (free) return null;

    // Con hien thay khong? Khong thay = da xoa mem nhung slug van bi giu.
    const visible = await this.findVisibleBySlug(entity, slug);
    return visible ? 'in_use' : 'soft_deleted';
  }

  private translatedSlugFree(
    entity: SluggedEntity, locale: Locale, slug: string, exceptId?: string,
  ): Promise<boolean> {
    switch (entity) {
      case 'page': return this.daos.pages.isLocaleSlugAvailable(locale, slug, exceptId);
      case 'post': return this.daos.posts.isLocaleSlugAvailable(locale, slug, exceptId);
      case 'service': return this.daos.services.isLocaleSlugAvailable(locale, slug, exceptId);
      case 'project': return this.daos.projects.isLocaleSlugAvailable(locale, slug, exceptId);
      default: throw new Error(`Khong phai nhom co ban dich: ${entity}`);
    }
  }

  private singleSlugFree(
    entity: SluggedEntity, slug: string, exceptId?: string,
  ): Promise<boolean> {
    switch (entity) {
      case 'product': return this.daos.products.isSlugAvailable(slug, exceptId);
      case 'brand': return this.daos.brands.isSlugAvailable(slug, exceptId);
      case 'product_category': return this.daos.productCategories.isSlugAvailable(slug, exceptId);
      case 'standard': return this.daos.standards.isSlugAvailable(slug, exceptId);
      case 'application': return this.daos.applications.isSlugAvailable(slug, exceptId);
      case 'industry': return this.daos.industries.isSlugAvailable(slug, exceptId);
      case 'document': return this.daos.documents.isSlugAvailable(slug, exceptId);
      case 'post_category': return this.daos.postCategories.isSlugAvailable(slug, exceptId);
      default: throw new Error(`Khong phai nhom mot ngon ngu: ${entity}`);
    }
  }

  private async findVisibleBySlug(entity: SluggedEntity, slug: string): Promise<boolean> {
    switch (entity) {
      case 'product': return (await this.daos.products.findBySlug(slug)) !== null;
      case 'brand': return (await this.daos.brands.findBySlug(slug)) !== null;
      case 'product_category': return (await this.daos.productCategories.findBySlug(slug)) !== null;
      case 'standard': return (await this.daos.standards.findBySlug(slug)) !== null;
      case 'application': return (await this.daos.applications.findBySlug(slug)) !== null;
      case 'industry': return (await this.daos.industries.findBySlug(slug)) !== null;
      case 'document': return (await this.daos.documents.findBySlug(slug)) !== null;
      case 'post_category': return (await this.daos.postCategories.findBySlug(slug)) !== null;
      default: return false;
    }
  }

  private async writeSlug(tx: SlugTx, input: RenameInput): Promise<void> {
    const { entity, id, slug, locale } = input;
    switch (entity) {
      case 'product': await tx.products.update(id, { slug }); return;
      case 'brand': await tx.brands.update(id, { slug }); return;
      case 'product_category': await tx.productCategories.update(id, { slug }); return;
      case 'standard': await tx.standards.update(id, { slug }); return;
      case 'application': await tx.applications.update(id, { slug }); return;
      case 'industry': await tx.industries.update(id, { slug }); return;
      case 'document': await tx.documents.update(id, { slug }); return;
      case 'post_category': await tx.postCategories.update(id, { slug }); return;

      /**
       * Bon nhom co ban dich KHONG doi slug qua day.
       *
       * Slug cua chung nam tren hang dich, va doi no phai ghi lai ca ban dich
       * (tieu de, noi dung, SEO) qua `upsertTranslation`. Nhan mot minh cai
       * slug o day se de lai ban dich thieu truong. Service cua tung nhom se
       * goi `SlugService.check` roi tu ghi.
       */
      case 'page': case 'post': case 'service': case 'project':
        throw new Error(
          `Doi slug cua ${entity} phai di qua service cua chinh no (ghi ca ban dich)`,
        );
    }
  }
}
