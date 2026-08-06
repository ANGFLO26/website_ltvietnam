import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { ROUTES, buildReservedPaths } from '@ltv/contracts';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { SlugServiceImpl } from '../src/services/shared/slug.service.js';
import { ConflictError } from '../src/shared/errors.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

// ══════════════ Test KHONG can database ══════════════

/**
 * ADR-002 muc 8 ghi ro: "Bat buoc co test doi chieu tap bao luu voi bang
 * route; test fail khi hai ben lech nhau."
 *
 * Day la bai kiem do. No khong can database vi ca hai ben deu la hang so
 * trong ma nguon — va do la diem manh: no chay trong 1ms va chan duoc mot
 * lop loi ma khong test tich hop nao bat duoc.
 */
describe('ADR-002 muc 8C — tap route bao luu doi chieu voi bang route', () => {
  const reserved = buildReservedPaths();

  it('MOI doan cap 1 cua moi route deu nam trong tap bao luu', () => {
    const missing: string[] = [];
    for (const route of ROUTES) {
      const first = route.path.split('/').filter(Boolean)[0];
      if (!first || first.startsWith(':')) continue;
      if (!reserved.has(`/${first}`)) missing.push(`/${first} (route ${route.key})`);
      if (route.localized && !reserved.has(`/vi/${first}`)) {
        missing.push(`/vi/${first} (route ${route.key})`);
      }
    }
    expect(missing, `Doan route thieu trong tap bao luu:\n${missing.join('\n')}`).toEqual([]);
  });

  it('nhung duong dan da tung bi bo sot o v1.2.1 gio deu co', () => {
    // Danh sach cu viet tay va chi co tieng Viet — thieu `/brands`, `/about`
    // va toan bo doan tieng Anh. Mot slug ten `products` da co the tao ra
    // `/products` de len trang danh sach san pham.
    for (const p of ['/products', '/brands', '/about', '/services', '/news', '/resources']) {
      expect(reserved.has(p), `thieu ${p}`).toBe(true);
    }
  });

  it('co ca tien to ky thuat', () => {
    for (const p of ['/api', '/admin', '/media', '/health', '/_next', '/static']) {
      expect(reserved.has(p), `thieu ${p}`).toBe(true);
    }
  });

  it('doan cap 2 cung duoc bao luu', () => {
    for (const p of ['/products/all', '/products/category', '/news/category']) {
      expect(reserved.has(p), `thieu ${p}`).toBe(true);
    }
  });
});

// ══════════════ Test tren PostgreSQL that ══════════════

