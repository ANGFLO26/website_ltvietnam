import { sql, type RawBuilder } from 'kysely';
import type { KyselyExecutor } from '../connection.js';
import {
  assertDirection,
  assertSortable,
  normalizePage,
  offsetOf,
  toPaged,
  type Page,
  type Paged,
} from '../helpers.js';
import type { ProductQuery } from './dao.interface.js';
import type {
  ComplianceType,
  MediaRole,
  ProductCard,
  ProductDetail,
  ProductFilter,
  ProductSort,
  RelationType,
  DetailCategory,
  DetailMedia,
  DetailRelated,
  DetailSpec,
  DetailStandard,
  DetailTaxon,
} from './object.js';
import { toProduct } from './mapper.js';

/**
 * DUONG DOC PHUC TAP cua san pham.
 *
 * Ba dieu file nay phai lam dung, theo thu tu quan trong:
 *
 *  1. MO RONG NHANH CON (ADR-015). San pham gan vao hang CON (HERZOG), nguoi
 *     dung loc theo hang ME (PAC). Khong mo rong nhanh thi ket qua la 0 —
 *     day dung la loi cua so do v1.2.1.
 *
 *  2. NGU NGHIA OR/AND (ADR-007). Cung mot chieu la OR, giua cac chieu la AND.
 *     `?brand=pac&brand=herzog&standard=astm-d86`
 *       -> (thuoc nhanh PAC HOAC nhanh Herzog) VA co tieu chuan ASTM D86.
 *
 *  3. KHONG N+1. Hai cau SQL cho mot trang danh sach, du tra ve 1 hay 100 dong.
 *     Dieu kien chap nhan cua P5 la do duoc, va co test dem that.
 *
 * Moi gia tri deu di qua THAM SO, khong ghep chuoi vao SQL.
 */
export class ProductQueryRunner implements ProductQuery {
  constructor(private readonly db: KyselyExecutor) {}

  async filter(
    filter: ProductFilter,
    sort?: { by?: ProductSort; direction?: 'asc' | 'desc' },
    page?: Partial<Page>,
  ): Promise<Paged<ProductCard>> {
    const p = normalizePage(page);
    const where = buildWhere(filter);

    // Mot doan `where` DUY NHAT dung cho ca hai cau. Day la ly do doan nay
    // duoc viet bang `sql` template chu khong bang query builder: hai cau co
    // hinh dang tra ve khac nhau (dong vs dem), nhung dieu kien thi phai
    // giong het. Viet hai lan la cach chac chan nhat de chung lech nhau.
    const orderBy = buildOrderBy(sort);

    const rows = await sql<CardRow>`
      SELECT
        p.id, p.name, p.slug, p.model, p.short_description, p.is_featured,
        p.discontinued_at, p.brand_id,
        b.name AS brand_name, b.slug AS brand_slug,
        p.featured_image_id, m.storage_path AS image_path, m.alt_text AS image_alt
      FROM ltv.products p
      JOIN ltv.brands b ON b.id = p.brand_id
      LEFT JOIN ltv.media m ON m.id = p.featured_image_id AND m.deleted_at IS NULL
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${p.pageSize} OFFSET ${offsetOf(p)}
    `.execute(this.db);

    const counted = await sql<{ n: string }>`
      SELECT count(*) AS n FROM ltv.products p WHERE ${where}
    `.execute(this.db);

    return toPaged(rows.rows.map(toCard), Number(counted.rows[0]?.n ?? 0), p);
  }

  async findCardsByIds(ids: readonly string[]): Promise<ProductCard[]> {
    if (ids.length === 0) return [];
    const r = await sql<CardRow>`
      SELECT
        p.id, p.name, p.slug, p.model, p.short_description, p.is_featured,
        p.discontinued_at, p.brand_id,
        b.name AS brand_name, b.slug AS brand_slug,
        p.featured_image_id, m.storage_path AS image_path, m.alt_text AS image_alt
      FROM ltv.products p
      JOIN ltv.brands b ON b.id = p.brand_id
      LEFT JOIN ltv.media m ON m.id = p.featured_image_id AND m.deleted_at IS NULL
      WHERE p.id = ANY(${[...ids]}::uuid[]) AND p.deleted_at IS NULL
    `.execute(this.db);
    return r.rows.map(toCard);
  }

