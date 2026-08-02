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

export class TranslationSupport {
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
