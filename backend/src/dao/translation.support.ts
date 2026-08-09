import { sql } from 'kysely';
import { SlugSupport } from './slugged.dao.js';
import type { KyselyExecutor } from './connection.js';

/**
 * LOP CHA cho bon thuc the CO BAN DICH:
 *   services · projects · posts · pages
 *
 * ADR-014 giu lai dung bon bang translation nay, theo luat:
 *   "Mot bang translation chi dang ton tai neu se co nguoi ngoi xuong viet
 *    ban thu hai."
 * San pham va tieu chuan khong co bang dich vi khong ai dich chung; bon cai
 * o day thi co — dich vu, du an, bai viet, trang tinh deu se duoc viet ca
 * tieng Viet lan tieng Anh.
 *
 * KHUON CHUNG cua ca bon:
 *   bang cha    giu trang thai, anh dai dien, quan he — KHONG co tieu de/slug
 *   bang dich   giu tieu de, slug, noi dung, trang thai RIENG theo locale
 *   rang buoc   UNIQUE (entity_id, locale) va UNIQUE (locale, slug)
 *
 * Vi sao dang lam lop KET HOP chu khong phai lop cha:
 * `services` vua la CAY vua co ban dich. TypeScript chi cho ke thua mot lop,
 * ma `TreeDao` da giu cho do. Cung rang buoc nay tung buoc `SluggedDao` thanh
 * `SlugSupport`; giu nguyen cach lam do de ca tang dao chi co MOT khuon,
 * khong phai nho bang nao ke thua cai gi.
 *
 * Vi sao van tach ra thay vi chep bon lan: quy tac hreflang duoi day la thu
 * de sai nhat trong ca nhom, va sai thi Google im lang bo qua trang — khong
 * co gi bao. Viet mot lan, kiem mot lan.
 */
export type Locale = 'vi' | 'en';
export const LOCALES: readonly Locale[] = ['vi', 'en'];

/**
 * Hau to `...TableName` (khong phai `...Table`) la CO Y.
 *
 * Day la ten bang duoi dang chuoi, khong phai kieu hang cua Kysely. Luat
 * kien truc so 2 quet `\w+Table\b` de bat kieu hang lot ra khoi `dao.ts`
 * va `mapper.ts`; dat ten ket thuc bang `Table` se lam luat do bao dong gia.
 * `TreeTableName` va `SluggedTableName` da theo quy uoc nay tu truoc.
 */
export type TranslatedParentTableName = 'services' | 'projects' | 'posts' | 'pages';
export type TranslationTableName =
  | 'service_translations' | 'project_translations'
  | 'post_translations' | 'page_translations';

