import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import type { SeoDao } from './dao.interface.js';
import { toSitemapSource } from './mapper.js';
import type { SitemapSource, SitemapSourceRow } from './object.js';
import { DEFAULT_LOCALE, type Locale } from '@ltv/contracts';

/**
 * Ngon ngu duy nhat cua catalogue.
 *
 * San pham, hang, tai lieu va taxonomy khong co bang dich, nen chung xuat hien
 * o DUNG MOT sitemap. Truoc dot dao ngon ngu do la `'en'` viet cung o 12 cho
 * trong truy van duoi; nay no bam theo `DEFAULT_LOCALE`, nen doi ngon ngu goc
 * khong con lam catalogue bien mat khoi sitemap ma khong ai nhan ra.
 */
const CATALOGUE_LOCALE: Locale = DEFAULT_LOCALE;

/**
 * Doc sitemap bang MOT truy van UNION thay vi lap qua cac DAO phan trang.
 *
 * Sitemap khong duoc cat o trang 100 dau tien. Day la truy van tong hop chi doc,
 * nen no co DAO rieng thay vi cho service biet Kysely hoac ten cot SQL.
 */
export class KyselySeoDao extends BaseDao implements SeoDao {
  async listSitemapSources(locale: Locale): Promise<SitemapSource[]> {
    const result = await sql<SitemapSourceRow>`
      SELECT kind, locale, slug, page_type, updated_at, has_editorial_content
      FROM (
        SELECT 'page'::text AS kind, pt.locale, pt.slug, p.page_type,
               GREATEST(p.updated_at, pt.updated_at) AS updated_at,
               TRUE AS has_editorial_content
        FROM ltv.pages p
        JOIN ltv.page_translations pt ON pt.page_id = p.id
        WHERE p.status = 'published' AND p.deleted_at IS NULL
          AND pt.status = 'published' AND pt.locale = ${locale}

        UNION ALL
        SELECT 'product', ${CATALOGUE_LOCALE}, p.slug, NULL, p.updated_at, TRUE
        FROM ltv.products p
        WHERE ${locale} = ${CATALOGUE_LOCALE} AND p.status = 'published' AND p.deleted_at IS NULL

        UNION ALL
        SELECT 'brand', ${CATALOGUE_LOCALE}, b.slug, NULL, b.updated_at, TRUE
        FROM ltv.brands b
        WHERE ${locale} = ${CATALOGUE_LOCALE} AND b.status = 'published' AND b.deleted_at IS NULL

        UNION ALL
        SELECT 'product_category', ${CATALOGUE_LOCALE}, c.slug, NULL, c.updated_at,
               CASE WHEN jsonb_typeof(c.description) = 'array'
                    THEN jsonb_array_length(c.description) > 0 ELSE FALSE END
        FROM ltv.product_categories c
        WHERE ${locale} = ${CATALOGUE_LOCALE} AND c.status = 'published' AND c.deleted_at IS NULL

        UNION ALL
        SELECT 'standard', ${CATALOGUE_LOCALE}, s.slug, NULL, s.updated_at,
               COALESCE(length(btrim(s.description)) > 0, FALSE)
        FROM ltv.standards s
        WHERE ${locale} = ${CATALOGUE_LOCALE} AND s.status = 'published' AND s.deleted_at IS NULL

        UNION ALL
        SELECT 'application', ${CATALOGUE_LOCALE}, a.slug, NULL, a.updated_at,
               CASE WHEN jsonb_typeof(a.description) = 'array'
                    THEN jsonb_array_length(a.description) > 0 ELSE FALSE END
        FROM ltv.applications a
        WHERE ${locale} = ${CATALOGUE_LOCALE} AND a.status = 'published' AND a.deleted_at IS NULL

        UNION ALL
        SELECT 'service', st.locale, st.slug, NULL,
               GREATEST(s.updated_at, st.updated_at), TRUE
        FROM ltv.services s
        JOIN ltv.service_translations st ON st.service_id = s.id
        WHERE s.status = 'published' AND s.deleted_at IS NULL
          AND st.status = 'published' AND st.locale = ${locale}

        UNION ALL
        SELECT 'project', pt.locale, pt.slug, NULL,
               GREATEST(p.updated_at, pt.updated_at), TRUE
        FROM ltv.projects p
        JOIN ltv.project_translations pt ON pt.project_id = p.id
        WHERE p.status = 'published' AND p.deleted_at IS NULL
          AND pt.status = 'published' AND pt.locale = ${locale}

        UNION ALL
        SELECT 'post', pt.locale, pt.slug, NULL,
               GREATEST(p.updated_at, pt.updated_at), TRUE
        FROM ltv.posts p
        JOIN ltv.post_translations pt ON pt.post_id = p.id
        WHERE p.status = 'published' AND p.deleted_at IS NULL
          AND pt.status = 'published' AND pt.locale = ${locale}

        UNION ALL
        SELECT 'post_category', ${locale}, pc.slug, NULL, pc.updated_at, TRUE
        FROM ltv.post_categories pc
        WHERE pc.status = 'published' AND pc.deleted_at IS NULL

        UNION ALL
        SELECT 'document', ${CATALOGUE_LOCALE}, d.slug, NULL, d.updated_at, TRUE
        FROM ltv.documents d
        WHERE ${locale} = ${CATALOGUE_LOCALE} AND d.status = 'published' AND d.deleted_at IS NULL
      ) AS sources
      ORDER BY kind, slug
    `.execute(this.db);

    return result.rows.map(toSitemapSource);
  }

  async listActiveRedirectSources(): Promise<string[]> {
    const rows = await this.db
      .selectFrom('redirects')
      .select('source_path')
      .where('status', '=', 'active')
      .orderBy('source_path')
      .execute();
    return rows.map((x) => x.source_path);
  }
}
