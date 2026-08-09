import type { ContentBlock, Locale } from '@ltv/contracts';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type {
  PublishableEntity,
  PublishBlocker,
  PublishCheck,
  PublishService,
  PublishTarget,
} from './publish.interface.js';

export type PublishDaos = DaoScope<
  'products' | 'brands' | 'documents' | 'services' | 'projects' | 'posts' | 'pages' | 'media'
>;

/**
 * Tap DAO da gan transaction. Cac ham kiem dieu kien nhan kieu NAY chu khong
 * phai `PublishDaos`: nho vay chung goi duoc ca ngoai transaction (cho
 * `check()`) lan trong transaction (cho `publish()`), va KHONG the vo tinh
 * mo transaction long nhau.
 */
type PublishTx = Omit<PublishDaos, 'transaction'>;

/**
 * DIEU KIEN XUAT BAN — `05` PHAN IV.
 *
 * Bay thuc the, bay danh sach khac nhau. Gop chung thanh mot danh sach chung
 * se hoac qua chat (chan publish mot tai lieu vi thieu anh dai dien ma tai
 * lieu khong co khai niem do) hoac qua long (cho san pham len song ma khong
 * co danh muc chinh).
 */
export class PublishServiceImpl implements PublishService {
  constructor(private readonly daos: PublishDaos) {}

  async check(target: PublishTarget): Promise<PublishCheck> {
    const blockers = await this.collectBlockers(target);
    return blockers.length === 0 ? { ok: true } : { ok: false, blockers };
  }

  async publish(target: PublishTarget, at: Date = new Date()): Promise<void> {
    /**
     * Kiem LAI trong transaction, khong tin ket qua cua `check()` truoc do.
     *
     * Giua luc giao dien goi `check()` va luc nguoi dung bam Publish co the
     * la vai phut. Trong khoang do, mot nguoi khac da co the xoa cai anh dai
     * dien hoac go danh muc chinh. Kiem hai lan ton mot vong truy van; bo
     * qua lan hai thi thinh thoang co mot trang cong khai bi thieu.
     */
    await this.daos.transaction(async (tx) => {
      const blockers = await this.collectBlockers(target, tx);
      if (blockers.length > 0) {
        throw new ConflictError(
          'PUBLISH_PRECONDITION_FAILED',
          `Chua du dieu kien xuat ban ${target.entity}`,
          { blockers },
        );
      }
      await this.writePublish(tx, target, at);
    });
  }

  async unpublish(target: PublishTarget): Promise<void> {
    const { entity, id, locale } = target;
    switch (entity) {
      case 'product':
        await this.daos.products.unpublish(id);
        return;
      case 'brand':
        await this.daos.brands.unpublish(id);
        return;
      case 'document':
        await this.daos.documents.unpublish(id);
        return;
      // Ha co BAN DICH, khong ha co ca thuc the: ban tieng Anh co van de
      // khong phai ly do go ban tieng Viet xuong.
      case 'service':
        await this.daos.services.unpublishTranslation(id, req(locale, entity));
        return;
      case 'project':
        await this.daos.projects.unpublishTranslation(id, req(locale, entity));
        return;
      case 'post':
        await this.daos.posts.unpublishTranslation(id, req(locale, entity));
        return;
      case 'page':
        await this.daos.pages.unpublishTranslation(id, req(locale, entity));
        return;
    }
  }

  // ══════════════════ dieu kien theo tung loai ══════════════════

  private async collectBlockers(
    target: PublishTarget,
    daos: PublishTx = this.daos,
  ): Promise<PublishBlocker[]> {
    switch (target.entity) {
      case 'product':
        return this.productBlockers(target.id, daos);
      case 'brand':
        return this.brandBlockers(target.id, daos);
      case 'document':
        return this.documentBlockers(target.id, daos);
      case 'service':
        return this.serviceBlockers(target.id, req(target.locale, 'service'), daos);
      case 'project':
        return this.projectBlockers(target.id, req(target.locale, 'project'), daos);
      case 'post':
        return this.postBlockers(target.id, req(target.locale, 'post'), daos);
      case 'page':
        return this.pageBlockers(target.id, req(target.locale, 'page'), daos);
    }
  }

