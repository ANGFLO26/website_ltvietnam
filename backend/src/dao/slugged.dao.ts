import { sql } from 'kysely';
import type { KyselyExecutor } from './connection.js';

/**
 * HO TRO SLUG cho cac bang co `slug` va `first_published_at` (ADR-002).
 *
 * Vi sao la lop KET HOP chu khong phai lop cha:
 * TypeScript chi cho ke thua MOT lop cha. Bang `brands` vua la cay vua co slug.
 * Cai chinh — cau truc cay — lam lop cha (`TreeDao`); cai phu — slug — lam
 * thanh phan ket hop. Nho vay moi DAO deu co dung mot chuoi ke thua, khong
 * phai dung mixin kho doc.
 *
 * Bang co slug nhung KHONG phai cay (standards, industries, products,
 * documents) ke thua `BaseDao` va cung ket hop lop nay.
 *
 * Muoi hai bang: bay tren chinh entity (brands, product_categories, standards,
 * applications, industries, products, documents, post_categories) va bon tren
 * bang translation (page/service/project/post).
 *
 * Vi sao dang lam lop cha: quy tac slug KHONG chi la mot rang buoc UNIQUE.
 *   - slug DA TUNG publish thi khong duoc tai dung, ke ca khi da xoa mem
 *   - `first_published_at` set DUNG MOT LAN, khong ghi de khi republish
 *   - chi hard-delete duoc khi `first_published_at IS NULL`
 * Viet lai muoi hai lan la muoi hai co hoi sai.
 */
export type SluggedTableName =
  | 'brands' | 'product_categories' | 'standards' | 'applications' | 'industries'
  | 'products' | 'documents' | 'post_categories'
  | 'page_translations' | 'service_translations' | 'project_translations' | 'post_translations';

export class SlugTakenError extends Error {
  constructor(readonly slug: string, readonly reason: 'in_use' | 'was_published') {
    super(
      reason === 'in_use'
        ? `Slug dang duoc dung: ${slug}`
        : `Slug da tung duoc xuat ban, khong duoc tai dung: ${slug}`,
    );
    this.name = 'SlugTakenError';
  }
}

export class SlugSupport {
  constructor(
    private readonly db: KyselyExecutor,
    private readonly table: SluggedTableName,
    /** Bang translation phan biet slug theo locale; bang entity thi khong. */
    private readonly slugScopedByLocale = false,
  ) {}

  /**
   * Slug con trong khong.
   *
   * Kiem ca ban ghi DA XOA MEM: ADR-002 muc 3 giu slug cua noi dung xoa mem,
   * khong giai phong namespace.
   */
  async isSlugAvailable(slug: string, locale?: string, exceptId?: string): Promise<boolean> {
    const localeCond = this.slugScopedByLocale && locale
      ? sql` AND locale = ${locale}`
      : sql``;
    const exceptCond = exceptId ? sql` AND id <> ${exceptId}` : sql``;
    const r = await sql<{ n: string }>`
      SELECT count(*) AS n FROM ${sql.table(this.table)}
      WHERE slug = ${slug}${localeCond}${exceptCond}
    `.execute(this.db);
    return Number(r.rows[0]?.n ?? 0) === 0;
  }

  /** Nem loi neu slug khong dung duoc — de service khong phai tu kiem. */
  async assertSlugAvailable(slug: string, locale?: string, exceptId?: string): Promise<void> {
    if (!(await this.isSlugAvailable(slug, locale, exceptId))) {
      throw new SlugTakenError(slug, 'in_use');
    }
  }

  /**
   * Danh dau lan dau cong khai. Set DUNG MOT LAN.
   * Republish khong ghi de — day la co so cua quy tac hard-delete (ADR-002 muc 9).
   */
  async markFirstPublished(id: string, at: Date): Promise<void> {
    await sql`
      UPDATE ${sql.table(this.table)}
      SET first_published_at = ${at}
      WHERE id = ${id} AND first_published_at IS NULL
    `.execute(this.db);
  }

  /** Da tung cong khai chua — quyet dinh duoc hard-delete hay chi soft-delete. */
  async wasEverPublished(id: string): Promise<boolean> {
    const r = await sql<{ v: Date | null }>`
      SELECT first_published_at AS v FROM ${sql.table(this.table)} WHERE id = ${id}
    `.execute(this.db);
    return r.rows[0]?.v != null;
  }

  /**
   * Chi cho phep xoa vinh vien khi CHUA TUNG cong khai (ADR-002 muc 9).
   * Tra ve `false` neu da tung publish — nguoi goi phai dung soft-delete.
   */
  async canHardDelete(id: string): Promise<boolean> {
    return !(await this.wasEverPublished(id));
  }
}
