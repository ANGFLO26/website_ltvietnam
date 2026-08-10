import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from '@ltv/db';
import { createTestPool } from '@ltv/testing';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { ProductQueryServiceImpl, type ProductDaos } from '../src/services/products/service.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

/** Fixture tai doc lap: sinh va xoa hon 100 san pham, khong lam phinh seed demo. */
run('W2 catalogue o quy mo tren 100 san pham', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  let service: ProductQueryServiceImpl;
  let queryCount = 0;
  const tag = `w2-scale-${Date.now()}`;

  beforeAll(async () => {
    pool = createTestPool(url!);
    const db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
      log: (event) => {
        if (event.level === 'query') queryCount += 1;
      },
    });
    daos = createDaoManager(db);
    service = new ProductQueryServiceImpl(daos as unknown as ProductDaos);

    const brand = await daos.brands.insert({
      brandType: 'manufacturer',
      name: `Scale brand ${tag}`,
      slug: `${tag}-brand`,
    });
    await daos.brands.publish(brand.id, new Date());
    const category = await daos.productCategories.insert({
      name: `Scale category ${tag}`,
      slug: `${tag}-category`,
    });
    await daos.productCategories.publish(category.id, new Date());

    await pool.query(
      `WITH inserted AS (
         INSERT INTO ltv.products (
           brand_id, name, slug, model, internal_code, short_description,
           status, published_at, first_published_at, display_order
         )
         SELECT $1, $2 || ' ' || n, $3 || '-' || n, 'M-' || n,
                $4 || '-' || n, $2, 'published', now(), now(), n
         FROM generate_series(1, 105) AS n
         RETURNING id
       )
       INSERT INTO ltv.product_category_links (product_id, category_id, is_primary)
       SELECT id, $5, true FROM inserted`,
      [brand.id, `Scale product ${tag}`, tag, tag.toUpperCase(), category.id],
    );
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.products WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.product_categories WHERE slug = $1`, [`${tag}-category`]);
    await pool.query(`DELETE FROM ltv.brands WHERE slug = $1`, [`${tag}-brand`]);
    await pool.end();
  });

  it('khong cat ngam o moc 100 va trang cuoi van dung ngan sach hai query', async () => {
    const before = queryCount;
    const result = await service.list({ categorySlugs: [`${tag}-category`] }, 'default', {
      page: 6,
      pageSize: 20,
    });

    expect(queryCount - before).toBe(2);
    expect(result.totalItems).toBe(105);
    expect(result.items).toHaveLength(5);
    expect(result.page).toBe(6);
  });
});