/** Trang thai cua mot ban dich — dung cho man hinh quan tri. */
export interface TranslationStatus {
  readonly locale: Locale;
  readonly slug: string;
  readonly title: string;
  readonly status: 'draft' | 'published' | 'hidden';
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

/**
 * Mot dong trong danh sach cong khai theo locale.
 *
 * `entityId` la id cua bang CHA, khong phai id cua hang dich: tang tren lam viec
 * voi thuc the, con hang dich chi la mot cach the hien cua no. Tang service dung
 * id nay de lay them quan he (anh dai dien, danh muc) theo LO — mot truy van cho
 * ca trang, khong phai mot truy van moi dong.
 */
export interface PublicTranslationRow {
  readonly entityId: string;
  readonly slug: string;
  readonly title: string;
  readonly publishedAt: Date | null;
}

/** Mot muc `<link rel="alternate" hreflang="...">`. */
export interface HreflangAlternate {
  readonly locale: Locale;
  readonly slug: string;
}

export class TranslationMissingError extends Error {
  constructor(readonly entityId: string, readonly locale: Locale) {
    super(`Khong co ban dich ${locale} cho ${entityId}`);
    this.name = 'TranslationMissingError';
  }
}

export interface TranslationConfig {
  readonly parentTable: TranslatedParentTableName;
  readonly trTable: TranslationTableName;
  /** Ten cot khoa ngoai tro ve bang cha: `service_id`, `post_id`, ... */
  readonly parentKey: string;
  /** `services` dung `name`, ba bang con lai dung `title`. */
  readonly titleColumn: 'name' | 'title';
}

/**
 * `TCol` — ten cot duoc phep loc tren bang CHA.
 *
 * Tham so kieu nay la ban va cho han che toi da ghi lai o lan truoc: ten cot
 * trong `where` khong duoc kiem, nen go sai cho ra loi luc CHAY
 * (`column p.post_type does not exist` — toi dinh dung do that khi thu ham).
 *
 * Moi DAO khai bao dung nhung cot cua bang minh:
 *
 *     new TranslationSupport<'category_id' | 'post_type'>(db, {...})
 *
 * Go sai gio la loi BIEN DICH. Mac dinh `never` nghia la khong khai bao thi
 * khong duoc loc gi — an toan hon la cho phep tat ca.
 */
export class TranslationSupport<TCol extends string = never> {
  private readonly parentTable: TranslatedParentTableName;
  private readonly trTable: TranslationTableName;
  private readonly parentKey: string;
  private readonly titleColumn: 'name' | 'title';
  /** Slug cua nhom nay phan pham vi theo locale — `UNIQUE (locale, slug)`. */
  private readonly slugs: SlugSupport;

  constructor(private readonly db: KyselyExecutor, cfg: TranslationConfig) {
    this.parentTable = cfg.parentTable;
    this.trTable = cfg.trTable;
    this.parentKey = cfg.parentKey;
    this.titleColumn = cfg.titleColumn;
    this.slugs = new SlugSupport(db, cfg.trTable, true);
  }

  // ── tra cuu ────────────────────────────────────────────────────

  /**
   * Tim thuc the tu cap (locale, slug) — day la cach BO DINH TUYEN giai URL.
   *
   * Tra ve id cua bang CHA, khong phai id cua hang dich: tang tren lam viec
   * voi thuc the, con hang dich chi la mot cach the hien cua no.
   */
  async findIdByLocaleSlug(locale: Locale, slug: string): Promise<string | null> {
    const r = await sql<{ pid: string }>`
      SELECT ${sql.ref(this.parentKey)} AS pid
      FROM ${sql.table(`ltv.${this.trTable}`)}
      WHERE locale = ${locale} AND slug = ${slug}
    `.execute(this.db);
    return r.rows[0]?.pid ?? null;
  }

  /** Moi ban dich hien co cua mot thuc the — cho man hinh quan tri. */
  async listTranslations(entityId: string): Promise<TranslationStatus[]> {
    const r = await sql<{
      locale: Locale; slug: string; title: string;
      status: 'draft' | 'published' | 'hidden';
      published_at: Date | null; first_published_at: Date | null;
    }>`
      SELECT locale, slug, ${sql.ref(this.titleColumn)} AS title,
             status, published_at, first_published_at
      FROM ${sql.table(`ltv.${this.trTable}`)}
      WHERE ${sql.ref(this.parentKey)} = ${entityId}
      ORDER BY locale
    `.execute(this.db);
    return r.rows.map((x) => ({
      locale: x.locale,
      slug: x.slug,
      title: x.title,
      status: x.status,
      publishedAt: x.published_at,
      firstPublishedAt: x.first_published_at,
    }));
  }

  async findTranslationStatus(entityId: string, locale: Locale): Promise<TranslationStatus | null> {
    const all = await this.listTranslations(entityId);
    return all.find((t) => t.locale === locale) ?? null;
  }

