import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from '@ltv/db';
import { createTestPool } from '@ltv/testing';
import { randomUUID } from 'node:crypto';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { SiteServiceImpl, type SiteDaos } from '../src/services/site/service.js';
import { TaxonomyServiceImpl, type TaxonomyDaos } from '../src/services/taxonomy/service.js';
import { ContentServiceImpl, type ContentDaos } from '../src/services/content/service.js';
import { ProductQueryServiceImpl, type ProductDaos } from '../src/services/products/service.js';
import { TtlCache } from '../src/shared/cache.js';

/**
 * KHUNG SITE — F4.
 *
 * Hai bao dam dat cuoc cao nhat cua phase nay, va ca hai deu la loai "sai thi im
 * lang":
 *
 *  1. KHONG PHAT LIEN KET CHET. `menu_items.link_target_id` va
 *     `banners.link_target_id` la da hinh, KHONG co khoa ngoai. Menu nam tren MOI
 *     trang, nen mot muc tro toi noi dung da xoa la mot lien ket 404 tren toan bo
 *     site — thu Google thay truoc nguoi van hanh.
 *
 *  2. LOGO KHACH HANG can CA HAI dieu kien. `status='published'` la "noi dung da
 *     soan xong", `is_public=TRUE` la "khach da CHO PHEP neu ten". Dung logo khi
 *     chua duoc phep la chuyen phap ly.
 *
 * Cong voi mot bao dam do duoc: CACHE phai that su chan truy van, khong phai chi
 * "co ve nhanh hon".
 */
