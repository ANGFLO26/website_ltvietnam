import { sql, type RawBuilder } from 'kysely';
import type { AdminContentKind, AdminTaxonomyKind, Locale } from '@ltv/contracts';
import type { EntityStatus } from './brands/object.js';
import type { KyselyExecutor } from './connection.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from './helpers.js';

type TranslationStatus = 'draft' | 'published' | 'hidden';

export interface AdminTranslationSummaryRow {
  readonly locale: Locale;
  readonly title: string;
  readonly slug: string;
  readonly status: TranslationStatus;
  readonly publishedAt: Date | null;
}

export interface AdminContentListRow {
  readonly id: string;
  readonly kind: AdminContentKind;
  readonly status: EntityStatus;
  readonly translations: readonly AdminTranslationSummaryRow[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export interface AdminContentListFilter<TCol extends string = never> {
  readonly status?: EntityStatus | undefined;
  readonly translationStatus?: TranslationStatus | undefined;
  readonly locale?: Locale | undefined;
  readonly search?: string | undefined;
  readonly includeDeleted?: boolean | undefined;
  readonly where?: Readonly<Partial<Record<TCol, string | boolean | null | undefined>>> | undefined;
}

export interface AdminContentReadSpec<TCol extends string = never> {
  readonly kind: AdminContentKind;
  readonly parentTable: 'services' | 'projects' | 'posts' | 'pages';
  readonly translationTable:
    'service_translations' | 'project_translations' | 'post_translations' | 'page_translations';
  readonly parentKey: 'service_id' | 'project_id' | 'post_id' | 'page_id';
  readonly titleColumn: 'name' | 'title';
  readonly allowedParentFilters: readonly TCol[];
}

/** Mot read-model cho ca bon nhom co ban dich, gom title/status VI va EN trong mot truy van. */
export async function listAdminContent<TCol extends string>(
  db: KyselyExecutor,
  spec: AdminContentReadSpec<TCol>,
  filter: AdminContentListFilter<TCol>,
  page?: Partial<Page>,
): Promise<Paged<AdminContentListRow>> {
  const p = normalizePage(page);
  const conditions: RawBuilder<unknown>[] = [];

  if (!filter.includeDeleted) conditions.push(sql`AND p.deleted_at IS NULL`);
  if (filter.status !== undefined) conditions.push(sql`AND p.status = ${filter.status}`);

  for (const [column, value] of Object.entries(filter.where ?? {})) {
    if (!spec.allowedParentFilters.includes(column as TCol) || value === undefined) continue;
    conditions.push(
      value === null
        ? sql`AND p.${sql.ref(column)} IS NULL`
        : sql`AND p.${sql.ref(column)} = ${value}`,
    );
  }

  const translationConditions: RawBuilder<unknown>[] = [];
  if (filter.locale !== undefined) {
    translationConditions.push(sql`AND tf.locale = ${filter.locale}`);
  }
  if (filter.translationStatus !== undefined) {
    translationConditions.push(sql`AND tf.status = ${filter.translationStatus}`);
  }
  if (filter.search !== undefined) {
    const pattern = `%${filter.search}%`;
    translationConditions.push(
      sql`AND (tf.slug ILIKE ${pattern} OR tf.${sql.ref(spec.titleColumn)} ILIKE ${pattern})`,
    );
  }
  if (translationConditions.length > 0) {
    conditions.push(sql`
      AND EXISTS (
        SELECT 1
        FROM ${sql.table(`ltv.${spec.translationTable}`)} tf
        WHERE tf.${sql.ref(spec.parentKey)} = p.id
        ${joinSql(translationConditions)}
      )
    `);
  }

  const result = await sql<{
    id: string;
    status: EntityStatus;
    translations: unknown;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    total: string;
  }>`
    SELECT p.id, p.status, p.created_at, p.updated_at, p.deleted_at,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'locale', t.locale,
            'title', t.${sql.ref(spec.titleColumn)},
            'slug', t.slug,
            'status', t.status,
            'published_at', t.published_at
          ) ORDER BY t.locale
        ) FILTER (WHERE t.locale IS NOT NULL),
        '[]'::jsonb
      ) AS translations,
      count(*) OVER () AS total
    FROM ${sql.table(`ltv.${spec.parentTable}`)} p
    LEFT JOIN ${sql.table(`ltv.${spec.translationTable}`)} t
      ON t.${sql.ref(spec.parentKey)} = p.id
    WHERE TRUE
      ${joinSql(conditions)}
    GROUP BY p.id, p.status, p.created_at, p.updated_at, p.deleted_at
    ORDER BY p.updated_at DESC, p.id ASC
    LIMIT ${p.pageSize} OFFSET ${offsetOf(p)}
  `.execute(db);

  const rows = result.rows.map((row): AdminContentListRow => ({
    id: row.id,
    kind: spec.kind,
    status: row.status,
    translations: parseTranslations(row.translations),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }));
  return toPaged(rows, Number(result.rows[0]?.total ?? 0), p);
}

export interface AdminProductListRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly model: string | null;
  readonly internalCode: string | null;
  readonly sku: string | null;
  readonly status: EntityStatus;
  readonly brandId: string;
  readonly brandName: string;
  readonly brandSlug: string;
  readonly primaryCategoryId: string | null;
  readonly primaryCategoryName: string | null;
  readonly primaryCategorySlug: string | null;
  readonly thumbnailId: string | null;
  readonly thumbnailUrl: string | null;
  readonly thumbnailAlt: string | null;
  readonly isFeatured: boolean;
  readonly discontinuedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

export interface AdminProductListFilter {
  readonly status?: EntityStatus | undefined;
  readonly brandId?: string | undefined;
  readonly categoryId?: string | undefined;
  readonly search?: string | undefined;
  readonly includeDeleted?: boolean | undefined;
}

/** Danh sach san pham admin: brand, danh muc chinh va thumbnail trong mot truy van. */
export async function listAdminProducts(
  db: KyselyExecutor,
  filter: AdminProductListFilter,
  page?: Partial<Page>,
): Promise<Paged<AdminProductListRow>> {
  const p = normalizePage(page);
  const conditions: RawBuilder<unknown>[] = [];
  if (!filter.includeDeleted) conditions.push(sql`AND p.deleted_at IS NULL`);
  if (filter.status !== undefined) conditions.push(sql`AND p.status = ${filter.status}`);
  if (filter.brandId !== undefined) conditions.push(sql`AND p.brand_id = ${filter.brandId}`);
  if (filter.categoryId !== undefined) {
    conditions.push(sql`AND EXISTS (
      SELECT 1 FROM ltv.product_category_links filter_category
      WHERE filter_category.product_id = p.id
        AND filter_category.category_id = ${filter.categoryId}
    )`);
  }
  if (filter.search !== undefined) {
    const pattern = `%${filter.search}%`;
    conditions.push(sql`
      AND (p.name ILIKE ${pattern} OR p.slug ILIKE ${pattern} OR p.model ILIKE ${pattern}
        OR p.internal_code ILIKE ${pattern} OR p.sku ILIKE ${pattern})
    `);
  }

  const result = await sql<{
    id: string;
    name: string;
    slug: string;
    model: string | null;
    internal_code: string | null;
    sku: string | null;
    status: EntityStatus;
    brand_id: string;
    brand_name: string;
    brand_slug: string;
    category_id: string | null;
    category_name: string | null;
    category_slug: string | null;
    thumbnail_id: string | null;
    thumbnail_url: string | null;
    thumbnail_alt: string | null;
    is_featured: boolean;
    discontinued_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    total: string;
  }>`
    SELECT p.id, p.name, p.slug, p.model, p.internal_code, p.sku, p.status,
      b.id AS brand_id, b.name AS brand_name, b.slug AS brand_slug,
      pc.id AS category_id, pc.name AS category_name, pc.slug AS category_slug,
      p.featured_image_id AS thumbnail_id, m.public_url AS thumbnail_url,
      m.alt_text AS thumbnail_alt, p.is_featured, p.discontinued_at,
      p.created_at, p.updated_at, p.deleted_at,
      count(*) OVER () AS total
    FROM ltv.products p
    JOIN ltv.brands b ON b.id = p.brand_id
    LEFT JOIN LATERAL (
      SELECT c.id, c.name, c.slug
      FROM ltv.product_category_links pcl
      JOIN ltv.product_categories c ON c.id = pcl.category_id
      WHERE pcl.product_id = p.id AND pcl.is_primary = TRUE
      LIMIT 1
    ) pc ON TRUE
    LEFT JOIN ltv.media m ON m.id = p.featured_image_id AND m.deleted_at IS NULL
    WHERE TRUE
      ${joinSql(conditions)}
    ORDER BY p.display_order ASC, p.name ASC, p.id ASC
    LIMIT ${p.pageSize} OFFSET ${offsetOf(p)}
  `.execute(db);

  return toPaged(
    result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      model: row.model,
      internalCode: row.internal_code,
      sku: row.sku,
      status: row.status,
      brandId: row.brand_id,
      brandName: row.brand_name,
      brandSlug: row.brand_slug,
      primaryCategoryId: row.category_id,
      primaryCategoryName: row.category_name,
      primaryCategorySlug: row.category_slug,
      thumbnailId: row.thumbnail_id,
      thumbnailUrl: row.thumbnail_url,
      thumbnailAlt: row.thumbnail_alt,
      isFeatured: row.is_featured,
      discontinuedAt: row.discontinued_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    })),
    Number(result.rows[0]?.total ?? 0),
    p,
  );
}