  async findFeaturedCards(limit: number): Promise<ProductCard[]> {
    const r = await this.filter(
      { isFeatured: true },
      { by: 'display_order', direction: 'asc' },
      { page: 1, pageSize: limit },
    );
    return r.data;
  }

  /**
   * TRANG CHI TIET.
   *
   * Tam cau SQL: san pham (kem hang), roi bay cau cho bay nhom quan he.
   * So nay CO DINH — khong phu thuoc san pham co 3 hay 30 tieu chuan. Do la
   * dieu "khong N+1" thuc su noi den.
   *
   * Da can nhac gom ca tam thanh mot cau bang `json_agg` + LATERAL. Nhanh hon
   * mot chut, nhung phan anh xa tro thanh boc tach JSON long nhau va moi lan
   * doi truong la mot co hoi sai am tham. Tam vong tuan tu tren ket noi cuc bo
   * la vai phan nghin giay; doi lay ma doc duoc thi day la doi tot.
   *
   * Chay TUAN TU chu khong `Promise.all`: khi DAO nay lay tu `tx` thi ca tam
   * cau dung CHUNG mot ket noi, va gui song song tren mot ket noi la loi.
   */
  async findDetailBySlug(slug: string): Promise<ProductDetail | null> {
    // San pham lay bang query builder — de `toProduct` nhan dung kieu hang ma
    // khong phai ep kieu. Hang co 30 cot, ep kieu o day la cho de nhat de mot
    // cot moi bi bo quen ma khong ai biet.
    const row = await this.db
      .selectFrom('products').selectAll()
      .where('slug', '=', slug).where('deleted_at', 'is', null)
      .executeTakeFirst();
    if (!row) return null;
    const id = row.id;

    const brandRow = await sql<{ id: string; name: string; slug: string }>`
      SELECT id, name, slug FROM ltv.brands WHERE id = ${row.brand_id}
    `.execute(this.db);
    const brand = brandRow.rows[0];
    // Khoa ngoai NOT NULL + RESTRICT nen thieu hang la so do da hong.
    if (!brand) throw new Error(`San pham ${id} tro toi hang khong ton tai`);

    const cats = await sql<DetailCategory & { is_primary: boolean }>`
      SELECT c.id, c.name, c.slug, l.is_primary
      FROM ltv.product_category_links l
      JOIN ltv.product_categories c ON c.id = l.category_id
      WHERE l.product_id = ${id} AND c.deleted_at IS NULL
      ORDER BY l.is_primary DESC, c.display_order, c.name
    `.execute(this.db);

    const stds = await sql<{
      id: string; organization: string; code: string; name: string | null; slug: string;
      compliance_type: string; note: string | null;
    }>`
      SELECT s.id, s.organization, s.code, s.name, s.slug, ps.compliance_type, ps.note
      FROM ltv.product_standards ps
      JOIN ltv.standards s ON s.id = ps.standard_id
      WHERE ps.product_id = ${id} AND s.deleted_at IS NULL
      ORDER BY ps.display_order, s.organization, s.code
    `.execute(this.db);

    const apps = await sql<DetailTaxon>`
      SELECT a.id, a.name, a.slug
      FROM ltv.product_applications pa
      JOIN ltv.applications a ON a.id = pa.application_id
      WHERE pa.product_id = ${id} AND a.deleted_at IS NULL
      ORDER BY pa.is_primary DESC, a.display_order, a.name
    `.execute(this.db);

    const inds = await sql<DetailTaxon>`
      SELECT i.id, i.name, i.slug
      FROM ltv.product_industries pi
      JOIN ltv.industries i ON i.id = pi.industry_id
      WHERE pi.product_id = ${id} AND i.deleted_at IS NULL
      ORDER BY i.display_order, i.name
    `.execute(this.db);

    const media = await sql<{
      id: string; storage_path: string; public_url: string | null; alt_text: string | null;
      caption: string | null; width: number | null; height: number | null; media_role: string;
    }>`
      SELECT m.id, m.storage_path, m.public_url, m.alt_text, m.caption,
             m.width, m.height, pm.media_role
      FROM ltv.product_media pm
      JOIN ltv.media m ON m.id = pm.media_id
      WHERE pm.product_id = ${id} AND m.deleted_at IS NULL
      ORDER BY pm.display_order
    `.execute(this.db);

    const specs = await sql<DetailSpec>`
      SELECT id, group_key AS "groupKey", label, value, unit
      FROM ltv.product_specifications
      WHERE product_id = ${id}
      ORDER BY display_order, label
    `.execute(this.db);

    // San pham lien quan: MOT cau kem san the day du, khong lay id roi vong lai.
    const rel = await sql<CardRow & { relation_type: string }>`
      SELECT
        rp.relation_type,
        p.id, p.name, p.slug, p.model, p.short_description, p.is_featured,
        p.discontinued_at, p.brand_id,
        b.name AS brand_name, b.slug AS brand_slug,
        p.featured_image_id, m.storage_path AS image_path, m.alt_text AS image_alt
      FROM ltv.related_products rp
      JOIN ltv.products p ON p.id = rp.related_product_id
      JOIN ltv.brands  b ON b.id = p.brand_id
      LEFT JOIN ltv.media m ON m.id = p.featured_image_id AND m.deleted_at IS NULL
      WHERE rp.product_id = ${id}
        AND p.deleted_at IS NULL AND p.status = 'published'
      ORDER BY rp.display_order
    `.execute(this.db);

    return {
      product: toProduct(row),
      brand,
      categories: cats.rows.map(
        (c): DetailCategory => ({ id: c.id, name: c.name, slug: c.slug, isPrimary: c.is_primary }),
      ),
      standards: stds.rows.map(
        (s): DetailStandard => ({
          id: s.id, organization: s.organization, code: s.code, name: s.name, slug: s.slug,
          complianceType: s.compliance_type as ComplianceType, note: s.note,
        }),
      ),
      applications: apps.rows,
      industries: inds.rows,
      media: media.rows.map(
        (m): DetailMedia => ({
          id: m.id, storagePath: m.storage_path, publicUrl: m.public_url,
          altText: m.alt_text, caption: m.caption, width: m.width, height: m.height,
          mediaRole: m.media_role as MediaRole,
        }),
      ),
      specifications: specs.rows,
      related: rel.rows.map(
        (r): DetailRelated => ({ relationType: r.relation_type as RelationType, card: toCard(r) }),
      ),
    };
  }
}

