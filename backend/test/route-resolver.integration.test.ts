import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from '@ltv/db';
import { createTestPool } from '@ltv/testing';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { RouteResolverImpl, type RedirectDaos } from '../src/services/redirects/service.js';

/**
 * ROUTE RESOLVER — ket luan cua spike P0 dua vao duong chay that.
 *
 * Spike da chung minh Next.js phat duoc 301 THAT (18 byte) neu no goi mot
 * resolver. Cai spike gia lap la CHINH resolver do; day la ban that.
 */
const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('RouteResolver tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  const tag = `rr-${Date.now()}`;
  const suKien: { event: string; fields: Record<string, unknown> }[] = [];
  let rs: RouteResolverImpl;

  const p = (s: string) => `/${tag}${s}`;

  beforeAll(async () => {
    pool = createTestPool(url!);
    daos = createDaoManager(createKysely(pool));
    rs = new RouteResolverImpl(daos as unknown as RedirectDaos, (event, fields) =>
      suKien.push({ event, fields }),
    );
    await pool.query(`DELETE FROM ltv.redirects WHERE source_path LIKE $1`, [`/${tag}%`]);
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.redirects WHERE source_path LIKE $1`, [`/${tag}%`]);
    await pool.end();
  });

  /** Chen THANG, khong qua `createCollapsingChain` — de dung duoc chuoi that. */
  const chenTho = async (source: string, target: string, type: 301 | 302 = 301): Promise<void> => {
    await pool.query(
      `INSERT INTO ltv.redirects (source_path, target_path, redirect_type, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (source_path) DO UPDATE SET target_path = $2, redirect_type = $3`,
      [source, target, type],
    );
  };

  it('khong co luat nao -> `content`, de trang tu quyet dinh 404', async () => {
    /**
     * KHONG tra `not_found`. Resolver khong biet mot slug co ton tai hay khong,
     * va di tim thi phai truy van moi bang co slug o DUONG NONG, cho MOI yeu
     * cau — de tra loi mot cau ma trang se tu tra loi khi no lay du lieu.
     */
    expect(await rs.resolve(p('/khong-co-luat-nao'))).toEqual({ kind: 'content' });
  });

  it('co luat -> 301 va dich dung', async () => {
    await chenTho(p('/old-product.aspx'), p('/products/optidist'));
    expect(await rs.resolve(p('/old-product.aspx'))).toEqual({
      kind: 'redirect',
      status: 301,
      target: p('/products/optidist'),
    });
  });

  it('302 duoc giu nguyen, KHONG bi doi thanh 301', async () => {
    // 301 va 302 la hai y nghia khac nhau. Gom lai thi mot chuyen huong tam
    // thoi se bi trinh duyet va Google nho VINH VIEN.
    await chenTho(p('/tam-thoi'), p('/dich-tam'), 302);
    expect(await rs.resolve(p('/tam-thoi'))).toMatchObject({ status: 302 });
  });

  it('KHONG PHAN BIET HOA THUONG — day la ly do bang nay ton tai', async () => {
    /**
     * IIS mac dinh khong phan biet hoa thuong, nen cung mot trang `.aspx` cu co
     * the da duoc lien ket bang nhieu cach viet. So khop chinh xac chi cuu duoc
     * mot cach; cach con lai tra 404 va gia tri backlink do mat han.
     *
     * Dua vao chi muc ham `idx_redirects_source_lower` (migration 034).
     */
    await chenTho(p('/products/optidist.aspx'), p('/products/optidist'));
    for (const bien of [
      p('/products/optidist.aspx'),
      p('/Products/OptiDist.aspx'),
      p('/PRODUCTS/OPTIDIST.ASPX'),
    ]) {
      expect(await rs.resolve(bien), bien).toMatchObject({ kind: 'redirect' });
    }
  });

  it('dau `/` o cuoi khong lam mat chuyen huong', async () => {
    await chenTho(p('/gioi-thieu'), p('/about'));
    expect(await rs.resolve(p('/gioi-thieu/'))).toMatchObject({ kind: 'redirect' });
    expect(await rs.resolve(p('/gioi-thieu//'))).toMatchObject({ kind: 'redirect' });
  });

  it('CHUOI: A -> B -> C giai TRUC TIEP ve C, va phat canh bao', async () => {
    /**
     * `createCollapsingChain` go chuoi o duong GHI, nen vong lap trong resolver
     * le ra chi chay mot lan. Nhung HAI duong ghi khong di qua ham do: `upsert`
     * va `bulkInsert` (nhap ~200 URL cu). Mot lan nhap co the tao `A -> B` khi
     * `B -> C` da ton tai.
     *
     * Google tinh chuoi la mat gia tri truyen qua; qua ba chang thi co the bo
     * qua han. Nen resolver go o duong doc — VA phat canh bao, vi chuoi la dau
     * hieu duong GHI da lam sai va phai duoc sua o do.
     */
    suKien.length = 0;
    await chenTho(p('/chain-a'), p('/chain-b'));
    await chenTho(p('/chain-b'), p('/chain-c'));
    expect(await rs.resolve(p('/chain-a'))).toEqual({
      kind: 'redirect',
      status: 301,
      target: p('/chain-c'),
    });
    expect(suKien.map((s) => s.event)).toContain('redirect_chain_collapsed');
  });

  it('VONG LAP khong lam treo, va phat canh bao', async () => {
    /**
     * `findLoops()` tim vong trong mot lenh kiem dinh ky, nhung o duong nong thi
     * phai tu bao ve: mot ban ghi sai KHONG duoc lam treo moi yeu cau.
     */
    suKien.length = 0;
    await chenTho(p('/vong-a'), p('/vong-b'));
    await chenTho(p('/vong-b'), p('/vong-a'));
    const r = await rs.resolve(p('/vong-a'));
    expect(r.kind).toBe('redirect');
    expect(suKien.map((s) => s.event)).toContain('redirect_loop_detected');
  });

  it('ban ghi `disabled` coi nhu KHONG ton tai', async () => {
    await chenTho(p('/da-tat'), p('/dich'));
    await pool.query(`UPDATE ltv.redirects SET status='disabled' WHERE source_path=$1`, [
      p('/da-tat'),
    ]);
    expect(await rs.resolve(p('/da-tat'))).toEqual({ kind: 'content' });
  });

  it('DUONG NONG: truong hop khong-co-redirect dung DUNG MOT truy van', async () => {
    /**
     * Day la ngan sach, khong phai mong muon. Resolver duoc goi cho MOI yeu cau
     * cua trang, nen truong hop PHO BIEN NHAT — khong co redirect nao — phai la
     * mot truy van.
     *
     * Ban dau toi tinh lam "thu chinh xac, khong thay thi thu chu thuong". Do la
     * HAI truy van o dung truong hop pho bien nhat, tuc lam cham moi trang binh
     * thuong de phuc vu mot truong hop hiem. Chi muc ham (034) cho mot truy van
     * lo ca hai.
     */
    /**
     * Dem qua `log` cua Kysely, KHONG qua `pool.query`.
     *
     * Ban dau toi boc `pool.query` va dem duoc 0 — Kysely goi `pool.connect()`
     * roi `client.query()`, nen ham bi boc khong bao gio chay. Phep do cho ket
     * qua "0 truy van", va neu toi khang dinh `<= 1` thay vi `=== 1` thi no da
     * XANH ma khong do gi ca.
     */
    let dem = 0;
    const db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
      log: (e) => {
        if (e.level === 'query') dem += 1;
      },
    });
    const rs2 = new RouteResolverImpl(
      createDaoManager(db) as unknown as RedirectDaos,
    );
    await rs2.resolve(p('/hoan-toan-khong-co'));
    expect(dem).toBe(1);

    // Va truong hop CO redirect mot chang: dung hai truy van (tim + tim tiep).
    dem = 0;
    await rs2.resolve(p('/old-product.aspx'));
    expect(dem).toBe(2);
  });

  it('chi muc ham THAT SU duoc dung — doc EXPLAIN, khong doan', async () => {
    /**
     * Bieu thuc trong truy van phai GIONG HET bieu thuc trong chi muc, neu khong
     * PostgreSQL quet toan bang MA KHONG BAO GI. Voi vai chuc hang thi khong ai
     * thay; voi ~200 URL cu tren duong nong thi van khong ai thay — cho den khi
     * bang lon len.
     *
     * `SET enable_seqscan = off` de buoc bo lap ke hoach uu tien chi muc: tren
     * bang nho no luon chon quet tuan tu vi do that su nhanh hon, nen khong tat
     * thi phep kiem nay khong noi len dieu gi.
     */
    /**
     * `SET LOCAL` CHI co hieu luc TRONG mot transaction block.
     *
     * Ban dau toi goi `SET LOCAL enable_seqscan = off` tren mot ket noi lay tu
     * pool ma KHONG mo transaction. PostgreSQL coi do la khong lam gi (canh bao
     * "SET LOCAL can only be used in transaction blocks"), nen bo lap ke hoach
     * van tu do chon `Seq Scan` — va bai kiem do voi mot ke hoach dung:
     *
     *   Seq Scan on redirects  (cost=0.00..2.05 rows=1 width=194)
     *
     * Dang chu y: no XANH o lan chay dau. Luc do bang tinh co co nhieu hang hon
     * nen index scan re hon, va phep kiem "dung" vi mot ly do khong lien quan
     * den dieu no khang dinh. Cung ho voi loi `pool.query('BEGIN')` o F-1d: toi
     * gia dinh pham vi cua mot cau lenh thay vi kiem no.
     *
     * `BEGIN` ... `ROLLBACK` tuong minh tren CUNG mot ket noi thi `SET LOCAL`
     * that su ap, va no tu het hieu luc khi rollback.
     */
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query('SET LOCAL enable_seqscan = off');
      // Xac nhan tham so DA doi — neu khong thi ke hoach duoi khong noi len gi.
      const { rows: ss } = await c.query<{ enable_seqscan: string }>('SHOW enable_seqscan');
      expect(ss[0]!.enable_seqscan, 'SET LOCAL khong co hieu luc').toBe('off');

      const { rows } = await c.query<{ 'QUERY PLAN': string }>(
        `EXPLAIN SELECT * FROM ltv.redirects
         WHERE lower(source_path) = lower($1) AND status = 'active'`,
        [p('/products/optidist.aspx')],
      );
      const ke = rows.map((r) => r['QUERY PLAN']).join('\n');
      expect(ke, ke).toMatch(/idx_redirects_source_lower/);
    } finally {
      await c.query('ROLLBACK');
      c.release();
    }
  });

  it('chi muc la UNIQUE — hai source khac nhau hoa thuong bi chan', async () => {
    /**
     * Neu cho phep ca `/A` va `/a` thi resolver phai CHON mot trong hai, va lua
     * chon do khong xac dinh. Chan o tang DB thi su nhap nhang khong bao gio ton
     * tai — tot hon la chon im lang.
     */
    await chenTho(p('/Trung-Hoa-Thuong'), p('/dich-1'));
    await expect(
      pool.query(
        `INSERT INTO ltv.redirects (source_path, target_path, redirect_type, status)
         VALUES ($1, $2, 301, 'active')`,
        [p('/trung-hoa-thuong'), p('/dich-2')],
      ),
    ).rejects.toThrow();
  });
});