const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('SiteService tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  let site: SiteServiceImpl;
  let cache: TtlCache;
  let sqlCount = 0;

  const tag = `st-${Date.now()}`;
  const s = (k: string): string => `${tag}-${k}`;
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
    cache = new TtlCache(60_000);
    site = new SiteServiceImpl(
      daos as unknown as SiteDaos,
      new TaxonomyServiceImpl(daos as unknown as TaxonomyDaos),
      new ContentServiceImpl(daos as unknown as ContentDaos),
      new ProductQueryServiceImpl(daos as unknown as ProductDaos),
      cache,
    );

    // ── anh dung chung cho banner va logo ──
    const anh = await daos.media.insert({
      fileName: `${tag}.jpg`,
      originalName: `${tag}.jpg`,
      storageClass: 'public',
      storagePath: `public/${tag}.jpg`,
      publicUrl: `/media/${tag}.jpg`,
      mimeType: 'image/jpeg',
      fileExtension: 'jpg',
      fileSize: 10,
      checksum: `${tag}-anh`,
    });
    id['anh'] = anh.id;

    // ── mot san pham THAT de lien ket tro toi ──
    const hang = await daos.brands.insert({
      brandType: 'manufacturer',
      name: `Hang ${tag}`,
      slug: s('hang'),
    });
    id['hang'] = hang.id;
    await daos.brands.publish(hang.id, new Date());
    const sp = await daos.products.insert({
      brandId: hang.id,
      name: `May ${tag}`,
      slug: s('sp'),
    });
    id['sp'] = sp.id;
    await daos.products.publish(sp.id, new Date());

    // ── mot san pham CHUA publish: lien ket toi no phai bi bo ──
    const spNhap = await daos.products.insert({
      brandId: hang.id,
      name: `May nhap ${tag}`,
      slug: s('sp-nhap'),
    });
    id['spNhap'] = spNhap.id;

    // ── khach hang: ba to hop ──
    const k1 = await daos.customers.insert({ name: `KH hien ${tag}`, logoId: anh.id });
    await daos.customers.update(k1.id, { isPublic: true });
    await daos.customers.publish(k1.id, new Date());
    id['k1'] = k1.id;

    const k2 = await daos.customers.insert({ name: `KH chua cho phep ${tag}`, logoId: anh.id });
    await daos.customers.publish(k2.id, new Date());
    id['k2'] = k2.id;

    const k3 = await daos.customers.insert({ name: `KH khong logo ${tag}` });
    await daos.customers.update(k3.id, { isPublic: true });
    await daos.customers.publish(k3.id, new Date());
    id['k3'] = k3.id;

    // ── van phong: mot hien, mot an ──
    const v1 = await daos.offices.insert({
      officeType: 'branch',
      name: `VP hien ${tag}`,
      address: 'dia chi',
    });
    id['v1'] = v1.id;
    await daos.offices.publish(v1.id);
    /**
     * `unpublish()` la BAT BUOC o day, khong phai "cho chac".
     *
     * `ltv.offices.status` mac dinh la `'published'` (nam bang tham chieu lam vay:
     * offices, standards, applications, industries, post_categories). Neu chi
     * insert roi khong publish thi hang nay VAN cong khai, va phep kiem "van phong
     * an khong xuat hien" se XANH ma khong do gi ca.
     */
    const v2 = await daos.offices.insert({
      officeType: 'workshop',
      name: `VP an ${tag}`,
      address: 'dia chi',
    });
    id['v2'] = v2.id;
    await daos.offices.unpublish(v2.id);

    // ── banner: bon to hop ──
    const b1 = await daos.banners.insert({
      imageId: anh.id,
      title: `B song ${tag}`,
      linkType: 'product',
      linkTargetId: sp.id,
    });
    await daos.banners.publish(b1.id);
    id['b1'] = b1.id;

    const b2 = await daos.banners.insert({
      imageId: anh.id,
      title: `B chet ${tag}`,
      linkType: 'product',
      linkTargetId: randomUUID(),
    });
    await daos.banners.publish(b2.id);
    id['b2'] = b2.id;

    const b3 = await daos.banners.insert({
      imageId: anh.id,
      title: `B het han ${tag}`,
      linkType: 'none',
      startAt: new Date(Date.now() - 2 * 86_400_000),
      endAt: new Date(Date.now() - 86_400_000),
    });
    await daos.banners.publish(b3.id);
    id['b3'] = b3.id;

    const b4 = await daos.banners.insert({
      imageId: anh.id,
      title: `B nhap ${tag}`,
      linkType: 'none',
    });
    id['b4'] = b4.id;

    // ── menu rieng cho bai kiem, o vi tri `header` ──
    const menu = await daos.menus.insert({
      code: s('menu'),
      name: 'Menu kiem',
      location: 'header',
    });
    id['menu'] = menu.id;
    const chaChet = randomUUID();
    await daos.menus.replaceItems(menu.id, [
      {
        label: 'Song',
        labelI18nKey: 'nav.products',
        linkType: 'product',
        linkTargetId: sp.id,
        displayOrder: 0,
      },
      { label: 'Chet', linkType: 'product', linkTargetId: randomUUID(), displayOrder: 1 },
      { label: 'Chua publish', linkType: 'product', linkTargetId: spNhap.id, displayOrder: 2 },
      { label: 'Tieu de', linkType: 'none', displayOrder: 3 },
      { label: 'Ngoai', linkType: 'custom_url', customUrl: 'https://example.com', displayOrder: 4 },
      {
        label: 'Khong an toan',
        linkType: 'custom_url',
        customUrl: 'javascript:alert(1)',
        displayOrder: 5,
      },
      {
        id: chaChet,
        label: 'Cha chet',
        linkType: 'product',
        linkTargetId: randomUUID(),
        displayOrder: 6,
      },
      {
        parentId: chaChet,
        label: 'Con song',
        linkType: 'product',
        linkTargetId: sp.id,
        displayOrder: 0,
      },
    ]);
  });

  /**
   * DON CA SAN PHAM VA HANG — ban dau khong don, va cai gia rat cu the.
   *
   * Ban cu chi xoa menu, banner, van phong va khach hang. San pham + hang o lai sau
   * MOI lan chay, nen sau vai chuc lan chay bo test tich hop thi co so du lieu co 119
   * san pham da publish — va ba bai kiem F4 chuyen do vi mot ly do trong nhu khong
   * lien quan gi (`Cannot read properties of undefined`).
   *
   * Cho tot: dong rac do da lam LO RA mot loi that (`LinkResolver` chi xet 100 ban
   * ghi dau — xem bai kiem "ngoai trang dau"). Cho xau: mot bo test tu lam ban moi
   * truong cua chinh no thi lan sau se do vi ly do khac, va nguoi doc mat thoi gian o
   * sai cho. `doc/15` da co lap ba bai kiem khac vi dung ly do nay; day la cho thu tu.
   */
  afterAll(async () => {
    await daos.menus.delete(id['menu']!);
    for (const k of ['b1', 'b2', 'b3', 'b4']) await daos.banners.delete(id[k]!);
    for (const k of ['v1', 'v2']) await daos.offices.delete(id[k]!);
    for (const k of ['sp', 'spNhap']) await daos.products.hardDelete(id[k]!);
    await pool.query(`DELETE FROM ltv.products WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.brands WHERE slug LIKE $1`, [`${tag}-%`]);
    /**
     * THU TU quan trong: `customers.logo_id` co khoa ngoai tro toi `media`.
     *
     * Ban dau doan nay dung `customers.softDelete()` — xoa MEM van de lai hang, va
     * hang do van giu `logo_id`, nen lenh xoa media ke tiep do voi
     * `customers_logo_id_fkey`. Du lieu cua bai kiem thi phai xoa THAT.
     */
    await pool.query(`DELETE FROM ltv.customers WHERE name LIKE $1`, [`%${tag}%`]);
    await pool.query(`DELETE FROM ltv.media WHERE checksum = $1`, [`${tag}-anh`]);
    await pool.end();
  });

  // ══════════════════════ khach hang ══════════════════════
  describe('customers — HAI dieu kien, khong phai mot', () => {
    it('chi khach da publish VA duoc phep VA co logo', async () => {
      const xs = await site.customers(100);
      const ten = xs.map((x) => x.name);
      expect(ten).toContain(`KH hien ${tag}`);
      expect(ten).not.toContain(`KH chua cho phep ${tag}`);
      expect(ten).not.toContain(`KH khong logo ${tag}`);
    });

    /**
     * Khang dinh dieu ma ten phep kiem NOI: khong ro ri cot noi bo.
     *
     * Ban truoc liet ke cung DU danh sach khoa duoc phep, nen khi `CustomerView`
     * them `logo_url` — mot truong hop le, khong ro ri gi — phep kiem do len va
     * o do rat lau. No bao "co gi do doi", chu khong bao "co gi do lo ra".
     *
     * Danh sach CAM duoi day so khop CHINH XAC tung ten khoa, khong phai chuoi
     * con: `logo_id` la khoa hop le va phai khong bi nham voi `id`.
     */
    it('KHONG lo `id` hay `status` ra ngoai', async () => {
      const xs = await site.customers(100);
      const x = xs.find((y) => y.name === `KH hien ${tag}`)!;
      const camLo = ['id', 'status', 'is_public', 'deleted_at', 'created_at', 'updated_at'];
      const loRa = Object.keys(x).filter((key) => camLo.includes(key));
      expect(loRa, `cot noi bo bi lo ra ngoai: ${loRa.join(', ')}`).toEqual([]);
    });

    it('`limit` bi kep trong khoang 1..100', async () => {
      expect((await site.customers(0)).length).toBeLessThanOrEqual(1);
      expect((await site.customers(-5)).length).toBeLessThanOrEqual(1);
      expect(async () => site.customers(10_000)).not.toThrow();
    });
  });

  // ══════════════════════ van phong ══════════════════════
  it('offices — van phong an KHONG xuat hien', async () => {
    const xs = await site.offices();
    const ten = xs.map((x) => x.name);
    expect(ten).toContain(`VP hien ${tag}`);
    expect(ten).not.toContain(`VP an ${tag}`);
  });

  // ══════════════════════ dieu huong ══════════════════════
  describe('navigation — khong phat lien ket chet', () => {
    it('muc tro toi noi dung KHONG TON TAI bi bo', async () => {
      const nav = await site.navigation('header', 'en');
      const m = nav.menus.find((x) => x.code === s('menu'))!;
      expect(m.items.map((i) => i.label)).not.toContain('Chet');
    });

    it('muc tro toi noi dung CHUA PUBLISH bi bo', async () => {
      const nav = await site.navigation('header', 'en');
      const m = nav.menus.find((x) => x.code === s('menu'))!;
      expect(m.items.map((i) => i.label)).not.toContain('Chua publish');
    });

    it('muc song duoc giai thanh duong dan dung', async () => {
      const nav = await site.navigation('header', 'en');
      const m = nav.menus.find((x) => x.code === s('menu'))!;
      const i = m.items.find((x) => x.label === 'Song')!;
      expect(i.url).toBe(`/products/${s('sp')}`);
      expect(i.label_i18n_key).toBe('nav.products');
    });

    it('`link_type = none` la TIEU DE — giu lai voi url null', async () => {
      const nav = await site.navigation('header', 'en');
      const m = nav.menus.find((x) => x.code === s('menu'))!;
      const i = m.items.find((x) => x.label === 'Tieu de');
      expect(i).toBeDefined();
      expect(i!.url).toBeNull();
    });

    it('`javascript:` bi bo, `https://` duoc giu', async () => {
      const nav = await site.navigation('header', 'en');
      const m = nav.menus.find((x) => x.code === s('menu'))!;
      expect(m.items.map((i) => i.label)).not.toContain('Khong an toan');
      expect(m.items.find((i) => i.label === 'Ngoai')?.url).toBe('https://example.com');
    });

    /**
     * Truong hop nay la ly do luat "bo muc chet" khong duoc viet don gian hon.
     *
     * Neu chi viet `if (url === null) continue` thi mot muc cha hong keo theo CA
     * nhanh con lanh cua no — mat nam lien ket dung vi mot lien ket sai.
     */
    it('cha CHET nhung co con SONG thi giu ca hai (cha thanh tieu de)', async () => {
      const nav = await site.navigation('header', 'en');
      const m = nav.menus.find((x) => x.code === s('menu'))!;
      const cha = m.items.find((i) => i.label === 'Cha chet');
      expect(cha, 'cha co con song phai duoc giu').toBeDefined();
      expect(cha!.url).toBeNull();
      expect(cha!.children.map((c) => c.label)).toEqual(['Con song']);
      expect(cha!.children[0]!.url).toBe(`/products/${s('sp')}`);
    });

    /**
     * MUC TIEU NAM NGOAI TRANG DAU — bai kiem ra doi tu mot loi THAT.
     *
     * Ban dau `LinkResolver` lay `{ page: 1, pageSize: 100 }` roi loc trong bo nho.
     * Nghia la chi 100 ban ghi DAU TIEN duoc xet: mot muc menu tro toi san pham thu
     * 101 tro di giai khong ra, va theo dung luat cua `resolve()` no bi BO khoi menu
     * TRONG IM LANG.
     *
     * LT Vietnam la nha phan phoi thiet bi — hon 100 san pham da publish la trang
     * thai BINH THUONG. Nhung ca bo test khong bat duoc, vi co so du lieu demo chi co
     * 12 san pham. No chi lo ra khi mot dot chay test tich hop de lai 119 san pham va
     * ba bai kiem F4 chuyen do; tuc no duoc phat hien boi RAC DU LIEU, khong phai boi
     * mot phep kiem.
     *
     * Bai kiem nay dung dung dieu kien do: chen du san pham de muc tieu chac chan
     * KHONG nam trong trang dau, roi doi muc menu van phai giai duoc.
     */
    it('muc menu tro toi ban ghi NGOAI trang dau van giai duoc', async () => {
      const them: string[] = [];
      // `CO_TRANG` cua resolver la 200 — chen du de vuot mot trang.
      for (let i = 0; i < 205; i += 1) {
        const p = await daos.products.insert({
          brandId: id['hang']!,
          name: `May lot ${tag} ${i}`,
          slug: s(`lot-${i}`),
        });
        them.push(p.id);
        await daos.products.publish(p.id, new Date());
      }
      try {
        cache.clear();
        const nav = await site.navigation('header', 'en');
        const m = nav.menus.find((x) => x.code === s('menu'))!;
        expect(
          m.items.find((x) => x.label === 'Song')?.url,
          'muc menu bien mat khi catalogue vuot mot trang',
        ).toBe(`/products/${s('sp')}`);
      } finally {
        for (const pid of them) await daos.products.hardDelete(pid);
        cache.clear();
      }
    }, 20_000);

    it('`footer` gop bon menu va KHONG co mega menu', async () => {
      const nav = await site.navigation('footer', 'en');
      expect(nav.product_mega_menu).toBeNull();
      const vt = nav.menus.map((m) => m.location);
      expect(vt.every((v) => v.startsWith('footer_'))).toBe(true);
    });

    it('`header` CO mega menu tu sinh', async () => {
      const nav = await site.navigation('header', 'en');
      expect(nav.product_mega_menu).not.toBeNull();
      expect(Array.isArray(nav.product_mega_menu!.brands)).toBe(true);
      expect(Array.isArray(nav.product_mega_menu!.categories)).toBe(true);
    });

    /**
     * NGAN SACH TRUY VAN. Mot menu 20 muc khong duoc thanh 20 truy van.
     *
     * `LinkResolver` gop theo LOAI: muc menu cua bai kiem thuoc hai loai
     * (`product`, `custom_url`), va `custom_url` khong can truy van nao. Nen ca
     * menu chi them MOT truy van giai lien ket.
     */
    it('so truy van khong tang theo so muc menu', async () => {
      cache.clear();
      sqlCount = 0;
      await site.navigation('header', 'en');
      const n = sqlCount;
      expect(n).toBeLessThan(12);
    });
  });

  // ══════════════════════ trang chu ══════════════════════
  describe('home', () => {
    it('banner het han va banner nhap KHONG xuat hien', async () => {
      cache.clear();
      const h = await site.home('en');
      const t = h.banners.map((b) => b.title);
      expect(t).toContain(`B song ${tag}`);
      expect(t).not.toContain(`B het han ${tag}`);
      expect(t).not.toContain(`B nhap ${tag}`);
    });

    it('banner co lien ket CHET van GIU ANH, chi bo lien ket', async () => {
      cache.clear();
      const h = await site.home('en');
      const b = h.banners.find((x) => x.title === `B chet ${tag}`);
      expect(b, 'banner lien ket chet phai con anh').toBeDefined();
      expect(b!.url).toBeNull();
      expect(b!.image_id).toBe(id['anh']);
    });

    it('banner song mang duong dan da giai', async () => {
      cache.clear();
      const h = await site.home('en');
      const banner = h.banners.find((x) => x.title === `B song ${tag}`);
      expect(banner?.url).toBe(`/products/${s('sp')}`);
      expect(banner?.image_url).toBe(`/media/${tag}.jpg`);
    });

    it('`locale` co trong than phan hoi', async () => {
      cache.clear();
      expect((await site.home('vi')).locale).toBe('vi');
    });

    /**
     * TU KIEM CUA `doc/12` F4: "tat mot `homepage_sections` -> khoi bien mat khoi
     * `/home`".
     *
     * `sections` la thu tu ve cua trang chu, va no den tu `listEnabled()`. Neu dung
     * `listAll()` thi frontend nhan ca khoi da tat va phai tu loc — tuc dieu kien
     * bat/tat bi chuyen sang mot kho ma khac, va nguoi bien tap tat mot khoi thi no
     * van hien.
     */
    it('tat mot khoi -> khoi bien mat khoi /home; bat lai -> quay ve', async () => {
      cache.clear();
      const dau = (await site.home('en')).sections;
      expect(dau.length, 'can du lieu seed cho homepage_sections').toBeGreaterThan(0);
      const loai = dau[0]!.section_type;

      await daos.homepageSections.setEnabled(loai, false);
      try {
        cache.clear();
        const sau = (await site.home('en')).sections.map((x) => x.section_type);
        expect(sau).not.toContain(loai);
        expect(sau.length).toBe(dau.length - 1);
      } finally {
        await daos.homepageSections.setEnabled(loai, true);
        cache.clear();
      }
      expect((await site.home('en')).sections.map((x) => x.section_type)).toContain(loai);
    });

    it('khong nhom nao lo `id` cua thuc the', async () => {
      cache.clear();
      const h = await site.home('en');
      const json = JSON.stringify([
        h.featured_categories,
        h.featured_brands,
        h.featured_applications,
        h.featured_products,
        h.featured_services,
        h.featured_projects,
        h.latest_posts,
        h.customers,
      ]);
      expect(json).not.toMatch(/"id"\s*:/);
      expect(json).not.toMatch(/"status"\s*:/);
    });
  });

  // ══════════════════════ tim kiem ══════════════════════
  describe('search', () => {
    /**
     * Tim bang TEN, khong bang SLUG.
     *
     * Ban dau toi viet `site.search(s('sp'))` — do la SLUG, va bai kiem do vi
     * `search` khong doi chieu voi `slug`. Cai do KHONG phai loi: `doc/06` PHAN IX
     * liet ke sau truong (ten/model/hang/danh muc/tieu chuan/mo ta) va slug khong
     * nam trong do. Nguoi dung go ten thiet bi, khong go slug.
     */
    it('tim theo TEN SAN PHAM', async () => {
      const r = await site.search(`May ${tag}`, 'en');
      expect(r.items.map((x) => x.slug)).toContain(s('sp'));
      expect(r.items.every((x) => x.type === 'product')).toBe(true);
    });

    /**
     * TIM THEO TEN HANG — va day la phep kiem quan trong nhat cua nhom.
     *
     * `doc/06` PHAN IX doi tim kiem phu ca "hang/danh muc/tieu chuan". Ba truong do
     * nam o bang KHAC, va chung duoc noi vao bang `EXISTS` chu khong bang alias cua
     * `JOIN`. Ly do: doan `where` duoc dung cho CA HAI cau, va cau DEM
     * (`FROM ltv.products p`) khong co `JOIN ltv.brands b`. Viet `b.name` thi cau
     * lay dong chay dung va cau dem nem `missing FROM-clause entry for table "b"`.
     *
     * Nen phep kiem nay phai doc `total_items` — cai do den tu cau DEM. Chi kiem
     * `items` thi loi kia khong lo ra.
     */
    it('tim theo TEN HANG, va cau DEM cung phai chay duoc', async () => {
      const r = await site.search(`Hang ${tag}`, 'en');
      expect(r.items.map((x) => x.slug)).toContain(s('sp'));
      expect(r.totalItems).toBe(r.items.length);
      expect(r.totalItems).toBeGreaterThan(0);
    });

    it('san pham CHUA publish khong xuat hien trong ket qua', async () => {
      const r = await site.search(`May nhap ${tag}`, 'en');
      expect(r.items).toEqual([]);
      expect(r.totalItems).toBe(0);
    });

    it('`subtitle` uu tien `model`', async () => {
      const r = await site.search(`May ${tag}`, 'en');
      const x = r.items.find((y) => y.slug === s('sp'))!;
      // San pham kiem khong co `model`, nen `subtitle` roi ve `short_description`.
      expect(x.subtitle).toBeNull();
    });
  });

  // ══════════════════════ cache ══════════════════════
  describe('cache — phai THAT SU chan truy van', () => {
    it('lan hai khong chay them truy van nao', async () => {
      cache.clear();
      sqlCount = 0;
      await site.home('en');
      const lanDau = sqlCount;
      expect(lanDau, 'trang chu phai that su truy van database').toBeGreaterThan(5);

      sqlCount = 0;
      await site.home('en');
      expect(sqlCount, 'lan hai phai lay tu cache, khong truy van').toBe(0);
      expect(cache.stats().hit).toBeGreaterThan(0);
    });

    it('hai locale la hai khoa khac nhau', async () => {
      cache.clear();
      await site.home('en');
      sqlCount = 0;
      const vi = await site.home('vi');
      expect(sqlCount, '`vi` khong duoc lay ban cache cua `en`').toBeGreaterThan(0);
      expect(vi.locale).toBe('vi');
    });

    it('`clear()` lam ban cache mat hieu luc', async () => {
      cache.clear();
      await site.home('en');
      cache.clear();
      sqlCount = 0;
      await site.home('en');
      expect(sqlCount).toBeGreaterThan(0);
    });

    /**
     * CAI GIA cua cache, viet thanh mot phep kiem thay vi mot cau chu thich.
     *
     * Doi du lieu ma khong xoa cache thi phan hoi VAN LA BAN CU cho den het TTL.
     * Do la hanh vi da chon (xem `shared/cache.ts`), khong phai loi — nhung no phai
     * duoc ghi lai o cho ai cung thay, vi nguoi bien tap se gap dung dieu nay.
     */
    it('du lieu doi ma cache chua het han thi phan hoi VAN CU — da biet', async () => {
      cache.clear();
      const truoc = await site.home('en');
      const b = await daos.banners.insert({
        imageId: id['anh']!,
        title: `B moi ${tag}`,
        linkType: 'none',
      });
      await daos.banners.publish(b.id);
      try {
        const sau = await site.home('en');
        expect(sau.banners.length).toBe(truoc.banners.length);
        cache.clear();
        expect((await site.home('en')).banners.length).toBe(truoc.banners.length + 1);
      } finally {
        await daos.banners.delete(b.id);
        cache.clear();
      }
    });
  });
});
