import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { createTestPool } from '@ltv/testing';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { PublishServiceImpl } from '../src/services/shared/publish.service.js';
import { MediaUsageServiceImpl } from '../src/services/shared/media-usage.service.js';
import { ConflictError } from '../src/shared/errors.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('PublishService + MediaUsageService tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  let pub: PublishServiceImpl;
  let mu: MediaUsageServiceImpl;
  const tag = `pb-${Date.now()}`;
  const id: Record<string, string> = {};

  const mkImage = async (k: string) =>
    daos.media.insert({
      fileName: `${tag}-${k}.jpg`, originalName: `${tag} ${k}.jpg`,
      storageClass: 'public', storagePath: `public-media/${tag}/${k}.jpg`,
      mimeType: 'image/jpeg', fileExtension: 'jpg', fileSize: 100, altText: 'anh',
    });

  const para = (text: string) => [{
    id: crypto.randomUUID(), type: 'paragraph' as const, spans: [{ text }],
  }];

  beforeAll(async () => {
    pool = createTestPool(url);
    daos = createDaoManager(createKysely(pool));
    pub = new PublishServiceImpl(daos);
    mu = new MediaUsageServiceImpl(daos);

    id['img'] = (await mkImage('chinh')).id;
    const cat = await daos.productCategories.insert({ name: 'DM', slug: `${tag}-dm` });
    id['cat'] = cat.id;
    const brand = await daos.brands.insert({
      brandType: 'manufacturer', name: 'H', slug: `${tag}-h`,
      shortDescription: 'mo ta hang', logoId: id['img'],
    });
    id['brand'] = brand.id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.content_media_refs WHERE media_id IN
      (SELECT id FROM ltv.media WHERE file_name LIKE $1)`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.products WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.documents WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.services WHERE id IN
      (SELECT service_id FROM ltv.service_translations WHERE slug LIKE $1)`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.projects WHERE id IN
      (SELECT project_id FROM ltv.project_translations WHERE slug LIKE $1)`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.brands WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.product_categories WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.media WHERE file_name LIKE $1`, [`${tag}-%`]);
    await pool.end();
  });

  // ══════════════════ PublishService: san pham ══════════════════

  it('san pham thieu nhieu thu — liet ke TAT CA, khong dung o cai dau', async () => {
    const p = await daos.products.insert({
      brandId: id['brand']!, name: `SP ${tag}`, slug: `${tag}-thieu`,
    });
    const r = await pub.check({ entity: 'product', id: p.id });
    expect(r.ok).toBe(false);

    const fields = !r.ok ? r.blockers.map((x) => x.field).sort() : [];
    // Nguoi soan thao sua mot vong roi bam lai, thay them mot loi nua,
    // la trai nghiem lam ho bo cuoc.
    expect(fields).toEqual(['category', 'featured_image_id', 'overview', 'short_description']);
  });

  it('du dieu kien thi xuat ban duoc', async () => {
    const p = await daos.products.insert({
      brandId: id['brand']!, name: `SP du ${tag}`, slug: `${tag}-du`,
      shortDescription: 'may chung cat tu dong', overview: para('Gioi thieu'),
      featuredImageId: id['img'],
    });
    await daos.products.replaceCategories(p.id, [{ categoryId: id['cat']!, isPrimary: true }]);

    expect((await pub.check({ entity: 'product', id: p.id })).ok).toBe(true);
    await pub.publish({ entity: 'product', id: p.id });

    const after = await daos.products.findById(p.id);
    expect(after!.status).toBe('published');
    expect(after!.firstPublishedAt).not.toBeNull();
    id['sp'] = p.id;
  });

  it('publish KIEM LAI trong transaction, khong tin ket qua check() truoc do', async () => {
    const img = await mkImage('se-xoa');
    const p = await daos.products.insert({
      brandId: id['brand']!, name: `SP dua ${tag}`, slug: `${tag}-dua`,
      shortDescription: 'mo ta', overview: para('x'), featuredImageId: img.id,
    });
    await daos.products.replaceCategories(p.id, [{ categoryId: id['cat']!, isPrimary: true }]);

    // Luc nay du dieu kien
    expect((await pub.check({ entity: 'product', id: p.id })).ok).toBe(true);

    // Nguoi khac xoa anh trong khi nguoi soan thao con dang xem man hinh
    await daos.media.softDelete(img.id, new Date());

    await expect(pub.publish({ entity: 'product', id: p.id })).rejects.toThrow(ConflictError);
    expect((await daos.products.findById(p.id))!.status).toBe('draft');
  });

  it('chi CO id anh la chua du — anh phai con song', async () => {
    const img = await mkImage('ma');
    await daos.media.softDelete(img.id, new Date());
    const p = await daos.products.insert({
      brandId: id['brand']!, name: `SP ma ${tag}`, slug: `${tag}-ma`,
      shortDescription: 'x', overview: para('y'), featuredImageId: img.id,
    });
    await daos.products.replaceCategories(p.id, [{ categoryId: id['cat']!, isPrimary: true }]);

    const r = await pub.check({ entity: 'product', id: p.id });
    const m = !r.ok && r.blockers.find((x) => x.field === 'featured_image_id');
    expect(m && m.message).toBe('Anh dai dien da bi xoa');
  });

  it('danh muc gan nhung KHONG phai chinh van bi chan (ADR-010)', async () => {
    const p = await daos.products.insert({
      brandId: id['brand']!, name: `SP phu ${tag}`, slug: `${tag}-phu`,
      shortDescription: 'x', overview: para('y'), featuredImageId: id['img'],
    });
    // Gan danh muc nhung khong danh dau chinh
    await daos.products.replaceCategories(p.id, [{ categoryId: id['cat']!, isPrimary: false }]);
    const r = await pub.check({ entity: 'product', id: p.id });
    expect(!r.ok && r.blockers.map((x) => x.field)).toEqual(['category']);
  });

  it('khoi noi dung chi co DUONG KE NGANG cung la rong', async () => {
    const p = await daos.products.insert({
      brandId: id['brand']!, name: `SP ke ${tag}`, slug: `${tag}-ke`,
      shortDescription: 'x', featuredImageId: id['img'],
      overview: [{ id: crypto.randomUUID(), type: 'divider' }],
    });
    await daos.products.replaceCategories(p.id, [{ categoryId: id['cat']!, isPrimary: true }]);
    const r = await pub.check({ entity: 'product', id: p.id });
    // Chi kiem `length === 0` thi mot trang chi co duong ke ngang van len song
    expect(!r.ok && r.blockers.map((x) => x.field)).toEqual(['overview']);
  });

  it('mo ta chi co KHOANG TRANG cung la thieu', async () => {
    const p = await daos.products.insert({
      brandId: id['brand']!, name: `SP trang ${tag}`, slug: `${tag}-trang`,
      shortDescription: '   ', overview: para('x'), featuredImageId: id['img'],
    });
    await daos.products.replaceCategories(p.id, [{ categoryId: id['cat']!, isPrimary: true }]);
    const r = await pub.check({ entity: 'product', id: p.id });
    expect(!r.ok && r.blockers.map((x) => x.field)).toContain('short_description');
  });

  // ══════════════════ nhom co ban dich ══════════════════

  it('dich vu chua co ban dich thi bao dung mot dieu do', async () => {
    const s = await daos.services.insert({ featuredImageId: id['img'] });
    id['sv'] = s.id;
    const r = await pub.check({ entity: 'service', id: s.id, locale: 'vi' });
    expect(!r.ok && r.blockers).toEqual([
      { field: 'translation', message: 'Chua co ban dich vi' },
    ]);
  });

  it('xuat ban dich vu ghi CA bang cha LAN ban dich', async () => {
    const s = id['sv']!;
    await daos.services.upsertTranslation(s, {
      locale: 'vi', name: 'Hieu chuan', slug: `${tag}-hieu-chuan`,
      shortDescription: 'dich vu hieu chuan', scopeOfWork: para('Pham vi'),
    });
    expect((await pub.check({ entity: 'service', id: s, locale: 'vi' })).ok).toBe(true);

    await pub.publish({ entity: 'service', id: s, locale: 'vi' });

    // Quen mot trong hai thi hreflang khong sinh va trang khong len song
    expect((await daos.services.findById(s))!.status).toBe('published');
    expect(await daos.services.publishedLocales(s)).toEqual(['vi']);
  });

  it('xuat ban thieu locale bi tu choi', async () => {
    await expect(pub.check({ entity: 'service', id: id['sv']! }))
      .rejects.toThrow(/phai chi ro ngon ngu/);
  });

  it('ha co BAN DICH khong ha co ca thuc the', async () => {
    await pub.unpublish({ entity: 'service', id: id['sv']!, locale: 'vi' });
    // Ban tieng Anh co van de khong phai ly do go ban tieng Viet xuong
    expect((await daos.services.findById(id['sv']!))!.status).toBe('published');
    expect(await daos.services.publishedLocales(id['sv']!)).toEqual([]);
  });

  it('du an `hide_name` chua dat ten hien thi bi CHAN o buoc publish', async () => {
    const img = await mkImage('du-an');
    const pj = await daos.projects.insert({
      projectType: 'installation', customerVisibility: 'hide_name', featuredImageId: img.id,
    });
    await daos.projects.upsertTranslation(pj.id, {
      locale: 'vi', title: 'Du an X', slug: `${tag}-du-an`,
      shortDescription: 'mo ta', scopeOfWork: para('Pham vi'),
      customerDisplayName: null,
    });
    await daos.projects.replaceMedia(pj.id, [{ mediaId: img.id }]);

    const r = await pub.check({ entity: 'project', id: pj.id, locale: 'vi' });
    // Neu de lot, trang se hien cho trong o vi tri ten khach — va ai do
    // "sua cho dep" bang ten that se lam lo mot khach da ky NDA.
    expect(!r.ok && r.blockers.map((x) => x.field)).toEqual(['customer_display_name']);

    await daos.projects.upsertTranslation(pj.id, {
      locale: 'vi', title: 'Du an X', slug: `${tag}-du-an`,
      shortDescription: 'mo ta', scopeOfWork: para('Pham vi'),
      customerDisplayName: 'Mot nha may mien Trung',
    });
    expect((await pub.check({ entity: 'project', id: pj.id, locale: 'vi' })).ok).toBe(true);
  });

  it('du an khong co anh nao bi chan', async () => {
    const pj = await daos.projects.insert({ projectType: 'training' });
    await daos.projects.upsertTranslation(pj.id, {
      locale: 'vi', title: 'Dao tao', slug: `${tag}-dao-tao`,
      shortDescription: 'mo ta', scopeOfWork: para('Pham vi'),
    });
    const r = await pub.check({ entity: 'project', id: pj.id, locale: 'vi' });
    expect(!r.ok && r.blockers.map((x) => x.field)).toContain('media');
  });

  it('tai lieu mat tep dinh kem thi khong xuat ban duoc', async () => {
    const f = await mkImage('tep');
    const d = await daos.documents.insert({
      documentType: 'catalogue', fileId: f.id, title: 'Cat', slug: `${tag}-cat`,
    });
    expect((await pub.check({ entity: 'document', id: d.id })).ok).toBe(true);

    await daos.media.softDelete(f.id, new Date());
    const r = await pub.check({ entity: 'document', id: d.id });
    expect(!r.ok && r.blockers.map((x) => x.field)).toEqual(['file_id']);
  });

  // ══════════════════ MediaUsageService — lo hong A4 ══════════════════

  it('dem CA HAI nguon, va tach ro tung nguon', async () => {
    const img = await mkImage('hai-nguon');

    expect((await mu.usage(img.id)).total).toBe(0);

    // Nguon 1: khoa ngoai
    const p = await daos.products.insert({
      brandId: id['brand']!, name: `SP fk ${tag}`, slug: `${tag}-fk`, featuredImageId: img.id,
    });
    let u = await mu.usage(img.id);
    expect(u.foreignKeys).toBe(1);
    expect(u.contentBlocks).toBe(0);

    // Nguon 2: khoi noi dung JSONB
    await daos.contentMediaRefs.replaceForField(
      { entityType: 'product', entityId: p.id, fieldName: 'overview' }, [img.id],
    );
    u = await mu.usage(img.id);
    expect(u.foreignKeys).toBe(1);
    expect(u.contentBlocks).toBe(1);
    expect(u.total).toBe(2);

    // Chi tiet de giao dien to sang dung cho
    expect(u.places).toHaveLength(1);
    expect(u.places[0]).toMatchObject({
      source: 'content_block', entityType: 'product', fieldName: 'overview',
    });
  });

  it('CHI co tham chieu tu khoi JSONB van chan duoc xoa', async () => {
    const img = await mkImage('chi-jsonb');
    await daos.contentMediaRefs.replaceForField(
      { entityType: 'post_translation', entityId: crypto.randomUUID(), fieldName: 'content' },
      [img.id],
    );
    // Day chinh la lo hong A4: dem tu khoa ngoai thoi thi con so la 0
    // va anh dang hien giua bai viet bi xoa.
    const d = await mu.canDelete(img.id);
    expect(d.allowed).toBe(false);
    expect(!d.allowed && d.usage.contentBlocks).toBe(1);
    expect(!d.allowed && d.usage.foreignKeys).toBe(0);

    await expect(mu.softDelete(img.id)).rejects.toThrow(ConflictError);
    expect(await daos.media.findById(img.id)).not.toBeNull();
  });

  it('go het tham chieu thi xoa duoc', async () => {
    const img = await mkImage('go-het');
    const field = {
      entityType: 'brand', entityId: id['brand']!, fieldName: 'overview',
    };
    await daos.contentMediaRefs.replaceForField(field, [img.id]);
    expect((await mu.canDelete(img.id)).allowed).toBe(false);

    await daos.contentMediaRefs.replaceForField(field, []);
    expect((await mu.canDelete(img.id)).allowed).toBe(true);

    await mu.softDelete(img.id);
    expect(await daos.media.findById(img.id)).toBeNull();
  });

  it('xoa tep khong ton tai thi bao NOT_FOUND, khong im lang', async () => {
    await expect(mu.softDelete(crypto.randomUUID())).rejects.toThrow(/Khong tim thay tep/);
  });

  it('ung vien don tep duoc KIEM LAI mot lan nua', async () => {
    const img = await mkImage('purge');
    const longAgo = new Date(Date.now() - 90 * 86_400_000);
    await daos.media.softDelete(img.id, longAgo);

    const cutoff = new Date(Date.now() - 30 * 86_400_000);
    expect(await mu.findPurgeable(cutoff, 50)).toContain(img.id);

    // Mot ban nhap duoc khoi phuc va dung lai anh nay SAU khi no da xoa mem.
    // Don tep la khong hoan tac duoc, nen phai kiem lai truoc khi don.
    await daos.contentMediaRefs.replaceForField(
      { entityType: 'page_translation', entityId: crypto.randomUUID(), fieldName: 'content' },
      [img.id],
    );
    expect(await mu.findPurgeable(cutoff, 50)).not.toContain(img.id);
  });
});