  /** name, slug, short_description, overview, brand, >=1 category, dung 1 primary, featured_image. */
  private async productBlockers(id: string, d: PublishTx): Promise<PublishBlocker[]> {
    const p = await d.products.findById(id);
    if (!p) throw new NotFoundError('PRODUCT_NOT_FOUND', `Khong tim thay san pham ${id}`);

    const b: PublishBlocker[] = [];
    if (isBlank(p.name)) b.push(f('name', 'Thieu ten san pham'));
    if (isBlank(p.slug)) b.push(f('slug', 'Thieu duong dan'));
    if (isBlank(p.shortDescription)) b.push(f('short_description', 'Thieu mo ta ngan'));
    if (isEmptyBlocks(p.overview)) b.push(f('overview', 'Thieu phan gioi thieu'));

    if (!p.featuredImageId) {
      b.push(f('featured_image_id', 'Thieu anh dai dien'));
    } else if (!(await d.media.findById(p.featuredImageId))) {
      // Anh CO id nhung da bi xoa mem — the san pham se hien o trong.
      b.push(f('featured_image_id', 'Anh dai dien da bi xoa'));
    }

    // ADR-010: nhieu danh muc, DUNG MOT la chinh.
    if (!(await d.products.findPrimaryCategoryId(id))) {
      b.push(f('category', 'Chua chon danh muc chinh'));
    }

    // Hang chua bi xoa — khoa ngoai la RESTRICT nen hang khong the bien mat,
    // nhung no CO THE da bi xoa mem, va trang chi tiet se hien hang trong.
    if (!(await d.brands.findById(p.brandId))) {
      b.push(f('brand_id', 'Hang san xuat da bi xoa'));
    }
    return b;
  }

  /** name, slug, logo, short_description, brand_type. */
  private async brandBlockers(id: string, d: PublishTx): Promise<PublishBlocker[]> {
    const x = await d.brands.findById(id);
    if (!x) throw new NotFoundError('BRAND_NOT_FOUND', `Khong tim thay hang ${id}`);

    const b: PublishBlocker[] = [];
    if (isBlank(x.name)) b.push(f('name', 'Thieu ten hang'));
    if (isBlank(x.slug)) b.push(f('slug', 'Thieu duong dan'));
    if (isBlank(x.shortDescription)) b.push(f('short_description', 'Thieu mo ta ngan'));
    if (!x.logoId) b.push(f('logo_id', 'Thieu logo'));
    else if (!(await d.media.findById(x.logoId))) b.push(f('logo_id', 'Logo da bi xoa'));
    return b;
  }

  /** title, slug, file_id tro toi media ton tai va chua xoa, document_type. */
  private async documentBlockers(id: string, d: PublishTx): Promise<PublishBlocker[]> {
    const x = await d.documents.findById(id);
    if (!x) throw new NotFoundError('DOCUMENT_NOT_FOUND', `Khong tim thay tai lieu ${id}`);

    const b: PublishBlocker[] = [];
    if (isBlank(x.title)) b.push(f('title', 'Thieu tieu de'));
    if (isBlank(x.slug)) b.push(f('slug', 'Thieu duong dan'));
    // Tep la LY DO tai lieu ton tai. Nut tai ve tro toi 404 la kieu hong
    // khach thay truoc minh.
    if (!(await d.media.findById(x.fileId))) b.push(f('file_id', 'Tep dinh kem da bi xoa'));
    return b;
  }