  /**
   * DANH SACH CONG KHAI theo locale — id cua thuc the + slug + tieu de.
   *
   * Vi sao ham nay phai ton tai (va vi sao no khong co tu D3/D5):
   *
   * Tang dao xay xong duong GHI (`upsertTranslation`) va duong CHI TIET
   * (`findBySlug(locale, slug)`), nhung KHONG co duong DANH SACH theo locale.
   * F3 co ba endpoint danh sach — `/posts`, `/projects`, `/services` — va voi
   * be mat cu thi cach duy nhat de lam la:
   *
   *     list(filter)              -> 20 thuc the
   *     findTranslation(id, loc)  -> x20
   *
   * tuc N+1 dung nghia, tren dung nhung trang duoc xem nhieu nhat. `doc/06`
   * cam dieu do, va mot ban dung tam roi "toi uu sau" se khong bao gio duoc
   * quay lai.
   *
   * Dat o `TranslationSupport` chu khong viet bon lan trong bon `dao.ts`: dieu
   * kien HAI TRANG THAI duoi day la thu de sai nhat trong ca nhom, va viet bon
   * lan la bon co hoi sai khac nhau.
   *
   * HAI DIEU KIEN, va thieu mot cai la mot lo ro ri khac nhau:
   *
   *   p.status = 'published' AND p.deleted_at IS NULL   thuc the da duyet
   *   t.status = 'published'                            BAN DICH nay da duyet
   *
   * Thieu dieu kien thu nhat: mot bai viet da rut xuong nhap van con URL tieng
   * Viet song. Thieu dieu kien thu hai: ban dich dang viet nua voi bi cong bo
   * — dung thu ADR-004 sinh ra de chan, va la loai ro ri khong ai thay vi
   * trang VAN hien ra binh thuong.
   */
  async listPublicByLocale(
    locale: Locale,
    page: { readonly limit: number; readonly offset: number },
    /**
     * Dieu kien phu tren bang CHA, dang `cot = gia tri`.
     *
     * Nhan CAP KHOA-GIA TRI chu khong nhan chuoi SQL: mot tham so chuoi o day
     * la mot duong tiem SQL di thang qua moi tang xac thuc phia tren.
     *
     * Ten cot duoc kiem KIEU qua tham so `TCol` cua lop: go sai la loi bien
     * dich, khong phai loi luc chay. Ban dau ham nay nhan `Record<string, ...>`
     * va toi dinh dung `column p.post_type does not exist` khi thu no.
     */
    where?: Readonly<Partial<Record<TCol, string | boolean | null>>>,
    /**
     * Gioi han vao mot tap id cua bang CHA — dung cho quan he qua bang lien ket.
     *
     * `/industries/:slug/services` can "dich vu thuoc nganh X", ma quan he do
     * nam o bang `service_industries`. `where` chi dien dat duoc dieu kien tren
     * COT cua bang cha, nen khong the lam viec nay.
     *
     * DINH CHINH chu thich cu cua chinh toi: ban dau toi viet "bo qua bo loc khi
     * mang rong se tra ve MOI dich vu". Do la SAI — `p.id = ANY('{}'::uuid[])`
     * von da khong khop gi ca, nen bo cai `return` som di thi ket qua VAN rong.
     *
     * Nen dong `return` som la DUONG NGAN, khong phai ban va: no tranh mot vong
     * di den database cho mot cau tra loi da biet. Toi phat hien dieu nay khi
     * tiem loi (bo cai `return`) va bai kiem KHONG do — vi khong co gi de do.
     */
    restrictToIds?: readonly string[],
  ): Promise<{ rows: PublicTranslationRow[]; total: number }> {
    if (restrictToIds !== undefined && restrictToIds.length === 0) {
      return { rows: [], total: 0 };
    }
    const dieuKien = Object.entries(where ?? {}) as [string, string | boolean | null][];
    /**
     * `sql.join([])` NEM LOI — nen phai kiem TRUOC khi goi, khong phai sau.
     *
     * Ban dau toi viet:
     *
     *     const loc = sql.join(dieuKien.map(...), sql` `);
     *     const them = dieuKien.length > 0 ? loc : sql``;
     *
     * Toan tu ba ngoi kiem do dai, nhung `sql.join(...)` da chay XONG truoc do —
     * JavaScript tinh ca hai nhanh cua mot bieu thuc gan. Voi mang rong, Kysely
     * tinh `new Array(2 * 0 - 1)` va nem `RangeError: Invalid array length`.
     *
     * Nen duong VO la duong KHONG CO dieu kien phu — tuc la truong hop PHO BIEN
     * NHAT (`/posts`, `/projects` khong loc gi). `tsc` sach hoan toan; chi mot
     * lan goi that moi lo ra.
     */
    const them =
      dieuKien.length === 0
        ? sql``
        : sql.join(
            dieuKien.map(([k, v]) => sql`AND p.${sql.ref(k)} = ${v}`),
            sql` `,
          );

    const gioiHan =
      restrictToIds === undefined
        ? sql``
        : sql`AND p.id = ANY(${sql.val(restrictToIds)}::uuid[])`;

    const r = await sql<{
      id: string; slug: string; title: string;
      published_at: Date | null; total: string;
    }>`
      SELECT p.id, t.slug, ${sql.ref(`t.${this.titleColumn}`)} AS title,
             t.published_at,
             count(*) OVER () AS total
      FROM ${sql.table(`ltv.${this.trTable}`)} t
      JOIN ${sql.table(`ltv.${this.parentTable}`)} p
        ON p.id = t.${sql.ref(this.parentKey)}
      WHERE t.locale = ${locale}
        AND t.status = 'published'
        AND p.status = 'published'
        AND p.deleted_at IS NULL
        ${them}
        ${gioiHan}
      ORDER BY t.published_at DESC NULLS LAST, p.id ASC
      LIMIT ${page.limit} OFFSET ${page.offset}
    `.execute(this.db);

    /**
     * `count(*) OVER ()` — MOT truy van cho ca dong VA tong.
     *
     * Hai cau (rows + count) la khuon cua `Paged` o cho khac, nhung o day dieu
     * kien loc phuc tap hon (join + hai trang thai) nen viet lai no lan thu hai
     * la mot ban sao se lech. Window function cho tong cua tap DA LOC ma khong
     * can cau thu hai.
     *
     * `p.id ASC` o cuoi la moc pha vo the: `published_at` co the trung nhau
     * (nhap hang loat), va khong co moc duy nhat thi thu tu giua cac trang
     * KHONG on dinh — mot ban ghi co the xuat hien o ca trang 1 va trang 2, hoac
     * khong o trang nao.
     *
     * Bai kiem cho dieu nay phai doc SQL SINH RA, khong phai chay thu: tren bang
     * nho PostgreSQL van tra ve thu tu on dinh (theo thu tu quet), nen mot phep
     * do thuc nghiem se XANH du moc bi bo. Toi da dinh dung cai bay do o mot bai
     * kiem on dinh phan trang truoc day; lan nay bo `p.id ASC` va phep do khong
     * he do. Nen `test/content-service.integration.test.ts` khang dinh tren
     * chinh chuoi SQL.
     */
    return {
      rows: r.rows.map((x) => ({
        entityId: x.id,
        slug: x.slug,
        title: x.title,
        publishedAt: x.published_at,
      })),
      total: Number(r.rows[0]?.total ?? 0),
    };
  }