// ══════════════════════ dung dieu kien loc ══════════════════════

/**
 * Ghep dieu kien WHERE tu bo loc.
 *
 * Moi chieu dong gop DUNG MOT menh de, va cac menh de noi voi nhau bang AND.
 * Ben trong mot chieu, nhieu gia tri noi bang OR — the hien bang `= ANY(...)`
 * chu khong phai lap `OR` bang tay.
 */
function buildWhere(f: ProductFilter): RawBuilder<unknown> {
  const parts: RawBuilder<unknown>[] = [];

  if (!f.includeDeleted) parts.push(sql`p.deleted_at IS NULL`);

  // MAC DINH CHI LAY DA XUAT BAN. Day la mac dinh an toan: quen truyen
  // `status` o duong cong khai thi ket qua van khong lo ban nhap.
  parts.push(f.status ? sql`p.status = ${f.status}` : sql`p.status = 'published'`);

  if (f.excludeDiscontinued) parts.push(sql`p.discontinued_at IS NULL`);
  if (f.isFeatured !== undefined) parts.push(sql`p.is_featured = ${f.isFeatured}`);

  // ── hang: CAY, loc thang tren cot cua san pham ──
  const brands = clean(f.brandSlugs);
  if (brands) {
    parts.push(sql`p.brand_id IN (${subtreeIdsBySlug('brands', brands)})`);
  }

  // ── danh muc: CAY + nhieu-nhieu ──
  const cats = clean(f.categorySlugs);
  if (cats) {
    parts.push(sql`EXISTS (
      SELECT 1 FROM ltv.product_category_links l
      WHERE l.product_id = p.id
        AND l.category_id IN (${subtreeIdsBySlug('product_categories', cats)})
    )`);
  }

  // ── ung dung: CAY + nhieu-nhieu ──
  const apps = clean(f.applicationSlugs);
  if (apps) {
    parts.push(sql`EXISTS (
      SELECT 1 FROM ltv.product_applications pa
      WHERE pa.product_id = p.id
        AND pa.application_id IN (${subtreeIdsBySlug('applications', apps)})
    )`);
  }

  // ── nganh hang: PHANG ──
  const inds = clean(f.industrySlugs);
  if (inds) {
    parts.push(sql`EXISTS (
      SELECT 1 FROM ltv.product_industries pi
      JOIN ltv.industries i ON i.id = pi.industry_id
      WHERE pi.product_id = p.id AND i.slug = ANY(${inds}) AND i.deleted_at IS NULL
    )`);
  }

  // ── tieu chuan: PHANG ──
  const stds = clean(f.standardSlugs);
  if (stds) {
    parts.push(sql`EXISTS (
      SELECT 1 FROM ltv.product_standards ps
      JOIN ltv.standards s ON s.id = ps.standard_id
      WHERE ps.product_id = p.id AND s.slug = ANY(${stds}) AND s.deleted_at IS NULL
    )`);
  }

  const types = clean(f.productTypes as readonly string[] | undefined);
  if (types) parts.push(sql`p.product_type = ANY(${types})`);

  if (f.search && f.search.trim() !== '') {
    // `%` va `_` cua nguoi dung la ky tu thuong. ILIKE dung duoc chi muc
    // trigram `idx_products_*_trgm` nen khong phai quet toan bang.
    const needle = `%${escapeLike(f.search.trim())}%`;
    parts.push(sql`(
      p.name ILIKE ${needle} OR p.model ILIKE ${needle} OR p.short_description ILIKE ${needle}
    )`);
  }

  return sql.join(parts, sql` AND `);
}