type TaxonomyTableName =
  'brands' | 'product_categories' | 'standards' | 'applications' | 'industries';
type RelatedProductTableName =
  | 'products'
  | 'product_category_links'
  | 'product_standards'
  | 'product_applications'
  | 'product_industries';

export interface AdminTaxonomyReadSpec {
  readonly kind: AdminTaxonomyKind;
  readonly table: TaxonomyTableName;
  readonly tree: boolean;
  readonly standardLabel?: boolean;
  readonly thumbnailColumns: readonly string[];
  readonly relatedTable: RelatedProductTableName;
  readonly relatedForeignKey: string;
}

export interface AdminTaxonomyListFilter {
  readonly status?: EntityStatus | undefined;
  readonly isFeatured?: boolean | undefined;
  readonly parentId?: string | null | undefined;
  readonly organization?: string | undefined;
  readonly search?: string | undefined;
  readonly includeDeleted?: boolean | undefined;
}

export interface AdminTaxonomyListRow {
  readonly id: string;
  readonly kind: AdminTaxonomyKind;
  readonly label: string;
  readonly slug: string;
  readonly status: EntityStatus;
  readonly parentId: string | null;
  readonly parentLabel: string | null;
  readonly parentSlug: string | null;
  readonly thumbnailId: string | null;
  readonly thumbnailUrl: string | null;
  readonly isFeatured: boolean;
  readonly relatedProductCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
}