  /**
   * HREFLANG — quy tac quan trong nhat cua lop nay.
   *
   * Chi sinh muc alternate khi CA HAI dieu sau dung:
   *   1. bang CHA dang `published` va chua xoa mem
   *   2. ban dich cua locale do dang `published`
   *
   * Vi sao phai chat nhu vay: `<link hreflang="en" href="...">` la mot LOI HUA
   * voi Google rang dia chi kia ton tai va doc duoc. Neu ban EN moi chi la
   * ban nhap thi dia chi do tra ve 404, va Google khong bao loi — no chi am
   * tham ha do tin cay cua ca cum trang. Day la kieu hong khong ai phat hien
   * duoc bang mat thuong, nen phai chan o tang du lieu.
   *
   * Tra ve mang RONG khi chi co mot ngon ngu duoc xuat ban: mot minh no thi
   * khong co "ban thay the" nao ca, va the hreflang tu tro ve minh la vo nghia.
   */
  async hreflangAlternates(entityId: string): Promise<HreflangAlternate[]> {
    const r = await sql<{ locale: Locale; slug: string }>`
      SELECT t.locale, t.slug
      FROM ${sql.table(`ltv.${this.trTable}`)} t
      JOIN ${sql.table(`ltv.${this.parentTable}`)} p
        ON p.id = t.${sql.ref(this.parentKey)}
      WHERE t.${sql.ref(this.parentKey)} = ${entityId}
        AND t.status = 'published'
        AND p.status = 'published'
        AND p.deleted_at IS NULL
      ORDER BY t.locale
    `.execute(this.db);
    return r.rows.length >= 2 ? r.rows : [];
  }

