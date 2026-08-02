import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { resetMediaFkCache } from '../src/dao/media/dao.js';
import { RedirectLoopError } from '../src/dao/redirects/object.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('MediaDao + RedirectDao tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  const tag = `d2-${Date.now()}`;

  const upload = (name: string, over: Record<string, unknown> = {}) =>
    daos.media.insert({
      fileName: `${tag}-${name}.jpg`,
      // Chua `tag` de bo loc `search` khoanh dung du lieu cua lan chay nay.
      // `search` doi chieu original_name/title/alt_text — KHONG doi chieu
      // file_name, vi file_name la ten do he thong sinh, nguoi dung khong nho.
      originalName: `${tag}-${name} goc.jpg`,
      storageClass: 'public',
      storagePath: `public-media/${tag}/${name}.jpg`,
      mimeType: 'image/jpeg',
      fileExtension: 'jpg',
      fileSize: 123_456,
      ...over,
    });

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, options: '-c search_path=ltv,public' });
    daos = createDaoManager(createKysely(pool));
    resetMediaFkCache();
  });
  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.brands WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.media WHERE file_name LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.redirects WHERE source_path LIKE $1`, [`/${tag}%`]);
    await pool.end();
  });

  // ── media ──────────────────────────────────────────────────────
  it('insert va doc lai giu nguyen gia tri', async () => {
    const m = await upload('a', { width: 1200, height: 800, altText: 'may cat OptiDist' });
    const back = await daos.media.findById(m.id);
    expect(back!.storageClass).toBe('public');
    expect(back!.fileSize).toBe(123_456);       // BIGINT ve dung so, khong phai chuoi
    expect(typeof back!.fileSize).toBe('number');
    expect(back!.width).toBe(1200);
    expect(back!.variants).toEqual({});
  });

  it('findManyByIds lay N anh bang MOT truy van', async () => {
    const a = await upload('b1');
    const b = await upload('b2');
    const got = await daos.media.findManyByIds([a.id, b.id, crypto.randomUUID()]);
    expect(got.map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
    expect(await daos.media.findManyByIds([])).toEqual([]);   // khong ban truy van rong
  });

  it('setVariants ghi va doc lai duoc; gia tri la se bi loai', async () => {
    const m = await upload('c');
    await daos.media.setVariants(m.id, { thumb: 'p/t.jpg', large: 'p/l.jpg' });
    expect((await daos.media.findById(m.id))!.variants).toEqual({
      thumb: 'p/t.jpg', large: 'p/l.jpg',
    });
    // JSONB tu do: hinh dang la phai bi mapper loai, khong duoc lot len tren
    await pool.query(`UPDATE ltv.media SET variants = '{"thumb": 5}'::jsonb WHERE id = $1`, [m.id]);
    expect((await daos.media.findById(m.id))!.variants).toEqual({});
  });

  it('update CHI sua sieu du lieu, khong dung toi tep', async () => {
    const m = await upload('d');
    const after = await daos.media.update(m.id, { altText: 'moi', title: 'Tieu de' });
    expect(after.altText).toBe('moi');
    expect(after.storagePath).toBe(m.storagePath);
    expect(after.checksum).toBe(m.checksum);
  });

  it('findByChecksum tim duoc tep trung', async () => {
    const sum = `sha256-${tag}`;
    const m = await upload('e', { checksum: sum });
    expect((await daos.media.findByChecksum(sum))!.id).toBe(m.id);
    expect(await daos.media.findByChecksum('khong-co')).toBeNull();
  });

  it('loc theo ho MIME va tim theo ten', async () => {
    await upload('f', { mimeType: 'application/pdf', fileExtension: 'pdf' });
    const anh = await daos.media.list({ mimeGroup: 'image', search: tag }, { pageSize: 100 });
    expect(anh.data.every((x) => x.mimeType.startsWith('image/'))).toBe(true);
    const pdf = await daos.media.list({ mimeGroup: 'application', search: tag }, { pageSize: 100 });
    expect(pdf.data).toHaveLength(1);
    // meta.totalItems phai dem tren CUNG bo loc, khong phai tong bang
    expect(pdf.meta.totalItems).toBe(1);
  });

  it('`%` trong tu khoa tim la ky tu thuong, khong phai dai dien', async () => {
    const r = await daos.media.list({ search: '%' }, { pageSize: 5 });
    expect(r.meta.totalItems).toBe(0);
  });

  it('xoa mem thi bien khoi ket qua, khoi phuc thi hien lai', async () => {
    const m = await upload('g');
    await daos.media.softDelete(m.id, new Date());
    expect(await daos.media.findById(m.id)).toBeNull();
    expect(
      (await daos.media.list({ search: `${tag}-g `, includeDeleted: true })).meta.totalItems,
    ).toBe(1);
    await daos.media.restore(m.id);
    expect(await daos.media.findById(m.id)).not.toBeNull();
  });

  it('LO HONG A4 — countReferences doc tu catalog, khong bo sot bang nao', async () => {
    const logo = await upload('logo');
    expect(await daos.media.countReferences(logo.id)).toBe(0);

    // Tham chieu qua KHOA NGOAI
    const b = await daos.brands.insert({
      brandType: 'manufacturer', name: `${tag}-ref`, slug: `${tag}-ref`, logoId: logo.id,
    });
    expect(await daos.media.countReferences(logo.id)).toBe(1);

    // Tham chieu qua KHOI JSONB (content_media_refs) — nguon thu hai
    await pool.query(
      `INSERT INTO ltv.content_media_refs (media_id, entity_type, entity_id, field_name)
       VALUES ($1, 'brand', $2, 'overview')`,
      [logo.id, b.id],
    );
    expect(await daos.media.countReferences(logo.id)).toBe(2);

    await pool.query(`DELETE FROM ltv.content_media_refs WHERE media_id = $1`, [logo.id]);
  });

  it('cau hoi catalog tim duoc ca 22 cot khoa ngoai tro toi media', async () => {
    const r = await pool.query<{ n: string }>(`
      SELECT COUNT(*) AS n FROM pg_constraint con
      JOIN pg_class tgt ON tgt.oid = con.confrelid
      JOIN pg_class src ON src.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = src.relnamespace
      WHERE con.contype='f' AND tgt.relname='media' AND ns.nspname='ltv'`);
    expect(Number(r.rows[0]!.n)).toBe(22);
  });

  it('ung vien don dep: da xoa mem du lau va chua purge', async () => {
    const m = await upload('purge');
    const longAgo = new Date(Date.now() - 90 * 86_400_000);
    await daos.media.softDelete(m.id, longAgo);
    const cands = await daos.media.findPurgeCandidates(new Date(Date.now() - 30 * 86_400_000), 50);
    expect(cands.map((x) => x.id)).toContain(m.id);

    await daos.media.markPurged(m.id, new Date());
    const after = await daos.media.findPurgeCandidates(new Date(Date.now() - 30 * 86_400_000), 50);
    expect(after.map((x) => x.id)).not.toContain(m.id);  // khong don hai lan
  });

  // ── redirects ──────────────────────────────────────────────────
  it('chi tra ve ban ghi active', async () => {
    const r = await daos.redirects.upsert({ sourcePath: `/${tag}/cu`, targetPath: `/${tag}/moi` });
    expect((await daos.redirects.findActiveBySource(`/${tag}/cu`))!.redirectType).toBe(301);
    await daos.redirects.update(r.id, { status: 'disabled' });
    expect(await daos.redirects.findActiveBySource(`/${tag}/cu`)).toBeNull();
  });

  it('GOP CHUOI — doi slug lan hai van chi mot chang', async () => {
    const A = `/${tag}/a`, B = `/${tag}/b`, C = `/${tag}/c`;
    await daos.transaction((tx) => tx.redirects.createCollapsingChain({ sourcePath: A, targetPath: B }));
    await daos.transaction((tx) => tx.redirects.createCollapsingChain({ sourcePath: B, targetPath: C }));

    // A phai tro THANG toi C, khong phai qua B
    expect((await daos.redirects.findActiveBySource(A))!.targetPath).toBe(C);
    expect((await daos.redirects.findActiveBySource(B))!.targetPath).toBe(C);
  });

  it('GOP CHUOI — dich da la source thi di thang toi cuoi', async () => {
    const X = `/${tag}/x`, Y = `/${tag}/y`, Z = `/${tag}/z`;
    await daos.redirects.upsert({ sourcePath: Y, targetPath: Z });
    // Tao X -> Y, ma Y da tro toi Z: phai luu thang X -> Z
    await daos.transaction((tx) => tx.redirects.createCollapsingChain({ sourcePath: X, targetPath: Y }));
    expect((await daos.redirects.findActiveBySource(X))!.targetPath).toBe(Z);
  });

  it('CHAN vong lap: A -> B roi B -> A', async () => {
    const A = `/${tag}/p`, B = `/${tag}/q`;
    await daos.redirects.upsert({ sourcePath: A, targetPath: B });
    await expect(
      daos.transaction((tx) => tx.redirects.createCollapsingChain({ sourcePath: B, targetPath: A })),
    ).rejects.toThrow(RedirectLoopError);
  });

  it('CHAN tro ve chinh minh', async () => {
    const S = `/${tag}/self`;
    await expect(daos.redirects.upsert({ sourcePath: S, targetPath: S })).rejects.toThrow(RedirectLoopError);
  });

  it('findLoops khong bao dong gia tren du lieu sach', async () => {
    expect(await daos.redirects.findLoops()).toEqual([]);
  });

  it('nhap hang loat bo qua source da co, khong lam hong cai cu', async () => {
    const rows = [
      { sourcePath: `/${tag}/m1.aspx`, targetPath: `/${tag}/m1` },
      { sourcePath: `/${tag}/m2.aspx`, targetPath: `/${tag}/m2` },
      { sourcePath: `/${tag}/m2.aspx`, targetPath: `/${tag}/khac` },  // trung trong cung lo
    ];
    const n = await daos.redirects.bulkInsert(rows.slice(0, 2));
    expect(n).toBe(2);
    const again = await daos.redirects.bulkInsert([rows[1]!, rows[2]!]);
    expect(again).toBe(0);
    expect((await daos.redirects.findActiveBySource(`/${tag}/m2.aspx`))!.targetPath).toBe(`/${tag}/m2`);
  });

  it('recordHit tang tai cho — hai lan goi cung luc khong mat dem', async () => {
    const r = await daos.redirects.upsert({ sourcePath: `/${tag}/hit`, targetPath: `/${tag}/dich` });
    await Promise.all(Array.from({ length: 10 }, () => daos.redirects.recordHit(r.id, new Date())));
    const after = await daos.redirects.findById(r.id);
    expect(after!.hitCount).toBe(10);
    expect(after!.lastHitAt).not.toBeNull();
  });

  it('ROLLBACK: doi slug that bai thi KHONG con redirect mo coi', async () => {
    const S = `/${tag}/rb`;
    await expect(
      daos.transaction(async (tx) => {
        await tx.redirects.upsert({ sourcePath: S, targetPath: `/${tag}/rb-moi` });
        throw new Error('doi slug that bai o buoc sau');
      }),
    ).rejects.toThrow('doi slug that bai');
    // Day chinh la kich ban ADR-002 so nhat, nhung nguoc lai:
    // redirect da tao ma slug chua doi.
    expect(await daos.redirects.findActiveBySource(S)).toBeNull();
  });
});