run('SlugService — kiem ba nguon tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  let slugs: SlugServiceImpl;
  const tag = `sl-${Date.now()}`;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, options: '-c search_path=ltv,public' });
    daos = createDaoManager(createKysely(pool));
    slugs = new SlugServiceImpl(daos);
  });
  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.redirects WHERE source_path LIKE $1`, [`%${tag}%`]);
    await pool.query(`DELETE FROM ltv.brands WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.products WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.end();
  });

  const mkBrand = async (slug: string) =>
    daos.brands.insert({ brandType: 'manufacturer', name: slug, slug });

  // ── duong dan day du, khong phai chuoi slug ──

  it('kiem DUONG DAN DAY DU, khong phai chuoi slug tran', () => {
    expect(slugs.publicPath('product', 'optidist')).toBe('/products/optidist');
    expect(slugs.publicPath('brand', 'herzog')).toBe('/brands/herzog');
    expect(slugs.publicPath('post_category', 'tin-tuc')).toBe('/news/category/tin-tuc');
  });

  it('nhom co ban dich mang tien to locale, nhom mot ngon ngu thi khong', () => {
    expect(slugs.publicPath('service', 'hieu-chuan', 'en')).toBe('/services/hieu-chuan');
    expect(slugs.publicPath('service', 'hieu-chuan', 'vi')).toBe('/vi/services/hieu-chuan');
    // San pham khong co ban dich (ADR-014) — khong co bien the `/vi`
    expect(slugs.publicPath('product', 'optidist', 'vi')).toBe('/products/optidist');
  });

  // ── (C) route he thong ──

  it('(C) slug trung route he thong bi tu choi', async () => {
    // `/products/all` la trang danh sach. Mot san pham ten `all` se de len no.
    const r = await slugs.check({ entity: 'product', slug: 'all' });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.code).toBe('SLUG_RESERVED');
    expect(!r.ok && r.path).toBe('/products/all');
  });

  it('(C) `category` la doan route, khong dung lam slug san pham duoc', async () => {
    const r = await slugs.check({ entity: 'product', slug: 'category' });
    expect(!r.ok && r.code).toBe('SLUG_RESERVED');
  });

  it('(C) nhung slug KHONG trung route thi qua duoc', async () => {
    const r = await slugs.check({ entity: 'product', slug: `${tag}-optidist` });
    expect(r.ok).toBe(true);
  });

  it('(C) kiem TRUOC khi cham database — khong ton truy van nao', async () => {
    // Neu doi thu tu (hoi DB truoc, kiem route sau) thi moi lan nguoi soan
    // thao go nham mot tu khoa he thong deu ton hai truy van.
    let n = 0;
    const counting = createDaoManager(
      new (await import('kysely')).Kysely({
        dialect: new (await import('kysely')).PostgresDialect({ pool }),
        log: (e) => { if (e.level === 'query') n++; },
      }),
    );
    const s = new SlugServiceImpl(counting);
    await s.check({ entity: 'product', slug: 'all' });
    expect(n, 'kiem route bao luu khong duoc cham database').toBe(0);
  });

  // ── (A) slug hien tai ──

  it('(A) slug dang duoc dung bi tu choi', async () => {
    await mkBrand(`${tag}-pac`);
    const r = await slugs.check({ entity: 'brand', slug: `${tag}-pac` });
    expect(!r.ok && r.code).toBe('SLUG_IN_USE');
  });

  it('(A) `exceptId` cho phep luu lai chinh minh ma khong doi slug', async () => {
    const b = await mkBrand(`${tag}-tu-minh`);
    expect((await slugs.check({ entity: 'brand', slug: b.slug })).ok).toBe(false);
    expect((await slugs.check({ entity: 'brand', slug: b.slug, exceptId: b.id })).ok).toBe(true);
  });

  it('(A) noi dung XOA MEM van giu slug, va thong bao PHAN BIET duoc', async () => {
    const b = await mkBrand(`${tag}-da-xoa`);
    await daos.brands.softDelete(b.id, new Date());

    const r = await slugs.check({ entity: 'brand', slug: b.slug });
    expect(r.ok).toBe(false);
    // Khong phai `SLUG_IN_USE`: nguoi soan thao nhin vao danh sach khong thay
    // hang nao ten do, nen "dang duoc dung" se lam ho tuong he thong sai.
    expect(!r.ok && r.code).toBe('SLUG_SOFT_DELETED');
  });

  // ── (B) redirects ──

  it('(B) duong dan tung nam trong redirects bi tu choi', async () => {
    await daos.redirects.upsert({
      sourcePath: `/products/${tag}-cu`, targetPath: `/products/${tag}-moi`,
    });
    const r = await slugs.check({ entity: 'product', slug: `${tag}-cu` });
    expect(!r.ok && r.code).toBe('SLUG_IN_REDIRECTS');
  });

  it('(B) redirect da tat thi khong chan nua', async () => {
    const red = await daos.redirects.upsert({
      sourcePath: `/products/${tag}-tat`, targetPath: `/products/${tag}-dich`,
    });
    expect((await slugs.check({ entity: 'product', slug: `${tag}-tat` })).ok).toBe(false);
    await daos.redirects.update(red.id, { status: 'disabled' });
    expect((await slugs.check({ entity: 'product', slug: `${tag}-tat` })).ok).toBe(true);
  });

  it('(B) redirect cua NHOM KHAC khong chan — kiem theo duong dan day du', async () => {
    await daos.redirects.upsert({
      sourcePath: `/news/${tag}-bai`, targetPath: `/news/${tag}-bai-moi`,
    });
    // Cung chuoi slug nhung khac tien to -> khac duong dan -> khong va cham
    expect((await slugs.check({ entity: 'product', slug: `${tag}-bai` })).ok).toBe(true);
  });

  // ── dinh dang ──

  it('slug sai dinh dang bi tu choi truoc moi thu khac', async () => {
    for (const bad of ['Chu-Hoa', 'co dau cach', '-dau-gach', 'gach-cuoi-', 'hai--gach', '']) {
      const r = await slugs.check({ entity: 'product', slug: bad });
      expect(r.ok, `"${bad}" le ra phai bi tu choi`).toBe(false);
      expect(!r.ok && r.code).toBe('SLUG_INVALID');
    }
  });

  it('assertAvailable nem ConflictError kem duong dan va ly do', async () => {
    await expect(slugs.assertAvailable({ entity: 'product', slug: 'all' }))
      .rejects.toThrow(ConflictError);
    try {
      await slugs.assertAvailable({ entity: 'product', slug: 'all' });
    } catch (e) {
      const err = e as ConflictError;
      expect(err.code).toBe('SLUG_RESERVED');
      expect(err.details).toMatchObject({ path: '/products/all', reason: 'reserved_route' });
    }
  });

  // ── DOI SLUG ──

  it('doi slug DA PUBLISH: cap nhat VA tao redirect trong mot transaction', async () => {
    const b = await mkBrand(`${tag}-cu-ten`);
    await daos.brands.publish(b.id, new Date());

    const r = await slugs.rename({
      entity: 'brand', id: b.id, currentSlug: b.slug, slug: `${tag}-ten-moi`,
      wasEverPublished: true,
    });

    expect(r.oldPath).toBe(`/brands/${tag}-cu-ten`);
    expect(r.newPath).toBe(`/brands/${tag}-ten-moi`);
    expect((await daos.brands.findById(b.id))!.slug).toBe(`${tag}-ten-moi`);

    const red = await daos.redirects.findActiveBySource(r.oldPath);
    expect(red, 'PHAI co redirect — thieu no thi moi lien ket cu chet').not.toBeNull();
    expect(red!.targetPath).toBe(r.newPath);
    expect(red!.redirectType).toBe(301);
  });

  it('doi slug CHUA TUNG publish: khong tao redirect', async () => {
    const b = await mkBrand(`${tag}-nhap-cu`);
    const r = await slugs.rename({
      entity: 'brand', id: b.id, currentSlug: b.slug, slug: `${tag}-nhap-moi`,
      wasEverPublished: false,
    });
    // Chua ai co lien ket toi ban nhap — tao redirect chi lam ban bang
    expect(await daos.redirects.findActiveBySource(r.oldPath)).toBeNull();
    expect((await daos.brands.findById(b.id))!.slug).toBe(`${tag}-nhap-moi`);
  });

  it('doi slug DOI LAN HAI van chi mot chang 301', async () => {
    const b = await mkBrand(`${tag}-v1`);
    await daos.brands.publish(b.id, new Date());
    await slugs.rename({
      entity: 'brand', id: b.id, currentSlug: `${tag}-v1`, slug: `${tag}-v2`,
      wasEverPublished: true,
    });
    await slugs.rename({
      entity: 'brand', id: b.id, currentSlug: `${tag}-v2`, slug: `${tag}-v3`,
      wasEverPublished: true,
    });

    // v1 phai tro THANG toi v3, khong phai qua v2 (gop chuoi)
    const v1 = await daos.redirects.findActiveBySource(`/brands/${tag}-v1`);
    expect(v1!.targetPath).toBe(`/brands/${tag}-v3`);
  });

  it('doi sang slug DA BI CHIEM thi tu choi, va KHONG dong toi du lieu', async () => {
    const a = await mkBrand(`${tag}-giu-cho`);
    const b = await mkBrand(`${tag}-muon-doi`);
    await daos.brands.publish(b.id, new Date());

    await expect(
      slugs.rename({
        entity: 'brand', id: b.id, currentSlug: b.slug, slug: a.slug, wasEverPublished: true,
      }),
    ).rejects.toThrow(ConflictError);

    // Slug cu con nguyen, va khong co redirect mo coi nao duoc tao
    expect((await daos.brands.findById(b.id))!.slug).toBe(`${tag}-muon-doi`);
    expect(await daos.redirects.findActiveBySource(`/brands/${tag}-muon-doi`)).toBeNull();
  });

  it('doi sang CHINH slug hien tai la thao tac rong', async () => {
    const b = await mkBrand(`${tag}-khong-doi`);
    await daos.brands.publish(b.id, new Date());
    const r = await slugs.rename({
      entity: 'brand', id: b.id, currentSlug: b.slug, slug: b.slug, wasEverPublished: true,
    });
    expect(r.oldPath).toBe(r.newPath);
    // Khong tao redirect tro ve chinh no — do la vong lap
    expect(await daos.redirects.findActiveBySource(r.oldPath)).toBeNull();
  });

  it('doi slug cua nhom CO BAN DICH bi tu choi o day', async () => {
    // Slug cua chung nam tren hang dich, doi no phai ghi ca ban dich.
    // Nhan mot minh cai slug se de lai ban dich thieu truong.
    await expect(
      slugs.rename({
        entity: 'post', id: crypto.randomUUID(), currentSlug: 'a', slug: 'b',
        locale: 'vi', wasEverPublished: true,
      }),
    ).rejects.toThrow(/phai di qua service cua chinh no/);
  });

  // ── hard delete ──

  it('chua tung publish thi xoa vinh vien duoc; da publish thi khong', async () => {
    const nhap = await mkBrand(`${tag}-chua-pub`);
    expect(await slugs.canHardDelete('brand', nhap.id)).toBe(true);

    await daos.brands.publish(nhap.id, new Date());
    expect(await slugs.canHardDelete('brand', nhap.id)).toBe(false);
  });
});