  /** ban dich: name, slug, short_description, scope_of_work; featured_image; khong vong lap cay. */
  private async serviceBlockers(
    id: string,
    locale: Locale,
    d: PublishTx,
  ): Promise<PublishBlocker[]> {
    const s = await d.services.findById(id);
    if (!s) throw new NotFoundError('SERVICE_NOT_FOUND', `Khong tim thay dich vu ${id}`);
    const t = await d.services.findTranslation(id, locale);

    const b: PublishBlocker[] = [];
    if (!t) return [f('translation', `Chua co ban dich ${locale}`)];
    if (isBlank(t.name)) b.push(f('name', 'Thieu ten dich vu'));
    if (isBlank(t.slug)) b.push(f('slug', 'Thieu duong dan'));
    if (isBlank(t.shortDescription)) b.push(f('short_description', 'Thieu mo ta ngan'));
    if (isEmptyBlocks(t.scopeOfWork)) b.push(f('scope_of_work', 'Thieu pham vi cong viec'));

    if (!s.featuredImageId) b.push(f('featured_image_id', 'Thieu anh dai dien'));
    else if (!(await d.media.findById(s.featuredImageId))) {
      b.push(f('featured_image_id', 'Anh dai dien da bi xoa'));
    }

    // Cay hong thi breadcrumb va menu con sinh sai. `findInconsistentNodes`
    // quet ca bang; chi bao khi CHINH nut nay hong.
    if ((await d.services.findInconsistentNodes()).includes(id)) {
      b.push(f('parent_id', 'Vi tri trong cay dich vu khong nhat quan'));
    }
    return b;
  }

  /** ban dich: title, short_description, scope_of_work; project_type, customer_visibility, >=1 anh. */
  private async projectBlockers(
    id: string,
    locale: Locale,
    d: PublishTx,
  ): Promise<PublishBlocker[]> {
    const p = await d.projects.findById(id);
    if (!p) throw new NotFoundError('PROJECT_NOT_FOUND', `Khong tim thay du an ${id}`);
    const t = await d.projects.findTranslation(id, locale);

    const b: PublishBlocker[] = [];
    if (!t) return [f('translation', `Chua co ban dich ${locale}`)];
    if (isBlank(t.title)) b.push(f('title', 'Thieu tieu de'));
    if (isBlank(t.slug)) b.push(f('slug', 'Thieu duong dan'));
    if (isBlank(t.shortDescription)) b.push(f('short_description', 'Thieu mo ta ngan'));
    if (isEmptyBlocks(t.scopeOfWork)) b.push(f('scope_of_work', 'Thieu pham vi cong viec'));

    // Du an la trang ke chuyen — khong co anh thi khong co gi de ke.
    if ((await d.projects.countMedia(id)) === 0) b.push(f('media', 'Can it nhat mot anh'));

    /**
     * Kiem RANH GIOI TEN KHACH ngay tai day.
     *
     * `hide_name` ma chua dat `customer_display_name` thi trang se hien mot
     * cho trong o vi tri ten khach. Te hon: neu ai do sau nay "sua cho dep"
     * bang cach lay tam ten that, thi mot khach da ky NDA bi neu ten. Chan
     * ngay o buoc publish la re nhat.
     */
    if (p.customerVisibility === 'hide_name' && isBlank(t.customerDisplayName)) {
      b.push(f('customer_display_name', 'Muc do "an ten" nhung chua dat ten hien thi'));
    }
    return b;
  }

  /** ban dich: title, slug, excerpt, content; category, featured_image. */
  private async postBlockers(id: string, locale: Locale, d: PublishTx): Promise<PublishBlocker[]> {
    const p = await d.posts.findById(id);
    if (!p) throw new NotFoundError('POST_NOT_FOUND', `Khong tim thay bai viet ${id}`);
    const t = await d.posts.findTranslation(id, locale);

    const b: PublishBlocker[] = [];
    if (!t) return [f('translation', `Chua co ban dich ${locale}`)];
    if (isBlank(t.title)) b.push(f('title', 'Thieu tieu de'));
    if (isBlank(t.slug)) b.push(f('slug', 'Thieu duong dan'));
    if (isBlank(t.excerpt)) b.push(f('excerpt', 'Thieu doan trich'));
    if (isEmptyBlocks(t.content)) b.push(f('content', 'Noi dung rong'));

    if (!p.featuredImageId) b.push(f('featured_image_id', 'Thieu anh dai dien'));
    else if (!(await d.media.findById(p.featuredImageId))) {
      b.push(f('featured_image_id', 'Anh dai dien da bi xoa'));
    }
    return b;
  }

