import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from '@ltv/db';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

/**
 * BO LOC SAN PHAM — ba ca bat buoc cua `doc/06` PHAN XVI, tren du lieu cay that.
 *
 * Cay hang dung nhu ngoai doi:
 *
 *   PAC ─┬─ HERZOG ── (OptiDist)
 *        ├─ ISL     ── (FZP)
 *        └─ ALCOR
 *   Anton Paar (khong lien quan, de bat ket qua thua)
 *
 * Diem mau chot: KHONG san pham nao gan truc tiep vao PAC. Neu bo loc khong
 * mo rong nhanh con thi `?brand=pac` tra ve 0 — dung loi cua so do v1.2.1.
 */
run('Bo loc san pham tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  /** Dem so cau SQL that su gui di — dung de chung minh khong co N+1. */
  let sqlCount = 0;
  /** Moi cau SQL da gui — dung de kiem tinh chat cua truy van, khong phai ket qua. */
  let sqlLog: string[] = [];
  const tag = `f-${Date.now()}`;
  const id: Record<string, string> = {};

  const slug = (k: string) => `${tag}-${k}`;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, options: '-c search_path=ltv,public' });
    const db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
      log: (e) => {
        if (e.level !== 'query') return;
        sqlCount++;
        sqlLog.push(e.query.sql);
      },
    });
    daos = createDaoManager(db);

    // ── cay hang ──
    const pac = await daos.brands.insert({ brandType: 'manufacturer', name: 'PAC', slug: slug('pac') });
    id['pac'] = pac.id;
    for (const k of ['herzog', 'isl', 'alcor']) {
      const b = await daos.brands.insert({
        brandType: 'sub_brand', name: k.toUpperCase(), slug: slug(k), parentId: pac.id,
      });
      id[k] = b.id;
    }
    const ap = await daos.brands.insert({
      brandType: 'manufacturer', name: 'Anton Paar', slug: slug('anton-paar'),
    });
    id['anton'] = ap.id;

    // ── cay danh muc: thiet bi > chung cat > chung cat khi quyen ──
    const c1 = await daos.productCategories.insert({ name: 'Thiet bi', slug: slug('thiet-bi') });
    const c2 = await daos.productCategories.insert({
      name: 'Chung cat', slug: slug('chung-cat'), parentId: c1.id,
    });
    Object.assign(id, { c1: c1.id, c2: c2.id });

    // ── tieu chuan ──
    const d86 = await daos.standards.insert({ organization: 'ASTM', code: `D86-${tag}`, slug: slug('astm-d86') });
    const iso = await daos.standards.insert({ organization: 'ISO', code: `3405-${tag}`, slug: slug('iso-3405') });
    Object.assign(id, { d86: d86.id, iso: iso.id });

    // ── ung dung (cay) ──
    const aRoot = await daos.applications.insert({ name: 'Phan tich dau mo', slug: slug('dau-mo') });
    const aChild = await daos.applications.insert({
      name: 'Diem soi dau', slug: slug('diem-soi'), parentId: aRoot.id,
    });
    Object.assign(id, { aRoot: aRoot.id, aChild: aChild.id });

    const ind = await daos.industries.insert({ name: 'Dau khi', slug: slug('dau-khi') });
    id['ind'] = ind.id;

    // ── san pham ──
    const mk = async (
      key: string, brandKey: string, opts: { stds?: string[]; apps?: string[]; cats?: string[]; inds?: boolean } = {},
    ) => {
      const p = await daos.products.insert({
        brandId: id[brandKey]!, name: `${key.toUpperCase()} ${tag}`, slug: slug(key),
        shortDescription: `May ${key}`, model: key.toUpperCase(),
      });
      await daos.products.publish(p.id, new Date());
      if (opts.stds) await daos.products.replaceStandards(p.id, opts.stds.map((s) => ({ standardId: id[s]! })));
      if (opts.apps) await daos.products.replaceApplications(p.id, opts.apps.map((a) => ({ applicationId: id[a]! })));
      if (opts.cats) {
        await daos.products.replaceCategories(
          p.id, opts.cats.map((c, i) => ({ categoryId: id[c]!, isPrimary: i === 0 })),
        );
      }
      if (opts.inds) await daos.products.replaceIndustries(p.id, [{ industryId: id['ind']! }]);
      id[key] = p.id;
      return p;
    };

    // OptiDist: HERZOG, ASTM D86, gan danh muc CAP 2, ung dung nut CON
    await mk('optidist', 'herzog', { stds: ['d86'], apps: ['aChild'], cats: ['c2'], inds: true });
    // FZP: ISL, ISO 3405 (KHONG co D86)
    await mk('fzp', 'isl', { stds: ['iso'], cats: ['c2'] });
    // Sulfur: ALCOR, ASTM D86
    await mk('sulfur', 'alcor', { stds: ['d86'] });
    // Density: Anton Paar, ASTM D86 — ngoai nhanh PAC
    await mk('density', 'anton', { stds: ['d86'] });
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.products WHERE slug LIKE $1`, [`${tag}-%`]);
    for (const t of ['product_categories', 'applications', 'industries', 'standards', 'brands']) {
      await pool.query(`DELETE FROM ltv.${t} WHERE slug LIKE $1`, [`${tag}-%`]);
    }
    await pool.end();
  });

  const names = async (f: Parameters<DaoManager['products']['filter']>[0]) => {
    const r = await daos.products.filter({ ...f, search: tag }, undefined, { pageSize: 100 });
    return r.data.map((c) => c.slug.replace(`${tag}-`, '')).sort();
  };

  // ══════════ ba ca bat buoc cua doc/06 PHAN XVI ══════════

  it('brand=pac  →  MO RONG NHANH CON, khong phai 0 san pham', async () => {
    // Khong san pham nao gan truc tiep vao PAC. Day la ca da tung sai.
    expect(await names({ brandSlugs: [slug('pac')] })).toEqual(['fzp', 'optidist', 'sulfur']);
  });

  it('brand=pac&brand=herzog  →  PAC OR Herzog (hop, khong phai giao)', async () => {
    expect(await names({ brandSlugs: [slug('pac'), slug('herzog')] }))
      .toEqual(['fzp', 'optidist', 'sulfur']);
    // Hai hang khong cung nhanh: hop that su
    expect(await names({ brandSlugs: [slug('herzog'), slug('anton-paar')] }))
      .toEqual(['density', 'optidist']);
  });

  it('brand=pac&standard=astm-d86  →  PAC AND ASTM D86', async () => {
    // AND: loai FZP (trong PAC nhung ISO) va Density (co D86 nhung ngoai PAC)
    expect(await names({ brandSlugs: [slug('pac')], standardSlugs: [slug('astm-d86')] }))
      .toEqual(['optidist', 'sulfur']);
  });

  it('brand=pac&brand=herzog&standard=astm-d86  →  (PAC OR Herzog) AND ASTM D86', async () => {
    expect(
      await names({
        brandSlugs: [slug('pac'), slug('herzog')],
        standardSlugs: [slug('astm-d86')],
      }),
    ).toEqual(['optidist', 'sulfur']);
  });

  // ══════════ mo rong nhanh con cho cac chieu con lai ══════════

  it('danh muc cap 1 bat duoc san pham gan o cap 2', async () => {
    expect(await names({ categorySlugs: [slug('thiet-bi')] })).toEqual(['fzp', 'optidist']);
    expect(await names({ categorySlugs: [slug('chung-cat')] })).toEqual(['fzp', 'optidist']);
  });

  it('ung dung nut cha bat duoc san pham gan o nut con', async () => {
    expect(await names({ applicationSlugs: [slug('dau-mo')] })).toEqual(['optidist']);
  });

  it('nganh hang (phang) loc dung', async () => {
    expect(await names({ industrySlugs: [slug('dau-khi')] })).toEqual(['optidist']);
  });

  it('bon chieu cung luc van la AND', async () => {
    expect(
      await names({
        brandSlugs: [slug('pac')],
        standardSlugs: [slug('astm-d86')],
        categorySlugs: [slug('thiet-bi')],
        applicationSlugs: [slug('dau-mo')],
      }),
    ).toEqual(['optidist']);
  });

  it('slug khong ton tai  →  rong, khong phai tra ve tat ca', async () => {
    expect(await names({ brandSlugs: ['khong-co-hang-nay'] })).toEqual([]);
    expect(await names({ standardSlugs: ['khong-co'] })).toEqual([]);
  });

  it('mang rong bi bo qua, khong lam trong ket qua', async () => {
    expect(await names({ brandSlugs: [], standardSlugs: [] })).toHaveLength(4);
  });

  // ══════════ an toan ══════════

  it('MAC DINH chi tra ve da xuat ban — ban nhap khong lo ra', async () => {
    const draft = await daos.products.insert({
      brandId: id['herzog']!, name: `NHAP ${tag}`, slug: slug('nhap'),
    });
    expect((await names({})).includes('nhap')).toBe(false);
    // Quan tri hoi ro thi moi thay
    const asAdmin = await daos.products.filter(
      { status: 'draft', search: tag }, undefined, { pageSize: 100 },
    );
    expect(asAdmin.data.map((c) => c.id)).toContain(draft.id);
  });

  it('san pham xoa mem bien mat', async () => {
    const p = await daos.products.insert({
      brandId: id['isl']!, name: `XOA ${tag}`, slug: slug('xoa'),
    });
    await daos.products.publish(p.id, new Date());
    expect((await names({})).includes('xoa')).toBe(true);
    await daos.products.softDelete(p.id, new Date());
    expect((await names({})).includes('xoa')).toBe(false);
  });

  it('may NGUNG KINH DOANH van hien mac dinh (ADR-011)', async () => {
    await daos.products.discontinue(id['sulfur']!, new Date());
    // URL cu co backlink va thu hang — an di la vut bo gia tri do
    expect((await names({})).includes('sulfur')).toBe(true);
    expect((await names({ excludeDiscontinued: true })).includes('sulfur')).toBe(false);
    await daos.products.update(id['sulfur']!, { discontinuedAt: null });
  });

  it('cot sap xep la thi bi tu choi, khong ghep vao SQL', async () => {
    await expect(
      daos.products.filter({}, { by: 'name; DROP TABLE ltv.products' as never }),
    ).rejects.toThrow(/khong hop le/i);
  });

  it('ky tu dai dien trong tu khoa tim la ky tu thuong', async () => {
    const r = await daos.products.filter({ search: '%' }, undefined, { pageSize: 5 });
    expect(r.meta.totalItems).toBe(0);
  });

  it('the san pham mang san ten hang va anh — khong phai lay them', async () => {
    const r = await daos.products.filter(
      { brandSlugs: [slug('herzog')], search: tag }, undefined, { pageSize: 10 },
    );
    const card = r.data[0]!;
    expect(card.brandName).toBe('HERZOG');
    expect(card.brandSlug).toBe(slug('herzog'));
    expect(card.model).toBe('OPTIDIST');
  });

  it('phan trang: dem tren CUNG bo loc, khong phai tong bang', async () => {
    const r = await daos.products.filter(
      { brandSlugs: [slug('pac')], search: tag }, undefined, { page: 1, pageSize: 2 },
    );
    expect(r.data).toHaveLength(2);
    expect(r.meta.totalItems).toBe(3);
    expect(r.meta.totalPages).toBe(2);
  });

  it('thu tu phai co KHOA PHU duy nhat — kiem tren chinh cau SQL', async () => {
    /**
     * Vi sao kiem cau SQL chu khong kiem ket qua phan trang:
     *
     * Toi da viet ban kiem ket qua truoc — lay tung trang mot roi doi khong
     * co id nao lap lai. No PASS ngay ca khi da CO Y bo `p.id ASC` khoi
     * ORDER BY. Ly do: voi ba dong va khong co ghi dong thoi, PostgreSQL
     * tinh co tra ve dung thu tu moi lan. Bai kiem do khong chung minh gi ca.
     *
     * Thu tu khong on dinh la tinh chat cua CAU TRUY VAN, khong phai cua mot
     * lan chay. Nen kiem dung cho no: ORDER BY phai ket thuc bang mot cot
     * duy nhat. Thieu no thi hai dong cung `display_order` co the doi cho
     * giua hai lan goi, va nguoi dung thay mot may o ca trang 1 lan trang 2.
     */
    // `filter` gui HAI cau; cau dem khong co ORDER BY nen phai tim dung cau
    // lay dong, khong lay "cau gan nhat".
    const orderByOf = async (by: 'display_order' | 'name') => {
      sqlLog = [];
      await daos.products.filter({ search: tag }, { by }, { pageSize: 2 });
      const withOrder = sqlLog.filter((s) => /order\s+by/i.test(s));
      expect(withOrder, `khong cau nao co ORDER BY:\n${sqlLog.join('\n')}`).toHaveLength(1);
      return /order by (.+?)\s+limit/is.exec(withOrder[0]!)?.[1]?.trim().toLowerCase() ?? '';
    };

    expect(await orderByOf('display_order')).toMatch(/p\.id\s+asc$/);
    // Va khoa phu van con khi doi cot sap xep
    expect(await orderByOf('name')).toMatch(/p\.id\s+asc$/);
  });

  // ══════════ NGAN SACH TRUY VAN — dieu kien P5 ══════════

  it('KHONG N+1: so cau SQL khong doi khi so san pham tang', async () => {
    const measure = async (pageSize: number) => {
      const before = sqlCount;
      const r = await daos.products.filter({ search: tag }, undefined, { pageSize });
      return { queries: sqlCount - before, rows: r.data.length };
    };

    const one = await measure(1);
    const many = await measure(100);

    expect(one.rows).toBe(1);
    expect(many.rows).toBeGreaterThan(2);
    // Day la phep do that, khong phai loi hua trong tai lieu:
    expect(one.queries).toBe(2);      // mot cau lay dong, mot cau dem
    expect(many.queries).toBe(2);     // van the du tra ve gap nhieu lan
  });

  it('KHONG N+1: trang chi tiet co so cau CO DINH, khong theo so quan he', async () => {
    // OptiDist co 1 tieu chuan, 1 ung dung, 1 danh muc, 1 nganh
    const before1 = sqlCount;
    await daos.products.findDetailBySlug(slug('optidist'));
    const few = sqlCount - before1;

    // Them nhieu quan he vao cung san pham
    await daos.products.replaceStandards(id['optidist']!, [
      { standardId: id['d86']! }, { standardId: id['iso']! },
    ]);
    await daos.products.replaceCategories(id['optidist']!, [
      { categoryId: id['c2']!, isPrimary: true }, { categoryId: id['c1']! },
    ]);
    await daos.products.replaceApplications(id['optidist']!, [
      { applicationId: id['aChild']! }, { applicationId: id['aRoot']! },
    ]);
    await daos.products.replaceRelated(id['optidist']!, [
      { relatedProductId: id['fzp']!, relationType: 'similar' },
      { relatedProductId: id['sulfur']!, relationType: 'alternative' },
    ]);

    const before2 = sqlCount;
    const d = await daos.products.findDetailBySlug(slug('optidist'));
    const many = sqlCount - before2;

    expect(d!.standards).toHaveLength(2);
    expect(d!.related).toHaveLength(2);
    expect(many).toBe(few);   // gap doi du lieu, KHONG them mot cau nao
  });

  it('chi tiet: san pham lien quan mang san the day du', async () => {
    const d = await daos.products.findDetailBySlug(slug('optidist'));
    expect(d!.brand.name).toBe('HERZOG');
    expect(d!.categories.find((c) => c.isPrimary)?.slug).toBe(slug('chung-cat'));
    expect(d!.related[0]!.card.brandName).toBeTruthy();
    expect(d!.related.map((r) => r.relationType).sort()).toEqual(['alternative', 'similar']);
  });

  it('chi tiet: khong tim thay thi tra ve null, khong nem loi', async () => {
    expect(await daos.products.findDetailBySlug('khong-ton-tai')).toBeNull();
  });

  // ══════════ replace-set (ADR-008) ══════════

  it('replace THAY CA TAP, khong cong don', async () => {
    const p = id['fzp']!;
    await daos.products.replaceStandards(p, [{ standardId: id['d86']! }]);
    await daos.products.replaceStandards(p, [{ standardId: id['iso']! }]);
    const d = await daos.products.findDetailBySlug(slug('fzp'));
    expect(d!.standards).toHaveLength(1);
    expect(d!.standards[0]!.organization).toBe('ISO');

    await daos.products.replaceStandards(p, []);
    expect((await daos.products.findDetailBySlug(slug('fzp')))!.standards).toEqual([]);
  });

  it('DB tu choi hai danh muc chinh cho mot san pham (ADR-010)', async () => {
    await expect(
      daos.products.replaceCategories(id['fzp']!, [
        { categoryId: id['c1']!, isPrimary: true },
        { categoryId: id['c2']!, isPrimary: true },
      ]),
    ).rejects.toThrow();
  });

  it('ROLLBACK: doi quan he that bai thi khong de lai trang thai nua voi', async () => {
    const p = id['fzp']!;
    await daos.products.replaceCategories(p, [{ categoryId: id['c2']!, isPrimary: true }]);

    await expect(
      daos.transaction(async (tx) => {
        await tx.products.replaceCategories(p, [{ categoryId: id['c1']!, isPrimary: true }]);
        await tx.products.replaceStandards(p, [{ standardId: id['d86']! }]);
        throw new Error('buoc sau that bai');
      }),
    ).rejects.toThrow('buoc sau that bai');

    const d = await daos.products.findDetailBySlug(slug('fzp'));
    // Danh muc phai NGUYEN nhu cu, khong bi thay bang c1 va khong bi xoa trang
    expect(d!.categories.map((c) => c.slug)).toEqual([slug('chung-cat')]);
    expect(d!.standards).toEqual([]);
  });
});
