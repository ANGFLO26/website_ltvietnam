import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { TreeCycleError } from '../src/dao/tree.dao.js';
import { SlugTakenError } from '../src/dao/slugged.dao.js';

/**
 * Kiem chung ADR-015 tren PostgreSQL THAT.
 *
 * Diem quan trong nhat: doi cha phai tinh lai `ancestor_ids` va `depth` cho
 * NUT DO VA TOAN BO NHANH CON. Sai cho nay thi bo loc theo hang me tra sai
 * ket qua, ma khong co gi bao.
 */
const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('TreeDao + SlugSupport tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  const tag = `tree-${Date.now()}`;
  const ids: Record<string, string> = {};

  const mk = async (key: string, parent: string | null) => {
    const b = await daos.brands.insert({
      parentId: parent, brandType: parent ? 'sub_brand' : 'manufacturer',
      name: `${tag}-${key}`, slug: `${tag}-${key}`,
    });
    ids[key] = b.id;
    return b;
  };

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, options: '-c search_path=ltv,public' });
    daos = createDaoManager(createKysely(pool));
    //        pac
    //       /   \
    //   herzog   isl
    //     |
    //   optidist-line
    await mk('pac', null);
    await mk('herzog', ids['pac']!);
    await mk('isl', ids['pac']!);
    await mk('line', ids['herzog']!);
  });
  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.brands WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.end();
  });

  it('insert tinh dung ancestor_ids va depth theo tung cap', async () => {
    const pac = await daos.brands.findById(ids['pac']!);
    const herzog = await daos.brands.findById(ids['herzog']!);
    const line = await daos.brands.findById(ids['line']!);
    expect(pac!.depth).toBe(0);
    expect(pac!.ancestorIds).toEqual([]);
    expect(herzog!.depth).toBe(1);
    expect(herzog!.ancestorIds).toEqual([ids['pac']]);
    expect(line!.depth).toBe(2);
    expect(line!.ancestorIds).toEqual([ids['pac'], ids['herzog']]);
  });

  it('findSubtreeIds tra ve ca nhanh KE CA chinh no', async () => {
    const sub = await daos.brands.findSubtreeIds(ids['pac']!);
    expect(sub.sort()).toEqual([ids['pac'], ids['herzog'], ids['isl'], ids['line']].sort());
    expect(await daos.brands.findSubtreeIds(ids['line']!)).toEqual([ids['line']]);
  });

  it('findAncestors tra ve breadcrumb dung thu tu bang MOT truy van', async () => {
    const anc = await daos.brands.findAncestors(ids['line']!);
    expect(anc.map((a) => a.id)).toEqual([ids['pac'], ids['herzog']]);
    expect(anc.map((a) => a.depth)).toEqual([0, 1]);
  });

  it('CHUYEN CHA cap nhat dung ca nhanh con', async () => {
    // herzog (cung ca 'line' ben duoi) chuyen tu duoi pac sang duoi isl
    await daos.transaction(async (tx) => {
      await tx.brands.moveNode(ids['herzog']!, ids['isl']!);
    });

    const herzog = await daos.brands.findById(ids['herzog']!);
    const line = await daos.brands.findById(ids['line']!);

    expect(herzog!.parentId).toBe(ids['isl']);
    expect(herzog!.depth).toBe(2);
    expect(herzog!.ancestorIds).toEqual([ids['pac'], ids['isl']]);

    // Con chau PHAI duoc tinh lai theo — day la cho de sai nhat
    expect(line!.depth).toBe(3);
    expect(line!.ancestorIds).toEqual([ids['pac'], ids['isl'], ids['herzog']]);

    // Va cay van toan ven
    expect(await daos.brands.findInconsistentNodes()).toEqual([]);
  });

  it('chuyen len lam GOC cung dung', async () => {
    await daos.transaction(async (tx) => {
      await tx.brands.moveNode(ids['herzog']!, null);
    });
    const herzog = await daos.brands.findById(ids['herzog']!);
    const line = await daos.brands.findById(ids['line']!);
    expect(herzog!.depth).toBe(0);
    expect(herzog!.ancestorIds).toEqual([]);
    expect(line!.depth).toBe(1);
    expect(line!.ancestorIds).toEqual([ids['herzog']]);
    expect(await daos.brands.findInconsistentNodes()).toEqual([]);
  });

  it('CHAN vong lap: khong cho chuyen nut vao duoi nhanh cua chinh no', async () => {
    await expect(
      daos.transaction((tx) => tx.brands.moveNode(ids['herzog']!, ids['line']!)),
    ).rejects.toThrow(TreeCycleError);
    // Va khong de lai thay doi nao
    expect(await daos.brands.findInconsistentNodes()).toEqual([]);
  });

  it('CHAN tu lam cha cua chinh minh', async () => {
    await expect(
      daos.transaction((tx) => tx.brands.moveNode(ids['pac']!, ids['pac']!)),
    ).rejects.toThrow(TreeCycleError);
  });

  it('slug dang dung thi bi tu choi', async () => {
    expect(await daos.brands.isSlugAvailable(`${tag}-pac`)).toBe(false);
    expect(await daos.brands.isSlugAvailable(`${tag}-chua-ai-dung`)).toBe(true);
    await expect(daos.brands.assertSlugAvailable(`${tag}-pac`)).rejects.toThrow(SlugTakenError);
  });

  it('slug cua noi dung DA XOA MEM van bi giu (ADR-002 muc 3)', async () => {
    const tmp = await mk('tam', null);
    await daos.brands.softDelete(tmp.id, new Date());
    expect(await daos.brands.findById(tmp.id)).toBeNull();      // khong con thay
    expect(await daos.brands.isSlugAvailable(tmp.slug)).toBe(false); // nhung slug van bi giu
  });

  it('first_published_at set DUNG MOT LAN, republish khong ghi de', async () => {
    const b = await mk('pub', null);
    const t1 = new Date('2026-01-01T00:00:00Z');
    await daos.brands.publish(b.id, t1);
    const after1 = await daos.brands.findById(b.id);
    expect(after1!.firstPublishedAt?.toISOString()).toBe(t1.toISOString());

    await daos.brands.unpublish(b.id);
    const t2 = new Date('2026-06-01T00:00:00Z');
    await daos.brands.publish(b.id, t2);
    const after2 = await daos.brands.findById(b.id);
    expect(after2!.publishedAt?.toISOString()).toBe(t2.toISOString());       // doi
    expect(after2!.firstPublishedAt?.toISOString()).toBe(t1.toISOString());  // KHONG doi
  });

  it('canHardDelete tu choi noi dung da tung cong khai', async () => {
    const chuaPub = await mk('chua-pub', null);
    expect(await daos.brands.canHardDelete(chuaPub.id)).toBe(true);
    await daos.brands.publish(chuaPub.id, new Date());
    expect(await daos.brands.canHardDelete(chuaPub.id)).toBe(false);
  });

  it('list phan trang tra ve meta dung', async () => {
    const r = await daos.brands.list({}, { page: 1, pageSize: 2 });
    expect(r.data.length).toBeLessThanOrEqual(2);
    expect(r.meta.pageSize).toBe(2);
    expect(r.meta.totalItems).toBeGreaterThan(0);
  });

  it('pageSize bi chan tran o 100', async () => {
    const r = await daos.brands.list({}, { page: 1, pageSize: 9999 });
    expect(r.meta.pageSize).toBe(100);
  });
});
