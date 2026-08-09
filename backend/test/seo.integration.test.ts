import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { createTestPool } from '@ltv/testing';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { SeoServiceImpl } from '../src/services/seo/service.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('F6 SEO tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  let seo: SeoServiceImpl;
  const tag = `seo-${Date.now()}`;
  const s = (value: string): string => `${tag}-${value}`;

  beforeAll(async () => {
    pool = createTestPool(url!);
    daos = createDaoManager(createKysely(pool));
    seo = new SeoServiceImpl(daos, 'https://ltv.example');

    const brand = await daos.brands.insert({
      brandType: 'manufacturer',
      name: s('brand'),
      slug: s('brand'),
    });
    await daos.brands.publish(brand.id, new Date());

    const published = await daos.products.insert({
      brandId: brand.id,
      name: s('published'),
      slug: s('published'),
    });
    await daos.products.publish(published.id, new Date());
    await daos.products.insert({
      brandId: brand.id,
      name: s('draft'),
      slug: s('draft'),
    });

    const thin = await daos.productCategories.insert({
      name: s('thin'),
      slug: s('thin'),
      shortDescription: 'Du dieu kien publish nhung chua co noi dung landing',
    });
    await daos.productCategories.publish(thin.id, new Date());

    const editorial = await daos.productCategories.insert({
      name: s('editorial'),
      slug: s('editorial'),
      shortDescription: 'Co noi dung bien tap',
      description: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          type: 'paragraph',
          spans: [{ text: 'Noi dung rieng cho landing.' }],
        },
      ],
    });
    await daos.productCategories.publish(editorial.id, new Date());
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.redirects WHERE source_path LIKE $1`, [`%${tag}%`]);
    await pool.query(`DELETE FROM ltv.products WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.product_categories WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.brands WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.offices WHERE name LIKE $1`, [`${tag}-%`]);
    await pool.end();
  });

  it('DAO chi tra published, va locale vi khong tron entity mot-ngon-ngu', async () => {
    const en = await daos.seo.listSitemapSources('en');
    expect(en.some((x) => x.kind === 'product' && x.slug === s('published'))).toBe(true);
    expect(en.some((x) => x.kind === 'product' && x.slug === s('draft'))).toBe(false);

    const vi = await daos.seo.listSitemapSources('vi');
    expect(vi.some((x) => ['product', 'brand', 'document'].includes(x.kind))).toBe(false);
  });

  it('ADR-011 §2b doc dung noi dung JSONB thay vi short_description', async () => {
    const rows = await daos.seo.listSitemapSources('en');
    expect(rows.find((x) => x.slug === s('thin'))?.hasEditorialContent).toBe(false);
    expect(rows.find((x) => x.slug === s('editorial'))?.hasEditorialContent).toBe(true);

    const xml = await seo.sitemap('en');
    expect(xml).not.toContain(`/products/category/${s('thin')}`);
    expect(xml).toContain(`/products/category/${s('editorial')}`);
  });

  it('lastmod den tu updated_at va sitemap khong tro vao redirect', async () => {
    const { rows } = await pool.query<{ updated_at: Date }>(
      `UPDATE ltv.products SET short_description = $1 WHERE slug = $2 RETURNING updated_at`,
      ['doi de kich hoat trigger', s('published')],
    );
    const updated = rows[0]!.updated_at.toISOString();

    let xml = await seo.sitemap('en');
    expect(xml).toContain(`<loc>https://ltv.example/products/${s('published')}</loc>`);
    expect(xml).toContain(`<lastmod>${updated}</lastmod>`);

    await daos.redirects.upsert({
      sourcePath: `/products/${s('published')}`,
      targetPath: '/products/all',
    });
    xml = await seo.sitemap('en');
    expect(xml).not.toContain(`/products/${s('published')}`);
  });

  it('migration 035 chan hai head_office cung published', async () => {
    const existing = await pool.query<{ id: string }>(
      `SELECT id FROM ltv.offices
       WHERE office_type = 'head_office' AND status = 'published' LIMIT 1`,
    );
    if (existing.rowCount === 0) {
      await pool.query(
        `INSERT INTO ltv.offices (office_type, name, address, status)
         VALUES ('head_office', $1, 'test', 'published')`,
        [s('head-one')],
      );
    }
    const second = await pool.query<{ id: string }>(
      `INSERT INTO ltv.offices (office_type, name, address, status)
       VALUES ('head_office', $1, 'test', 'hidden') RETURNING id`,
      [s('head-two')],
    );
    await expect(
      pool.query(`UPDATE ltv.offices SET status = 'published' WHERE id = $1`, [second.rows[0]!.id]),
    ).rejects.toMatchObject({ code: '23505' });
  });
});