/** Khuon read-model chung cho nam taxonomy, gom parent/thumbnail/count ma khong N+1. */
export async function listAdminTaxonomy(
  db: KyselyExecutor,
  spec: AdminTaxonomyReadSpec,
  filter: AdminTaxonomyListFilter,
  page?: Partial<Page>,
): Promise<Paged<AdminTaxonomyListRow>> {
  const p = normalizePage(page);
  const conditions: RawBuilder<unknown>[] = [];
  if (!filter.includeDeleted) conditions.push(sql`AND e.deleted_at IS NULL`);
  if (filter.status !== undefined) conditions.push(sql`AND e.status = ${filter.status}`);
  if (filter.isFeatured !== undefined) {
    conditions.push(sql`AND e.is_featured = ${filter.isFeatured}`);
  }
  if (spec.tree && filter.parentId !== undefined) {
    conditions.push(
      filter.parentId === null
        ? sql`AND e.parent_id IS NULL`
        : sql`AND e.parent_id = ${filter.parentId}`,
    );
  }
  if (spec.standardLabel && filter.organization !== undefined) {
    conditions.push(sql`AND e.organization = ${filter.organization}`);
  }
  if (filter.search !== undefined) {
    const pattern = `%${filter.search}%`;
    conditions.push(
      spec.standardLabel
        ? sql`AND (e.slug ILIKE ${pattern} OR e.organization ILIKE ${pattern}
            OR e.code ILIKE ${pattern} OR e.name ILIKE ${pattern})`
        : sql`AND (e.slug ILIKE ${pattern} OR e.name ILIKE ${pattern})`,
    );
  }

  const label = spec.standardLabel
    ? sql<string>`concat_ws(' ', e.organization, e.code, NULLIF(e.name, ''))`
    : sql<string>`e.name`;
  const parentId = spec.tree ? sql<string | null>`e.parent_id` : sql<string | null>`NULL::uuid`;
  const parentLabel = spec.tree
    ? sql<string | null>`(
        SELECT parent.name FROM ${sql.table(`ltv.${spec.table}`)} parent
        WHERE parent.id = e.parent_id
      )`
    : sql<string | null>`NULL::text`;
  const parentSlug = spec.tree
    ? sql<string | null>`(
        SELECT parent.slug FROM ${sql.table(`ltv.${spec.table}`)} parent
        WHERE parent.id = e.parent_id
      )`
    : sql<string | null>`NULL::text`;
  const thumbnailId = thumbnailExpression(spec.thumbnailColumns);

  const result = await sql<{
    id: string;
    label: string;
    slug: string;
    status: EntityStatus;
    parent_id: string | null;
    parent_label: string | null;
    parent_slug: string | null;
    thumbnail_id: string | null;
    thumbnail_url: string | null;
    is_featured: boolean;
    related_product_count: number | string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    total: string;
  }>`
    SELECT e.id, ${label} AS label, e.slug, e.status,
      ${parentId} AS parent_id, ${parentLabel} AS parent_label, ${parentSlug} AS parent_slug,
      ${thumbnailId} AS thumbnail_id,
      (SELECT m.public_url FROM ltv.media m
        WHERE m.id = ${thumbnailId} AND m.deleted_at IS NULL) AS thumbnail_url,
      e.is_featured,
      (SELECT count(*)::int FROM ${sql.table(`ltv.${spec.relatedTable}`)} rel
        WHERE rel.${sql.ref(spec.relatedForeignKey)} = e.id) AS related_product_count,
      e.created_at, e.updated_at, e.deleted_at,
      count(*) OVER () AS total
    FROM ${sql.table(`ltv.${spec.table}`)} e
    WHERE TRUE
      ${joinSql(conditions)}
    ORDER BY e.display_order ASC, label ASC, e.id ASC
    LIMIT ${p.pageSize} OFFSET ${offsetOf(p)}
  `.execute(db);

  return toPaged(
    result.rows.map((row) => ({
      id: row.id,
      kind: spec.kind,
      label: row.label,
      slug: row.slug,
      status: row.status,
      parentId: row.parent_id,
      parentLabel: row.parent_label,
      parentSlug: row.parent_slug,
      thumbnailId: row.thumbnail_id,
      thumbnailUrl: row.thumbnail_url,
      isFeatured: row.is_featured,
      relatedProductCount: Number(row.related_product_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    })),
    Number(result.rows[0]?.total ?? 0),
    p,
  );
}

function thumbnailExpression(columns: readonly string[]): RawBuilder<string | null> {
  if (columns.length === 0) return sql<string | null>`NULL::uuid`;
  if (columns.length === 1) return sql<string | null>`${sql.ref(`e.${columns[0]!}`)}`;
  return sql<string | null>`COALESCE(${sql.join(
    columns.map((column) => sql.ref(`e.${column}`)),
    sql`, `,
  )})`;
}

function joinSql(parts: readonly RawBuilder<unknown>[]): RawBuilder<unknown> {
  return parts.length === 0 ? sql`` : sql.join(parts, sql` `);
}

function parseTranslations(value: unknown): AdminTranslationSummaryRow[] {
  if (!Array.isArray(value)) return [];
  const rows: AdminTranslationSummaryRow[] = [];
  for (const item of value) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (
      (row.locale !== 'vi' && row.locale !== 'en') ||
      typeof row.title !== 'string' ||
      typeof row.slug !== 'string' ||
      (row.status !== 'draft' && row.status !== 'published' && row.status !== 'hidden')
    ) {
      continue;
    }
    rows.push({
      locale: row.locale,
      title: row.title,
      slug: row.slug,
      status: row.status,
      publishedAt:
        typeof row.published_at === 'string'
          ? new Date(row.published_at)
          : row.published_at instanceof Date
            ? row.published_at
            : null,
    });
  }
  return rows;
}
