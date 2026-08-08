import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { createTestPool } from '@ltv/testing';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('Taxonomy DAO tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  const tag = `tax-${Date.now()}`;

  beforeAll(async () => {
    pool = createTestPool(url);
    daos = createDaoManager(createKysely(pool));
  });
  afterAll(async () => {
    for (const t of ['product_categories', 'applications', 'industries', 'standards']) {
      await pool.query(`DELETE FROM ltv.${t} WHERE slug LIKE $1`, [`${tag}-%`]);
    }
    await pool.end();
  });

  /**
   * BAY COPY-PASTE. Bon DAO nay duoc viet theo cung mot khuon; mot dong
   * `protected readonly table = 'product_categories'` bi chep nham sang
   * `applications` se KHONG lam hong bien dich va KHONG lam hong test cua
   * rieng bang do — no chi lam hong khi hai bang cung co du lieu. Test nay
   * ghi vao mot bang roi doi bang kia phai TRONG.
   */
  it('moi DAO cay chi dung toi BANG CUA MINH', async () => {
    const pc = await daos.productCategories.insert({ name: `${tag}-pc`, slug: `${tag}-pc` });
    const ap = await daos.applications.insert({ name: `${tag}-ap`, slug: `${tag}-ap` });

    expect(await daos.applications.findById(pc.id)).toBeNull();
    expect(await daos.productCategories.findById(ap.id)).toBeNull();

    // Va cac ham cay cung phai tro dung bang
    expect(await daos.productCategories.findSubtreeIds(pc.id)).toEqual([pc.id]);
    expect(await daos.applications.findSubtreeIds(pc.id)).toEqual([]);
  });

  it('danh muc: loc cap 1 bat duoc san pham gan o cap 2 va 3', async () => {
    const l1 = await daos.productCategories.insert({ name: `${tag}-l1`, slug: `${tag}-l1` });
    const l2 = await daos.productCategories.insert({ name: `${tag}-l2`, slug: `${tag}-l2`, parentId: l1.id });
    const l3 = await daos.productCategories.insert({ name: `${tag}-l3`, slug: `${tag}-l3`, parentId: l2.id });

    expect(l3.depth).toBe(2);
    expect(l3.ancestorIds).toEqual([l1.id, l2.id]);
    const sub = await daos.productCategories.findSubtreeIds(l1.id);
    expect(sub.sort()).toEqual([l1.id, l2.id, l3.id].sort());
    expect(await daos.productCategories.findInconsistentNodes()).toEqual([]);
  });

  it('ung dung: doi cha cap nhat ca nhanh con', async () => {
    const a = await daos.applications.insert({ name: `${tag}-a`, slug: `${tag}-a` });
    const b = await daos.applications.insert({ name: `${tag}-b`, slug: `${tag}-b`, parentId: a.id });
    const c = await daos.applications.insert({ name: `${tag}-c`, slug: `${tag}-c`, parentId: b.id });

    await daos.transaction((tx) => tx.applications.moveNode(b.id, null));
    expect((await daos.applications.findById(c.id))!.ancestorIds).toEqual([b.id]);
    expect((await daos.applications.findById(c.id))!.depth).toBe(1);
    expect(await daos.applications.findInconsistentNodes()).toEqual([]);
  });

  it('khoi noi dung JSONB ghi va doc lai nguyen ven', async () => {
    // Moi khoi PHAI co `id` on dinh (doc/11): thieu no thi trinh soan thao
    // khong the neo con tro, va moi lan luu lai sinh khac di.
    const blocks = [
      {
        id: crypto.randomUUID(),
        type: 'paragraph' as const,
        spans: [{ text: 'May chung cat tu dong.' }],
      },
      {
        id: crypto.randomUUID(),
        type: 'list' as const,
        style: 'bullet' as const,
        items: [{ spans: [{ text: 'ASTM D86' }] }],
      },
    ];
    const i = await daos.industries.insert({
      name: `${tag}-dau-khi`, slug: `${tag}-dau-khi`, description: blocks,
    });
    const back = await daos.industries.findById(i.id);
    expect(back!.description).toHaveLength(2);
    expect(back!.description[0]).toMatchObject({ type: 'paragraph' });
  });

  it('KHOI HONG trong JSONB bi loai, phan con lai van doc duoc', async () => {
    const i = await daos.industries.insert({ name: `${tag}-hong`, slug: `${tag}-hong` });
    // Gia lap du lieu tu ban migration cu / sua tay bang psql
    await pool.query(
      `UPDATE ltv.industries SET description =
         '[{"id":"11111111-1111-4111-8111-111111111111","type":"paragraph","spans":[{"text":"con dung"}]},
           {"id":"22222222-2222-4222-8222-222222222222","type":"khong-ton-tai","x":1},
           {"type":"paragraph","spans":[{"text":"thieu id"}]}]'::jsonb
       WHERE id = $1`,
      [i.id],
    );
    const back = await daos.industries.findById(i.id);
    // Giu khoi hop le, bo hai khoi hong — trang thieu doan van con hon trang trang
    expect(back!.description).toHaveLength(1);
    expect(back!.description[0]).toMatchObject({ type: 'paragraph' });
  });

  // ── standards ──────────────────────────────────────────────────
  /**
   * `organization` + `code` phai DUY NHAT THEO LAN CHAY, khong duoc hard-code.
   *
   * Ban truoc dung thang `ASTM`/`D86`. Ba bai kiem trong khoi nay do ngay khi
   * du lieu demo (F0) dua `ASTM D86` that vao database:
   * `duplicate key value violates unique constraint "uq_standards_org_code"`.
   *
   * Slug da duoc gan `tag` tu truoc, nhung chi muc duy nhat lai nam tren
   * (organization, code) — nen `tag` bao ve dung cot KHONG bi rang buoc. Mot bai
   * kiem chi chay duoc tren database RONG thi no khong kiem duoc he thong that.
   */
  const ORG = `T${tag.replace(/\D/g, '').slice(-8)}`;

  it('findByCode khop DUNG cach chi muc duy nhat khop — khong phan biet hoa thuong', async () => {
    const s = await daos.standards.insert({
      organization: ORG, code: 'D86-X', slug: `${tag}-astm-d86`, name: 'Distillation',
    });
    expect((await daos.standards.findByCode(ORG.toLowerCase(), 'd86-x'))!.id).toBe(s.id);
    expect((await daos.standards.findByCode(ORG, 'D86-X'))!.id).toBe(s.id);
    expect(await daos.standards.findByCode(ORG, 'D87-X')).toBeNull();
  });

  it('chi muc duy nhat THAT SU chan trung theo hoa thuong', async () => {
    await daos.standards.insert({ organization: ORG, code: '3405-X', slug: `${tag}-iso-3405` });
    // Neu findByCode so khop kieu khac voi chi muc, thi day la cho no lo mat
    await expect(
      daos.standards.insert({
        organization: ORG.toLowerCase(), code: '3405-x', slug: `${tag}-iso-3405-b`,
      }),
    ).rejects.toThrow();
  });

  it('findManyByCodes lay ca lo bang MOT truy van', async () => {
    await daos.standards.insert({ organization: ORG, code: '123-X', slug: `${tag}-ip-123` });
    await daos.standards.insert({ organization: ORG, code: '51 751-X', slug: `${tag}-din-51751` });
    const got = await daos.standards.findManyByCodes([
      { organization: ORG.toLowerCase(), code: '123-x' },
      { organization: ORG.toLowerCase(), code: '51 751-x' },
      { organization: ORG, code: 'khong-co' },
    ]);
    expect(got.map((x) => x.code).sort()).toEqual(['123-X', '51 751-X']);
    expect(await daos.standards.findManyByCodes([])).toEqual([]);
  });

  it('listOrganizations dung cho mat bo loc', async () => {
    // Dung to chuc cua CHINH lan chay nay, khong dua vao `ASTM` tinh co co san:
    // "co ASTM trong database" la mot su that ve du lieu demo, khong phai ve ma.
    await daos.standards.insert({ organization: ORG, code: 'ORG-1', slug: `${tag}-org-1` });
    const orgs = await daos.standards.listOrganizations();
    const cua_toi = orgs.find((o) => o.organization === ORG);
    expect(cua_toi).toBeDefined();
    expect(cua_toi!.count).toBeGreaterThan(0);
  });

  it('tim theo ma so — nguoi mua go "D86" phai ra ket qua', async () => {
    await daos.standards.insert({ organization: ORG, code: 'D86-TIM', slug: `${tag}-tim` });
    const r = await daos.standards.list({ search: 'D86-TIM' }, { pageSize: 10 });
    expect(r.data.some((x) => x.code === 'D86-TIM')).toBe(true);
  });

  it('standards mac dinh la published, khac voi cac bang khac', async () => {
    const s = await daos.standards.insert({ organization: ORG, code: 'K2254-X', slug: `${tag}-jis` });
    // Tieu chuan la du kien tham chieu, khong phai noi dung bien tap —
    // bat soan thao publish tung cai la viec vo ich.
    expect(s.status).toBe('published');
    // Nhung `first_published_at` VAN chua duoc set: chua ai goi publish().
    expect(s.firstPublishedAt).toBeNull();
    expect(await daos.standards.canHardDelete(s.id)).toBe(true);
  });

  it('industries: phan trang va dem tren cung bo loc', async () => {
    await daos.industries.insert({ name: `${tag}-i1`, slug: `${tag}-i1` });
    await daos.industries.insert({ name: `${tag}-i2`, slug: `${tag}-i2` });
    const r = await daos.industries.list({ status: 'published' }, { page: 1, pageSize: 1 });
    expect(r.data).toHaveLength(1);
    expect(r.meta.totalItems).toBeGreaterThanOrEqual(2);
    expect(r.meta.totalPages).toBe(Math.ceil(r.meta.totalItems / 1));
  });
});