/**
 * Nut co slug trong danh sach, CONG toan bo nhanh con cua chung (ADR-015).
 *
 * Thieu nua duoi cua truy van nay thi loc theo hang me PAC tra ve 0 san pham,
 * vi san pham gan vao HERZOG chu khong gan vao PAC.
 *
 * `table` KHONG den tu nguoi dung — no la hang so trong ma nguon, nen
 * `sql.table` o day khong phai duong tiem SQL.
 */
function subtreeIdsBySlug(
  table: 'brands' | 'product_categories' | 'applications',
  slugs: string[],
): RawBuilder<unknown> {
  const t = sql.table(`ltv.${table}`);
  return sql`
    SELECT n.id FROM ${t} n
    WHERE n.deleted_at IS NULL
      AND (
        n.slug = ANY(${slugs})
        OR n.ancestor_ids && ARRAY(
             SELECT r.id FROM ${t} r WHERE r.slug = ANY(${slugs}) AND r.deleted_at IS NULL
           )
      )
  `;
}

/**
 * Sap xep — CHI nhan cot trong danh sach trang (A14).
 * Ten cot khong bao gio den tu chuoi nguoi dung gui.
 */
function buildOrderBy(sort?: { by?: ProductSort; direction?: 'asc' | 'desc' }): RawBuilder<unknown> {
  const by = assertSortable<ProductSort>(
    sort?.by,
    ['name', 'published_at', 'display_order', 'created_at'],
    'display_order',
  );
  const dir = assertDirection(sort?.direction);
  const col = {
    name: sql`p.name`,
    published_at: sql`p.published_at`,
    display_order: sql`p.display_order`,
    created_at: sql`p.created_at`,
  }[by];
  const direction = dir === 'desc' ? sql`DESC` : sql`ASC`;
  // `p.id` cuoi cung de thu tu ON DINH giua cac trang: hai dong cung
  // `display_order` ma khong co khoa phu thi PostgreSQL duoc phep tra ve
  // thu tu khac nhau moi lan, va nguoi dung se thay mot san pham hai lan
  // o trang 1 va trang 2.
  return sql`${col} ${direction} NULLS LAST, p.id ASC`;
}

function clean<T extends string>(v: readonly T[] | undefined): T[] | null {
  if (!v || v.length === 0) return null;
  const out = [...new Set(v.filter((x) => typeof x === 'string' && x !== ''))];
  return out.length > 0 ? out : null;
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// ══════════════════════ anh xa ══════════════════════

interface CardRow {
  id: string;
  name: string;
  slug: string;
  model: string | null;
  short_description: string | null;
  is_featured: boolean;
  discontinued_at: Date | null;
  brand_id: string;
  brand_name: string;
  brand_slug: string;
  featured_image_id: string | null;
  image_path: string | null;
  image_alt: string | null;
}

function toCard(r: CardRow): ProductCard {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    model: r.model,
    shortDescription: r.short_description,
    brandId: r.brand_id,
    brandName: r.brand_name,
    brandSlug: r.brand_slug,
    featuredImageId: r.featured_image_id,
    featuredImagePath: r.image_path,
    featuredImageAlt: r.image_alt,
    isFeatured: r.is_featured,
    discontinuedAt: r.discontinued_at,
  };
}
