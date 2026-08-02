import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('Khung giao dien: offices, banners, homepage_sections, menus', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  const tag = `sc-${Date.now()}`;
  const id: Record<string, string> = {};

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, options: '-c search_path=ltv,public' });
    daos = createDaoManager(createKysely(pool));
    const img = await daos.media.insert({
      fileName: `${tag}-hero.jpg`, originalName: `${tag} hero.jpg`,
      storageClass: 'public', storagePath: `public-media/${tag}/hero.jpg`,
      mimeType: 'image/jpeg', fileExtension: 'jpg', fileSize: 5000,
    });
    id['img'] = img.id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.banners WHERE title LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.menus WHERE code LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.offices WHERE name LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.homepage_sections WHERE section_type LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.media WHERE file_name LIKE $1`, [`${tag}-%`]);
    await pool.end();
  });

  // ══════════════════ offices ══════════════════

  it('toa do giu du BAY chu so thap phan', async () => {
    // NUMERIC(10,7) — khoang 1 cm. Neu di qua kieu FLOAT thi so nay lech,
    // va cai ghim tren ban do nhay sang toa nha ben canh.
    const o = await daos.offices.insert({
      officeType: 'head_office', name: `${tag} Tru so`, address: '123 Nguyen Trai',
      latitude: 10.7768456, longitude: 106.7009123,
    });
    const back = await daos.offices.findById(o.id);
    expect(back!.latitude).toBe(10.7768456);
    expect(back!.longitude).toBe(106.7009123);
    expect(typeof back!.latitude).toBe('number');
  });

  it('DB tu choi toa do ngoai pham vi', async () => {
    await expect(
      daos.offices.insert({
        officeType: 'branch', name: `${tag} Sai`, address: 'x', latitude: 91,
      }),
    ).rejects.toThrow();
  });

  it('tim tru so chinh — chi lay ban da xuat ban', async () => {
    const found = await daos.offices.findHeadOffice();
    expect(found?.name).toBe(`${tag} Tru so`);   // mac dinh status = 'published'
  });

  // ══════════════════ banners: cua so thoi gian ══════════════════

  const mkBanner = async (key: string, startAt: Date | null, endAt: Date | null) => {
    const b = await daos.banners.insert({
      imageId: id['img']!, title: `${tag} ${key}`, startAt, endAt,
    });
    await daos.banners.publish(b.id);
    return b;
  };

  it('banner CHUA toi gio thi chua hien', async () => {
    const b = await mkBanner('tuong-lai', new Date(Date.now() + 86_400_000), null);
    const active = await daos.banners.findActive();
    expect(active.map((x) => x.id)).not.toContain(b.id);
  });

  it('banner DA het han thi bien mat', async () => {
    const b = await mkBanner('het-han', null, new Date(Date.now() - 1000));
    expect((await daos.banners.findActive()).map((x) => x.id)).not.toContain(b.id);
  });

  it('banner trong cua so thi hien', async () => {
    const b = await mkBanner(
      'dang-chay', new Date(Date.now() - 1000), new Date(Date.now() + 86_400_000),
    );
    expect((await daos.banners.findActive()).map((x) => x.id)).toContain(b.id);
  });

  it('banner khong dat gio thi luon hien', async () => {
    const b = await mkBanner('vinh-vien', null, null);
    expect((await daos.banners.findActive()).map((x) => x.id)).toContain(b.id);
  });

  it('ban NHAP khong hien du dang trong cua so', async () => {
    const b = await daos.banners.insert({ imageId: id['img']!, title: `${tag} nhap` });
    expect((await daos.banners.findActive()).map((x) => x.id)).not.toContain(b.id);
  });

  it('anh bi xoa mem thi banner bien mat', async () => {
    const m = await daos.media.insert({
      fileName: `${tag}-tam.jpg`, originalName: `${tag} tam.jpg`,
      storageClass: 'public', storagePath: `public-media/${tag}/tam.jpg`,
      mimeType: 'image/jpeg', fileExtension: 'jpg', fileSize: 10,
    });
    const b = await daos.banners.insert({ imageId: m.id, title: `${tag} anh-xoa` });
    await daos.banners.publish(b.id);
    expect((await daos.banners.findActive()).map((x) => x.id)).toContain(b.id);

    await daos.media.softDelete(m.id, new Date());
    expect((await daos.banners.findActive()).map((x) => x.id)).not.toContain(b.id);
  });

  it('DB tu choi cua so thoi gian nguoc', async () => {
    await expect(
      daos.banners.insert({
        imageId: id['img']!, title: `${tag} nguoc`,
        startAt: new Date(Date.now() + 86_400_000), endAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  // ══════════════════ homepage_sections ══════════════════

  it('sap xep lai TOAN BO trong mot cau lenh', async () => {
    const types = [`${tag}-a`, `${tag}-b`, `${tag}-c`];
    for (const t of types) await daos.homepageSections.upsert({ sectionType: t });

    await daos.homepageSections.reorder([types[2]!, types[0]!, types[1]!]);
    const all = (await daos.homepageSections.listAll()).filter((s) => s.sectionType.startsWith(tag));
    expect(all.map((s) => s.sectionType)).toEqual([types[2], types[0], types[1]]);
  });

  it('tat mot khoi thi trang chu khong lay nua', async () => {
    await daos.homepageSections.setEnabled(`${tag}-b`, false);
    const enabled = await daos.homepageSections.listEnabled();
    expect(enabled.map((s) => s.sectionType)).not.toContain(`${tag}-b`);
    // Man hinh quan tri van thay
    expect((await daos.homepageSections.listAll()).map((s) => s.sectionType)).toContain(`${tag}-b`);
  });

  it('cau hinh JSONB hinh dang la bi loai, khong lot len tren', async () => {
    await daos.homepageSections.upsert({
      sectionType: `${tag}-cfg`, settings: { limit: 8, title: 'Noi bat' },
    });
    expect((await daos.homepageSections.findByType(`${tag}-cfg`))!.settings)
      .toEqual({ limit: 8, title: 'Noi bat' });

    await pool.query(
      `UPDATE ltv.homepage_sections SET settings = '[1,2,3]'::jsonb WHERE section_type = $1`,
      [`${tag}-cfg`],
    );
    expect((await daos.homepageSections.findByType(`${tag}-cfg`))!.settings).toEqual({});
  });

  // ══════════════════ menus ══════════════════

  it('dung cay hai cap, thu tu theo display_order', async () => {
    const m = await daos.menus.insert({
      code: `${tag}-header`, name: 'Header', location: 'header',
    });
    const chaId = crypto.randomUUID();
    await daos.transaction((tx) =>
      tx.menus.replaceItems(m.id, [
        { id: chaId, label: 'San pham', linkType: 'none', displayOrder: 0 },
        { label: 'Lien he', linkType: 'page', displayOrder: 1 },
        { parentId: chaId, label: 'May chung cat', linkType: 'product_category', displayOrder: 1 },
        { parentId: chaId, label: 'May do nhot', linkType: 'product_category', displayOrder: 0 },
      ]),
    );

    const tree = await daos.menus.findTreeByCode(`${tag}-header`);
    expect(tree!.items.map((i) => i.label)).toEqual(['San pham', 'Lien he']);
    expect(tree!.items[0]!.children.map((c) => c.label))
      .toEqual(['May do nhot', 'May chung cat']);   // theo display_order, khong theo thu tu gui
    expect(tree!.items[1]!.children).toEqual([]);
  });

  it('AN muc cha thi muc con KHONG noi len goc', async () => {
    /**
     * Day la cho de sai nhat cua viec dung cay trong bo nho: loc `active` o
     * SQL lam muc cha bien mat khoi danh sach, va mot thuat toan dung cay
     * ngay tho se coi muc con la muc goc — dua "May chung cat" len ngang
     * hang voi "San pham" tren thanh menu.
     */
    const m = (await daos.menus.findByCode(`${tag}-header`))!;
    const items = await daos.menus.listItems(m.id);
    const cha = items.find((i) => i.label === 'San pham')!;
    await pool.query(`UPDATE ltv.menu_items SET status = 'hidden' WHERE id = $1`, [cha.id]);

    const tree = await daos.menus.findTreeByCode(`${tag}-header`);
    expect(tree!.items.map((i) => i.label)).toEqual(['Lien he']);
    // Hai muc con bi bo theo cha, khong noi len
    expect(tree!.items.flatMap((i) => i.children)).toEqual([]);

    await pool.query(`UPDATE ltv.menu_items SET status = 'active' WHERE id = $1`, [cha.id]);
  });

  it('thay ca tap: goi lan hai khong cong don', async () => {
    const m = (await daos.menus.findByCode(`${tag}-header`))!;
    await daos.transaction((tx) =>
      tx.menus.replaceItems(m.id, [{ label: 'Chi con mot muc', linkType: 'none' }]),
    );
    expect(await daos.menus.listItems(m.id)).toHaveLength(1);
  });

  it('menu an thi khong giai duoc', async () => {
    await pool.query(`UPDATE ltv.menus SET status = 'hidden' WHERE code = $1`, [`${tag}-header`]);
    expect(await daos.menus.findTreeByCode(`${tag}-header`)).toBeNull();
    await pool.query(`UPDATE ltv.menus SET status = 'active' WHERE code = $1`, [`${tag}-header`]);
  });

  it('nhieu menu theo vi tri lay bang HAI truy van, khong phai hai moi menu', async () => {
    for (const loc of ['footer_company', 'footer_legal'] as const) {
      const m = await daos.menus.insert({ code: `${tag}-${loc}`, name: loc, location: loc });
      await daos.transaction((tx) =>
        tx.menus.replaceItems(m.id, [{ label: `Muc ${loc}`, linkType: 'none' }]),
      );
    }
    const trees = await daos.menus.findTreesByLocations(['footer_company', 'footer_legal']);
    const ours = trees.filter((t) => t.menu.code.startsWith(tag));
    expect(ours).toHaveLength(2);
    expect(ours.every((t) => t.items.length === 1)).toBe(true);
    expect(await daos.menus.findTreesByLocations([])).toEqual([]);
  });

  it('xoa menu thi muc con di theo (CASCADE)', async () => {
    const m = await daos.menus.insert({
      code: `${tag}-tam`, name: 'Tam', location: 'mobile',
    });
    await daos.transaction((tx) =>
      tx.menus.replaceItems(m.id, [{ label: 'X', linkType: 'none' }]),
    );
    await daos.menus.delete(m.id);
    const r = await pool.query(`SELECT count(*) AS n FROM ltv.menu_items WHERE menu_id = $1`, [m.id]);
    expect(Number(r.rows[0].n)).toBe(0);
  });

  // ══════════════════ content_media_refs — lo hong A4 ══════════════════

  it('dong bo tham chieu theo TUNG O chua khoi', async () => {
    const b = await daos.brands.insert({
      brandType: 'manufacturer', name: `${tag} H`, slug: `${tag}-h`,
    });
    const field = { entityType: 'brand', entityId: b.id, fieldName: 'overview' };

    await daos.contentMediaRefs.replaceForField(field, [id['img']!]);
    expect(await daos.contentMediaRefs.countByMedia(id['img']!)).toBeGreaterThanOrEqual(1);

    // Thay ca tap: bo anh khoi noi dung thi tham chieu cung di
    await daos.contentMediaRefs.replaceForField(field, []);
    expect((await daos.contentMediaRefs.findByMedia(id['img']!))
      .filter((r) => r.entityId === b.id)).toEqual([]);

    await pool.query(`DELETE FROM ltv.brands WHERE id = $1`, [b.id]);
  });

  it('hai O KHAC NHAU cua cung thuc the khong dam nhau', async () => {
    const b = await daos.brands.insert({
      brandType: 'manufacturer', name: `${tag} K`, slug: `${tag}-k`,
    });
    await daos.contentMediaRefs.replaceForField(
      { entityType: 'brand', entityId: b.id, fieldName: 'overview' }, [id['img']!],
    );
    await daos.contentMediaRefs.replaceForField(
      { entityType: 'brand', entityId: b.id, fieldName: 'description' }, [id['img']!],
    );
    expect((await daos.contentMediaRefs.findByMedia(id['img']!))
      .filter((r) => r.entityId === b.id)).toHaveLength(2);

    // Xoa mot o khong dung toi o kia
    await daos.contentMediaRefs.replaceForField(
      { entityType: 'brand', entityId: b.id, fieldName: 'overview' }, [],
    );
    const con = (await daos.contentMediaRefs.findByMedia(id['img']!))
      .filter((r) => r.entityId === b.id);
    expect(con).toHaveLength(1);
    expect(con[0]!.fieldName).toBe('description');

    await daos.contentMediaRefs.deleteForEntity('brand', b.id);
    await pool.query(`DELETE FROM ltv.brands WHERE id = $1`, [b.id]);
  });

  it('`locale = null` xu ly dung, khong bi `= NULL` lam hong', async () => {
    const b = await daos.brands.insert({
      brandType: 'manufacturer', name: `${tag} L`, slug: `${tag}-l`,
    });
    const f = { entityType: 'brand', entityId: b.id, fieldName: 'overview', locale: null };
    await daos.contentMediaRefs.replaceForField(f, [id['img']!]);
    // Goi lai voi cung o: phai THAY chu khong tao them hang thu hai
    await daos.contentMediaRefs.replaceForField(f, [id['img']!]);
    expect((await daos.contentMediaRefs.findByMedia(id['img']!))
      .filter((r) => r.entityId === b.id)).toHaveLength(1);

    await daos.contentMediaRefs.deleteForEntity('brand', b.id);
    await pool.query(`DELETE FROM ltv.brands WHERE id = $1`, [b.id]);
  });

  it('tham chieu MO COI bi phat hien, va loai LA cung bi bao', async () => {
    // Thuc the khong ton tai
    await pool.query(
      `INSERT INTO ltv.content_media_refs (media_id, entity_type, entity_id, field_name)
       VALUES ($1, 'product', gen_random_uuid(), 'overview')`, [id['img']!],
    );
    // Loai NGOAI danh sach kiem -> cung phai bi bao, de quen them khong im lang
    await pool.query(
      `INSERT INTO ltv.content_media_refs (media_id, entity_type, entity_id, field_name)
       VALUES ($1, 'loai_moi_chua_khai_bao', gen_random_uuid(), 'x')`, [id['img']!],
    );

    const orphans = await daos.contentMediaRefs.findOrphans(50);
    const types = orphans.filter((o) => o.mediaId === id['img']).map((o) => o.entityType);
    expect(types).toContain('product');
    expect(types).toContain('loai_moi_chua_khai_bao');

    await pool.query(`DELETE FROM ltv.content_media_refs WHERE media_id = $1`, [id['img']!]);
  });
});
