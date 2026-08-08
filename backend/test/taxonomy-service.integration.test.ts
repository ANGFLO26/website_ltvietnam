import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from '@ltv/db';
import { createTestPool } from '@ltv/testing';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { TaxonomyServiceImpl, type TaxonomyDaos } from '../src/services/taxonomy/service.js';

/**
 * DUONG DOC CONG KHAI cua nam nhom taxonomy — F1.
 *
 * Bai kiem quan trong nhat o day khong phai "danh sach tra ve dung so luong" ma
 * la BAN NHAP VO HINH. `doc/06` PHAN XIII: luong doc cong khai la
 * `locale + published + not deleted + filter`. Cac DAO nhan `status?` tuy chon,
 * nen mot cho quen `status: 'published'` se lo noi dung chua duyet ra ngoai —
 * im lang, va khong ai biet cho den khi no xuat hien tren Google.
 */
const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('TaxonomyService tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  let tx: TaxonomyServiceImpl;
  let sqlCount = 0;
  const tag = `tx-${Date.now()}`;
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
    tx = new TaxonomyServiceImpl(daos as unknown as TaxonomyDaos);

    // ── hang: mot goc da publish, mot con da publish, mot BAN NHAP ──
    const goc = await daos.brands.insert({
      brandType: 'manufacturer', name: 'Hang Goc', slug: s('hang-goc'), code: 'HG',
      countryCode: 'DE', websiteUrl: 'https://vd.local',
    });
    id['goc'] = goc.id;
    await daos.brands.update(goc.id, { isFeatured: true });
    await daos.brands.publish(goc.id, new Date());

    const con = await daos.brands.insert({
      brandType: 'sub_brand', name: 'Hang Con', slug: s('hang-con'), parentId: goc.id,
    });
    id['con'] = con.id;
    await daos.brands.publish(con.id, new Date());

    // KHONG publish — day la ban nhap.
    const nhap = await daos.brands.insert({
      brandType: 'manufacturer', name: 'Hang Nhap', slug: s('hang-nhap'),
    });
    id['nhapBrand'] = nhap.id;

    // ── danh muc: ba cap, cap sau nhat la ban nhap ──
    const c0 = await daos.productCategories.insert({ name: 'Cap 0', slug: s('cap-0') });
    const c1 = await daos.productCategories.insert({ name: 'Cap 1', slug: s('cap-1'), parentId: c0.id });
    const c2 = await daos.productCategories.insert({ name: 'Cap 2', slug: s('cap-2'), parentId: c1.id });
    Object.assign(id, { c0: c0.id, c1: c1.id, c2: c2.id });
    for (const c of [c0, c1, c2]) await daos.productCategories.publish(c.id, new Date());
    const cNhap = await daos.productCategories.insert({ name: 'DM Nhap', slug: s('dm-nhap') });
    id['nhapCat'] = cNhap.id;

    // ── tieu chuan ──
    const st = await daos.standards.insert({
      organization: `ORG${tag.replace(/\D/g, '').slice(-6)}`, code: 'C-1', slug: s('tc-1'),
      description: 'mo ta tieu chuan',
    });
    id['st'] = st.id;
    await daos.standards.publish(st.id, new Date());

    // ── nganh ──
    const ng = await daos.industries.insert({ name: 'Nganh 1', slug: s('ng-1') });
    id['ng'] = ng.id;
    await daos.industries.publish(ng.id, new Date());

    // ── san pham gan vao cap 2 (de kiem mo rong nhanh con) ──
    const sp = await daos.products.insert({
      brandId: goc.id, name: 'May Demo', slug: s('may-demo'), model: 'M-1',
    });
    id['sp'] = sp.id;
    await daos.products.replaceCategories(sp.id, [{ categoryId: c2.id, isPrimary: true }]);
    await daos.products.replaceStandards(sp.id, [{ standardId: st.id }]);
    await daos.products.replaceIndustries(sp.id, [{ industryId: ng.id }]);
    await daos.products.publish(sp.id, new Date());
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.products WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.product_categories WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.brands WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.standards WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.industries WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.end();
  });

  // ══════════════════ BAN NHAP VO HINH ══════════════════
  describe('ban nhap KHONG BAO GIO lo ra duong cong khai', () => {
    /**
     * Day la bai kiem dat cuoc cao nhat cua F1. `TaxonomyService` co y KHONG co
     * tham so `status` o bat ky phuong thuc nao — tang api khong the hoi ban
     * nhap. Nhung "khong the hoi" chi dung neu cai dat that su luon loc, va doc
     * bang mat khong phai mot bao dam.
     */
    it('khong xuat hien trong danh sach hang', async () => {
      const r = await tx.listBrands({}, { pageSize: 100 });
      expect(r.items.map((b) => b.slug)).not.toContain(s('hang-nhap'));
      // Va DUNG cho: hang da publish PHAI co mat, khong thi phep kiem tren rong.
      expect(r.items.map((b) => b.slug)).toContain(s('hang-goc'));
    });

    it('tra `null` khi tra cuu truc tiep theo slug', async () => {
      expect(await tx.findBrand(s('hang-nhap'))).toBeNull();
      expect(await tx.findProductCategory(s('dm-nhap'))).toBeNull();
      // Doi chieu: slug da publish thi tra ve that.
      expect(await tx.findBrand(s('hang-goc'))).not.toBeNull();
    });

    it('khong xuat hien trong cay danh muc', async () => {
      const cay = await tx.productCategoryTree();
      const moiSlug = (ns: readonly { slug: string; children: readonly unknown[] }[]): string[] =>
        ns.flatMap((n) => [
          n.slug,
          ...moiSlug(n.children as readonly { slug: string; children: readonly unknown[] }[]),
        ]);
      const tatCa = moiSlug(cay);
      expect(tatCa).not.toContain(s('dm-nhap'));
      expect(tatCa).toContain(s('cap-2'));
    });

    it('`productsOf` tra `null` cho nhanh chua publish -> 404, khong phai trang rong', async () => {
      /**
       * "Rong" va "khong ton tai" la hai cau tra loi khac nhau. Gop lai thi mot
       * slug go sai (hoac mot nhanh chua duyet) tra ve trang rong 200, va Google
       * se index trang rong do.
       */
      expect(await tx.productsOf('category', s('dm-nhap'))).toBeNull();
      expect(await tx.productsOf('category', 'hoan-toan-khong-co-slug-nay')).toBeNull();
    });
  });

  // ══════════════════ view cong khai ══════════════════
  describe('hinh dang view', () => {
    it('KHONG lo `id`, `status`, `publishedAt` — chi slug lam khoa cong khai', async () => {
      /**
       * `doc/06` PHAN XV muc 11: public API dung SLUG, admin dung UUID. Lo UUID
       * ra ngoai thi frontend se dung no lam khoa, va mot trang co hai dinh danh.
       */
      const b = (await tx.findBrand(s('hang-goc')))! as Record<string, unknown>;
      for (const k of ['id', 'status', 'publishedAt', 'published_at', 'firstPublishedAt']) {
        expect(b, `view lo truong ${k}`).not.toHaveProperty(k);
      }
      expect(b['slug']).toBe(s('hang-goc'));
    });

    it('chi dung snake_case', async () => {
      const b = (await tx.findBrand(s('hang-goc')))!;
      for (const k of Object.keys(b)) expect(k).not.toMatch(/[A-Z]/);
    });

    it('`parent_slug` la SLUG, khong phai UUID', async () => {
      const con = (await tx.findBrand(s('hang-con')))!;
      expect(con.parent_slug).toBe(s('hang-goc'));
      expect(con.parent_slug).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
    });

    it('hang goc co `parent_slug` la null', async () => {
      expect((await tx.findBrand(s('hang-goc')))!.parent_slug).toBeNull();
    });
  });

  // ══════════════════ cay ══════════════════
  describe('cay danh muc', () => {
    it('LONG NHAU dung ba cap', async () => {
      const cay = await tx.productCategoryTree();
      const c0 = cay.find((n) => n.slug === s('cap-0'));
      expect(c0, 'khong thay cap 0 o goc').toBeDefined();
      const c1 = c0!.children.find((n) => n.slug === s('cap-1'));
      expect(c1, 'cap 1 phai la con cua cap 0').toBeDefined();
      expect(c1!.children.map((n) => n.slug)).toContain(s('cap-2'));
    });

    it('dung HAI truy van cho ca cay — khong N+1', async () => {
      /**
       * Cay danh muc phuc vu mega menu, tuc no duoc goi o MOI trang. Goi
       * `findChildren` de quy la N+1 dung nghia: voi ba cap la hang chuc truy
       * van cho mot thanh dieu huong.
       *
       * HAI, khong phai MOT: `Paged` chay mot cau lay dong va mot cau dem. Toi
       * khang dinh 1 truoc va phep do tra ve 2 — con so trong dau toi sai, khong
       * phai ma sai. Ghi dung con so do duoc.
       */
      const truoc = sqlCount;
      await tx.productCategoryTree();
      expect(sqlCount - truoc).toBe(2);
    });

    it('KHONG CAT NGAM khi so node vuot mot trang', async () => {
      /**
       * Loi that: ban dau `productCategoryTree` goi `list(..., {pageSize: 100})`
       * DUNG MOT LAN. Mot catalogue 101 danh muc se mat mot phan mega menu,
       * khong bao loi — trieu chung la "mot muc menu bien mat", thu khong ai lan
       * ra tu ma nguon. Voi catalogue thiet bi ba cap thi hon 100 danh muc la
       * chuyen binh thuong.
       *
       * Kiem bang `chunk = 1`: ba node cua bo test nay buoc phai lap ba trang.
       */
      const nho = new TaxonomyServiceImpl(daos as unknown as TaxonomyDaos, 1);
      const cay = await nho.productCategoryTree();
      const moiSlug = (ns: readonly { slug: string; children: readonly unknown[] }[]): string[] =>
        ns.flatMap((n) => [
          n.slug,
          ...moiSlug(n.children as readonly { slug: string; children: readonly unknown[] }[]),
        ]);
      const tatCa = moiSlug(cay);
      for (const k of ['cap-0', 'cap-1', 'cap-2']) {
        expect(tatCa, `thieu ${k} khi chunk=1 -> dang CAT NGAM`).toContain(s(k));
      }
    });

    it('node MO COI (cha chua publish) bi bo, khong noi len goc', async () => {
      /**
       * Treo node mo coi lam goc se cho ra mot muc menu khong co duong dan hop
       * le: nguoi dung bam vao va den mot trang cha khong ton tai.
       */
      const chaNhap = await daos.productCategories.insert({
        name: 'Cha Nhap', slug: s('cha-nhap'),
      });
      const conCuaNhap = await daos.productCategories.insert({
        name: 'Con Cua Nhap', slug: s('con-cua-nhap'), parentId: chaNhap.id,
      });
      await daos.productCategories.publish(conCuaNhap.id, new Date());
      try {
        const cay = await tx.productCategoryTree();
        expect(cay.map((n) => n.slug)).not.toContain(s('con-cua-nhap'));
      } finally {
        await pool.query(`DELETE FROM ltv.product_categories WHERE id = ANY($1::uuid[])`, [
          [conCuaNhap.id, chaNhap.id],
        ]);
      }
    });
  });

  // ══════════════════ bo loc ══════════════════
  describe('bo loc va phan trang', () => {
    it('`parentSlug` khong giai duoc -> RONG, khong phai toan bo', async () => {
      /**
       * Bo qua tham so khi khong giai duoc slug la cai bay im lang: nguoi goi xin
       * "con cua hang X" va nhan ve MOI hang, roi hien thi chung nhu con cua X.
       */
      const r = await tx.listBrands({ parentSlug: 'khong-co-hang-nay' }, { pageSize: 100 });
      expect(r.items).toEqual([]);
      expect(r.totalItems).toBe(0);
    });

    it('`parentSlug` tro toi ban NHAP cung -> RONG', async () => {
      const r = await tx.listBrands({ parentSlug: s('hang-nhap') }, { pageSize: 100 });
      expect(r.items).toEqual([]);
    });

    it('`parentSlug: null` chi lay cap GOC', async () => {
      const r = await tx.listBrands({ parentSlug: null }, { pageSize: 100 });
      const slugs = r.items.map((b) => b.slug);
      expect(slugs).toContain(s('hang-goc'));
      expect(slugs).not.toContain(s('hang-con'));
    });

    it('`featured` loc dung', async () => {
      const r = await tx.listBrands({ featured: true }, { pageSize: 100 });
      expect(r.items.map((b) => b.slug)).toContain(s('hang-goc'));
      expect(r.items.every((b) => b.is_featured)).toBe(true);
    });

    it('pageSize bi CHAN o 100', async () => {
      // Khong chan thi `?page_size=100000` la mot cach lam cham he thong bang
      // mot yeu cau hop le.
      const r = await tx.listBrands({}, { pageSize: 100_000 });
      expect(r.pageSize).toBe(100);
    });

    it('pageSize va page duoi 1 duoc keo ve 1', async () => {
      const r = await tx.listBrands({}, { page: 0, pageSize: 0 });
      expect(r.page).toBe(1);
      expect(r.pageSize).toBe(1);
    });

    it('`listBrandChildren` tra null cho slug khong ton tai', async () => {
      expect(await tx.listBrandChildren('khong-co')).toBeNull();
      expect((await tx.listBrandChildren(s('hang-goc')))!.map((b) => b.slug)).toEqual([
        s('hang-con'),
      ]);
    });
  });

  // ══════════════════ san pham theo nhanh ══════════════════
  describe('productsOf — mo rong nhanh con (ADR-015)', () => {
    it('loc theo danh muc CAP 0 tim ra san pham gan o CAP 2', async () => {
      /**
       * Day la dieu ma cay mot cap khong kiem duoc: voi mot cap thi "mo nhanh
       * con" va "khop dung mot node" cho ket qua giong nhau.
       */
      const r = await tx.productsOf('category', s('cap-0'), { pageSize: 100 });
      expect(r).not.toBeNull();
      expect(r!.items.map((p) => p.slug)).toContain(s('may-demo'));
    });

    it('loc theo tieu chuan va nganh cung ra san pham do', async () => {
      for (const [dim, slug] of [
        ['standard', s('tc-1')],
        ['industry', s('ng-1')],
      ] as const) {
        const r = await tx.productsOf(dim, slug, { pageSize: 100 });
        expect(r, `${dim} tra null`).not.toBeNull();
        expect(r!.items.map((p) => p.slug), dim).toContain(s('may-demo'));
      }
    });

    it('the san pham co `brand` va co `discontinued`', async () => {
      const r = await tx.productsOf('category', s('cap-2'), { pageSize: 100 });
      const sp = r!.items.find((p) => p.slug === s('may-demo'))!;
      expect(sp.brand).toEqual({ slug: s('hang-goc'), name: 'Hang Goc' });
      expect(sp.discontinued).toBe(false);
      expect(sp.model).toBe('M-1');
    });

    it('san pham NGUNG KINH DOANH van tra ve, kem co (ADR-011)', async () => {
      await daos.products.discontinue(id['sp']!, new Date());
      try {
        const r = await tx.productsOf('category', s('cap-2'), { pageSize: 100 });
        const sp = r!.items.find((p) => p.slug === s('may-demo'));
        expect(sp, 'san pham ngung KD bi BIEN MAT — sai ADR-011').toBeDefined();
        expect(sp!.discontinued).toBe(true);
      } finally {
        await pool.query(`UPDATE ltv.products SET discontinued_at = NULL WHERE id = $1`, [
          id['sp'],
        ]);
      }
    });
  });
});