  /** ban dich: title, slug, content khong rong; page_type hop le; trang he thong bat buoc co `en`. */
  private async pageBlockers(id: string, locale: Locale, d: PublishTx): Promise<PublishBlocker[]> {
    const p = await d.pages.findById(id);
    if (!p) throw new NotFoundError('PAGE_NOT_FOUND', `Khong tim thay trang ${id}`);
    const t = await d.pages.findTranslation(id, locale);

    const b: PublishBlocker[] = [];
    if (!t) return [f('translation', `Chua co ban dich ${locale}`)];
    if (isBlank(t.title)) b.push(f('title', 'Thieu tieu de'));
    if (isBlank(t.slug)) b.push(f('slug', 'Thieu duong dan'));
    if (isEmptyBlocks(t.content)) b.push(f('content', 'Noi dung rong'));
    if (isBlank(p.pageType)) b.push(f('page_type', 'Thieu ma loai trang'));

    /**
     * Trang he thong (chinh sach bao mat, dieu khoan) BAT BUOC co ban `en`.
     *
     * Ly do la tuan thu: mac dinh cua site la tieng Anh, nen mot chinh sach
     * chi co ban tieng Viet nghia la phan lon nguoi truy cap khong doc duoc
     * dieu khoan ho dang bi rang buoc.
     *
     * Cho phep xuat ban ban `en` truoc — dieu kien nay chi chan khi dang
     * xuat ban ban `vi` ma ban `en` chua co.
     */
    if (p.isSystemPage && locale !== 'en') {
      const missing = await d.pages.findSystemPagesMissingEnglish();
      if (missing.includes(p.pageType)) {
        b.push(f('translation.en', 'Trang he thong phai co ban tieng Anh da xuat ban truoc'));
      }
    }
    return b;
  }

  // ══════════════════ ghi ══════════════════

  private async writePublish(tx: PublishTx, target: PublishTarget, at: Date): Promise<void> {
    const { entity, id, locale } = target;
    switch (entity) {
      case 'product':
        await tx.products.publish(id, at);
        return;
      case 'brand':
        await tx.brands.publish(id, at);
        return;
      case 'document':
        await tx.documents.publish(id, at);
        return;

      /**
       * Nhom co ban dich: xuat ban HAI CAP, va ca hai deu can.
       *
       *   bang cha   — dich vu nay con cung cap khong
       *   ban dich   — ban tieng nay da viet xong chua
       *
       * Xuat ban ban dich ma quen bang cha thi hreflang khong sinh va trang
       * khong len song (xem `TranslationSupport.hreflangAlternates`). Gop hai
       * lenh vao day de nguoi goi khong the quen mot cai.
       */
      case 'service':
        await tx.services.publish(id, at);
        await tx.services.publishTranslation(id, req(locale, entity), at);
        return;
      case 'project':
        await tx.projects.publish(id, at);
        await tx.projects.publishTranslation(id, req(locale, entity), at);
        return;
      case 'post':
        await tx.posts.publish(id, at);
        await tx.posts.publishTranslation(id, req(locale, entity), at);
        return;
      case 'page':
        await tx.pages.publish(id, at);
        await tx.pages.publishTranslation(id, req(locale, entity), at);
        return;
    }
  }
}

// ══════════════════ tien ich ══════════════════

const f = (field: string, message: string): PublishBlocker => ({ field, message });

/** Chuoi rong hoac chi co khoang trang cung la thieu. */
function isBlank(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === '';
}

/**
 * Mang khoi rong.
 *
 * Chu y: mot mang co dung mot khoi `divider` cung la RONG ve mat noi dung.
 * Neu chi kiem `length === 0` thi mot trang chi co duong ke ngang van
 * publish duoc.
 */
function isEmptyBlocks(blocks: readonly ContentBlock[] | null | undefined): boolean {
  if (!blocks || blocks.length === 0) return true;
  return blocks.every((b) => b.type === 'divider');
}

function req(locale: Locale | undefined, entity: PublishableEntity): Locale {
  if (!locale) {
    throw new ConflictError('PUBLISH_LOCALE_REQUIRED', `Xuat ban ${entity} phai chi ro ngon ngu`);
  }
  return locale;
}