  /** Cac locale dang thuc su doc duoc cong khai. */
  async publishedLocales(entityId: string): Promise<Locale[]> {
    const r = await sql<{ locale: Locale }>`
      SELECT t.locale
      FROM ${sql.table(`ltv.${this.trTable}`)} t
      JOIN ${sql.table(`ltv.${this.parentTable}`)} p
        ON p.id = t.${sql.ref(this.parentKey)}
      WHERE t.${sql.ref(this.parentKey)} = ${entityId}
        AND t.status = 'published' AND p.status = 'published' AND p.deleted_at IS NULL
      ORDER BY t.locale
    `.execute(this.db);
    return r.rows.map((x) => x.locale);
  }

  // ── ghi ────────────────────────────────────────────────────────

  /**
   * Xuat ban MOT ban dich.
   *
   * `first_published_at` cua tung ban dich la RIENG. Ban tieng Viet len song
   * thang 3, ban tieng Anh thang 9 — hai moc khac nhau, va quy tac tai dung
   * slug (ADR-002) ap cho tung cai mot. Gop chung lai thi slug tieng Anh
   * chua tung cong khai se bi khoa oan.
   */
  async publishTranslation(entityId: string, locale: Locale, at: Date): Promise<void> {
    const r = await sql<{ id: string }>`
      UPDATE ${sql.table(`ltv.${this.trTable}`)}
      SET status = 'published', published_at = ${at},
          first_published_at = COALESCE(first_published_at, ${at})
      WHERE ${sql.ref(this.parentKey)} = ${entityId} AND locale = ${locale}
      RETURNING id
    `.execute(this.db);
    if (r.rows.length === 0) throw new TranslationMissingError(entityId, locale);
  }

  async unpublishTranslation(entityId: string, locale: Locale): Promise<void> {
    await sql`
      UPDATE ${sql.table(`ltv.${this.trTable}`)}
      SET status = 'hidden'
      WHERE ${sql.ref(this.parentKey)} = ${entityId} AND locale = ${locale}
    `.execute(this.db);
  }

  async deleteTranslation(entityId: string, locale: Locale): Promise<void> {
    await sql`
      DELETE FROM ${sql.table(`ltv.${this.trTable}`)}
      WHERE ${sql.ref(this.parentKey)} = ${entityId} AND locale = ${locale}
    `.execute(this.db);
  }

  // ── slug theo locale (ADR-002) ─────────────────────────────────
  isLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<boolean> {
    return this.slugs.isSlugAvailable(slug, locale, exceptId);
  }
  assertLocaleSlugAvailable(locale: Locale, slug: string, exceptId?: string): Promise<void> {
    return this.slugs.assertSlugAvailable(slug, locale, exceptId);
  }

  /**
   * Ban dich nay da tung cong khai chua — quyet dinh duoc tai dung slug hay khong.
   * Nhan id cua HANG DICH, khong phai id thuc the.
   */
  translationWasEverPublished(translationId: string): Promise<boolean> {
    return this.slugs.wasEverPublished(translationId);
  }
}
