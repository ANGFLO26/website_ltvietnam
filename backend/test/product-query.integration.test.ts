import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from '@ltv/db';
import { createTestPool } from '@ltv/testing';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import {
  ProductQueryServiceImpl,
  type ProductDaos,
} from '../src/services/products/service.js';

/**
 * BA ENDPOINT SAN PHAM — F2.
 *
 * Bo du lieu o day dung de KIEM NGU NGHIA BO LOC (ADR-007), khong de nhieu:
 *
 *   hang A: sp1 (tc-x, cap-2), sp2 (khong tieu chuan)
 *   hang B: sp3 (tc-x, cap-2)
 *   hang C: sp4 (tc-x)  — de chung minh `(A OR B) AND tc-x` KHONG lay sp4
 *   sp5: BAN NHAP        — khong bao gio duoc lo ra
 *   sp6: NGUNG KINH DOANH — PHAI van tra ve (ADR-011)
 */
const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('ProductQueryService tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  let ps: ProductQueryServiceImpl;
  let sqlCount = 0;
  const tag = `pq-${Date.now()}`;
  const s = (k: string) => `${tag}-${k}`;
  const id: Record<string, string> = {};

  beforeAll(async () => {
    pool = createTestPool(url!);
    const db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
      log: (e) => {
        if (e.level === 'query') sqlCount += 1;
      },
    });
    daos = createDaoManager(db);
    ps = new ProductQueryServiceImpl(daos as unknown as ProductDaos);

    for (const k of ['a', 'b', 'c'] as const) {
      const b = await daos.brands.insert({
        brandType: 'manufacturer', name: `Hang ${k.toUpperCase()}`, slug: s(`hang-${k}`),
      });
      id[`hang-${k}`] = b.id;
      await daos.brands.update(b.id, { isFeatured: k === 'a' });
      await daos.brands.publish(b.id, new Date());
    }

    const c0 = await daos.productCategories.insert({ name: 'C0', slug: s('cap-0') });
    const c1 = await daos.productCategories.insert({ name: 'C1', slug: s('cap-1'), parentId: c0.id });
    const c2 = await daos.productCategories.insert({ name: 'C2', slug: s('cap-2'), parentId: c1.id });
    Object.assign(id, { c0: c0.id, c1: c1.id, c2: c2.id });
    for (const c of [c0, c1, c2]) await daos.productCategories.publish(c.id, new Date());
    await daos.productCategories.update(c0.id, { isFeatured: true });

    const org = `ORG${tag.replace(/\D/g, '').slice(-6)}`;
    const tcX = await daos.standards.insert({ organization: org, code: 'X', slug: s('tc-x') });
    const tcY = await daos.standards.insert({ organization: org, code: 'Y', slug: s('tc-y') });
    Object.assign(id, { tcX: tcX.id, tcY: tcY.id });
    for (const t of [tcX, tcY]) await daos.standards.publish(t.id, new Date());
    await daos.standards.update(tcX.id, { isFeatured: true });

    const them = async (
      key: string, brand: string, cats: string[], stds: string[],
      opt: { publish?: boolean; featured?: boolean; discontinue?: boolean } = {},
    ) => {
      const p = await daos.products.insert({
        brandId: id[brand]!, name: `SP ${key}`, slug: s(key), model: `M-${key}`,
        shortDescription: `mo ta ${key}`,
      });
      id[key] = p.id;
      if (cats.length) {
        await daos.products.replaceCategories(
          p.id, cats.map((c, i) => ({ categoryId: id[c]!, isPrimary: i === 0 })),
        );
      }
      if (stds.length) {
        await daos.products.replaceStandards(p.id, stds.map((t) => ({ standardId: id[t]! })));
      }
      if (opt.featured) await daos.products.update(p.id, { isFeatured: true });
      if (opt.publish !== false) await daos.products.publish(p.id, new Date());
      if (opt.discontinue) await daos.products.discontinue(p.id, new Date());
      return p;
    };

    await them('sp1', 'hang-a', ['c2'], ['tcX'], { featured: true });
    await them('sp2', 'hang-a', ['c2'], []);
    await them('sp3', 'hang-b', ['c2'], ['tcX']);
    await them('sp4', 'hang-c', [], ['tcX']);
    await them('sp5', 'hang-a', ['c2'], ['tcX'], { publish: false }); // BAN NHAP
    await them('sp6', 'hang-a', ['c2'], ['tcY'], { discontinue: true });
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.products WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.product_categories WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.standards WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.brands WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.end();
  });

  const slugs = async (f: Parameters<typeof ps.list>[0]): Promise<string[]> =>
    (await ps.list(f, 'default', { pageSize: 100 })).items.map((p) => p.slug).sort();

  // ══════════════════ ADR-007 ══════════════════
  describe('ngu nghia bo loc (ADR-007)', () => {
    it('CUNG dimension = OR', async () => {
      expect(await slugs({ brandSlugs: [s('hang-a'), s('hang-b')] })).toEqual([
        s('sp1'), s('sp2'), s('sp3'), s('sp6'),
      ]);
    });

    it('KHAC dimension = AND', async () => {
      /**
       * Bai kiem quan trong nhat cua F2. `sp4` co `tc-x` nhung hang la C, nen
       * `(A OR B) AND tc-x` phai LOAI no. Neu cai dat lam OR giua cac dimension
       * thi `sp4` xuat hien va khong ai thay — danh sach chi "nhieu hon mot chut".
       */
      expect(
        await slugs({ brandSlugs: [s('hang-a'), s('hang-b')], standardSlugs: [s('tc-x')] }),
      ).toEqual([s('sp1'), s('sp3')]);
    });

    it('mot dimension chi de KHONG loc dimension khac', async () => {
      expect(await slugs({ standardSlugs: [s('tc-x')] })).toEqual([
        s('sp1'), s('sp3'), s('sp4'),
      ]);
    });

    it('MO RONG NHANH CON: loc cap 0 ra ca san pham gan o cap 2 (ADR-015)', async () => {
      const cap0 = await slugs({ categorySlugs: [s('cap-0')] });
      const cap2 = await slugs({ categorySlugs: [s('cap-2')] });
      expect(cap0).toEqual([s('sp1'), s('sp2'), s('sp3'), s('sp6')]);
      // Long chat: cap 0 khong the it hon cap 2.
      expect(cap0.length).toBeGreaterThanOrEqual(cap2.length);
      expect(cap2).toEqual(cap0);
    });

    it('ba dimension cung luc', async () => {
      expect(
        await slugs({
          brandSlugs: [s('hang-a')],
          categorySlugs: [s('cap-0')],
          standardSlugs: [s('tc-x')],
        }),
      ).toEqual([s('sp1')]);
    });

    it('tim tu do tren ten/model', async () => {
      expect(await slugs({ search: 'M-sp3' })).toEqual([s('sp3')]);
    });

    it('slug khong ton tai -> RONG, khong phai bo qua bo loc', async () => {
      /**
       * Bo qua bo loc khi slug khong giai duoc se tra ve TOAN BO danh sach, va
       * nguoi dung thay "bo loc khong co tac dung" chu khong thay "khong co ket
       * qua". Hai trang thai khac nhau.
       */
      expect(await slugs({ brandSlugs: ['hoan-toan-khong-co'] })).toEqual([]);
    });
  });

  // ══════════════════ ban nhap + ngung KD ══════════════════
  describe('trang thai', () => {
    it('BAN NHAP khong bao gio o trong danh sach', async () => {
      const tatCa = await slugs({});
      expect(tatCa).not.toContain(s('sp5'));
      expect(tatCa).toContain(s('sp1'));
    });

    it('BAN NHAP tra `null` o chi tiet -> 404', async () => {
      expect(await ps.findBySlug(s('sp5'))).toBeNull();
    });

    it('NGUNG KINH DOANH VAN o trong danh sach, kem co (ADR-011)', async () => {
      /**
       * `ProductFilter` cua DAO co `excludeDiscontinued`, va `PublicProductFilter`
       * CO Y khong pho no ra. Neu tang api dat duoc co nay thi mot ngay nao do ai
       * do dat no "cho danh sach dep hon" va ~200 URL cu chet lang le — dung thu
       * bang `redirects` dang co giu.
       */
      const tatCa = await slugs({});
      expect(tatCa, 'san pham ngung KD bi bien mat — sai ADR-011').toContain(s('sp6'));
      const sp6 = (await ps.list({}, 'default', { pageSize: 100 })).items.find(
        (p) => p.slug === s('sp6'),
      )!;
      expect(sp6.discontinued).toBe(true);
    });

    it('NGUNG KINH DOANH van tra chi tiet 200 voi co + moc thoi gian', async () => {
      const d = (await ps.findBySlug(s('sp6')))!;
      expect(d).not.toBeNull();
      expect(d.discontinued).toBe(true);
      expect(d.discontinued_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      // San pham con kinh doanh thi nguoc lai.
      const d1 = (await ps.findBySlug(s('sp1')))!;
      expect(d1.discontinued).toBe(false);
      expect(d1.discontinued_at).toBeNull();
    });
  });

  // ══════════════════ view ══════════════════
  describe('hinh dang view', () => {
    it('KHONG lo `id`/`status`, chi dung snake_case', async () => {
      const d = (await ps.findBySlug(s('sp1')))! as Record<string, unknown>;
      for (const k of ['id', 'status', 'brandId', 'publishedAt', 'createdBy']) {
        expect(d, `lo truong ${k}`).not.toHaveProperty(k);
      }
      for (const k of Object.keys(d)) expect(k).not.toMatch(/[A-Z]/);
    });

    it('quan he dung SLUG, khong dung UUID', async () => {
      const d = (await ps.findBySlug(s('sp1')))!;
      expect(d.brand.slug).toBe(s('hang-a'));
      expect(d.categories.map((c) => c.slug)).toContain(s('cap-2'));
      expect(d.standards.map((x) => x.slug)).toEqual([s('tc-x')]);
      for (const c of d.categories) {
        expect(c, 'category ref lo id').not.toHaveProperty('id');
      }
    });

    it('DUNG MOT danh muc chinh (ADR-010)', async () => {
      const d = (await ps.findBySlug(s('sp1')))!;
      expect(d.categories.filter((c) => c.is_primary)).toHaveLength(1);
    });
  });

  // ══════════════════ sap xep + phan trang ══════════════════
  describe('sap xep va phan trang', () => {
    it('`sort=name` sap theo ten', async () => {
      const r = await ps.list({ brandSlugs: [s('hang-a')] }, 'name', { pageSize: 100 });
      const ten = r.items.map((p) => p.name);
      expect(ten).toEqual([...ten].sort());
    });

    it('`sort=newest` THAT SU sap theo moc publish moi nhat truoc', async () => {
      /**
       * Bai kiem nay ra doi tu mot PHEP TIEM LOI KHONG BI BAT.
       *
       * Toi doi `newest` tu `published_at desc` sang `name desc` va CA BO TEST
       * VAN XANH: hai bai kiem sap xep cu chi kiem `sort=name`, con bai kia chi
       * kiem "ba lua chon deu goi duoc". Nghia la `sort=newest` — thu nguoi dung
       * bam de xem hang moi — chua tung duoc do.
       *
       * Dat moc publish CACH BIET ro rang roi doi chieu thu tu that.
       */
      const moc = (ngay: string) => new Date(`${ngay}T00:00:00Z`);
      await pool.query(`UPDATE ltv.products SET published_at = $2 WHERE id = $1`, [
        id['sp1'], moc('2026-01-01'),
      ]);
      await pool.query(`UPDATE ltv.products SET published_at = $2 WHERE id = $1`, [
        id['sp2'], moc('2026-06-01'),
      ]);
      await pool.query(`UPDATE ltv.products SET published_at = $2 WHERE id = $1`, [
        id['sp3'], moc('2026-03-01'),
      ]);
      const r = await ps.list(
        { brandSlugs: [s('hang-a'), s('hang-b')] }, 'newest', { pageSize: 100 },
      );
      const thuTu = r.items.map((p) => p.slug);
      // sp2 (thang 6) truoc sp3 (thang 3) truoc sp1 (thang 1)
      expect(thuTu.indexOf(s('sp2'))).toBeLessThan(thuTu.indexOf(s('sp3')));
      expect(thuTu.indexOf(s('sp3'))).toBeLessThan(thuTu.indexOf(s('sp1')));

      // Va `name` cho thu tu KHAC — neu giong nhau thi phep kiem tren vo nghia.
      const theoTen = (
        await ps.list({ brandSlugs: [s('hang-a'), s('hang-b')] }, 'name', { pageSize: 100 })
      ).items.map((p) => p.slug);
      expect(theoTen).not.toEqual(thuTu);
    });

    it('pageSize bi chan o 100', async () => {
      expect((await ps.list({}, 'default', { pageSize: 100_000 })).pageSize).toBe(100);
    });

    it('NGAN SACH: HAI truy van, bat ke tra ve bao nhieu dong', async () => {
      /**
       * Dieu kien P5 da do duoc o tang DAO; day la khang dinh no khong bi pha khi
       * di qua tang service. Mot cau lay dong, mot cau dem.
       */
      const do1 = async (pageSize: number) => {
        const truoc = sqlCount;
        const r = await ps.list({ categorySlugs: [s('cap-0')] }, 'default', { pageSize });
        return { q: sqlCount - truoc, n: r.items.length };
      };
      const mot = await do1(1);
      const nhieu = await do1(100);
      expect(mot.n).toBe(1);
      expect(nhieu.n).toBeGreaterThan(2);
      expect(mot.q).toBe(2);
      expect(nhieu.q).toBe(2);
    });
  });

  // ══════════════════ landing ══════════════════
  describe('landing', () => {
    it('tra ve nam nhom noi bat', async () => {
      const l = await ps.landing();
      expect(l.featured_brands.map((b) => b.slug)).toContain(s('hang-a'));
      expect(l.featured_categories.map((c) => c.slug)).toContain(s('cap-0'));
      expect(l.featured_standards.map((x) => x.slug)).toContain(s('tc-x'));
      expect(l.featured_products.map((p) => p.slug)).toContain(s('sp1'));
      expect(Object.keys(l).sort()).toEqual([
        'featured_applications',
        'featured_brands',
        'featured_categories',
        'featured_products',
        'featured_standards',
      ]);
    });

    it('CHI lay cai duoc danh dau noi bat', async () => {
      /**
       * `is_featured` la NGUON DUY NHAT quyet dinh noi bat (doc/06 PHAN VIII).
       * `homepage_sections.settings` chi chua cau hinh hien thi. Neu no chua danh
       * sach id thi co hai nguon su that cho cung mot cau hoi, va chung se lech.
       */
      /**
       * Bai kiem nay cung ra doi tu mot PHEP TIEM LOI KHONG BI BAT.
       *
       * Toi bo `isFeatured: true` khoi truy van DANH MUC (cai dau tien trong
       * `Promise.all`) va bo test VAN XANH — vi ban cu chi kiem `featured_brands`.
       * Bon nhom con lai khong duoc do. Gio kiem CA NAM.
       */
      const l = await ps.landing();
      expect(l.featured_brands.map((b) => b.slug)).not.toContain(s('hang-b'));

      expect(l.featured_brands.every((b) => b.is_featured), 'brands').toBe(true);
      expect(l.featured_categories.every((c) => c.is_featured), 'categories').toBe(true);
      expect(l.featured_applications.every((a) => a.is_featured), 'applications').toBe(true);
      expect(l.featured_products.every((p) => p.is_featured), 'products').toBe(true);

      /**
       * `StandardCardView` KHONG co `is_featured` (mat bo loc khong can no), nen
       * phai doi chieu bang mot phan tu CHAC CHAN khong noi bat: `tc-y`.
       */
      expect(l.featured_standards.map((x) => x.slug), 'standards').not.toContain(s('tc-y'));
      expect(l.featured_standards.map((x) => x.slug), 'standards').toContain(s('tc-x'));

      // Va DUNG cho: moi nhom phai co it nhat mot phan tu, khong thi rong vo nghia.
      for (const [ten, arr] of Object.entries(l)) {
        expect(arr.length, `nhom ${ten} rong -> phep kiem tren vo nghia`).toBeGreaterThan(0);
      }
    });

    it('ban nhap khong xuat hien o landing', async () => {
      const l = await ps.landing();
      expect(l.featured_products.map((p) => p.slug)).not.toContain(s('sp5'));
    });
  });
});
