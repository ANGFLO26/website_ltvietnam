import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('Nhom noi dung: posts, projects, documents, customers', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  const tag = `cg-${Date.now()}`;
  const slug = (k: string) => `${tag}-${k}`;
  const id: Record<string, string> = {};

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, options: '-c search_path=ltv,public' });
    daos = createDaoManager(createKysely(pool));

    const cat = await daos.postCategories.insert({ name: 'Tin tuc', slug: slug('tin-tuc') });
    id['cat'] = cat.id;

    const ind = await daos.industries.insert({ name: 'Loc dau', slug: slug('loc-dau') });
    id['ind'] = ind.id;

    const logo = await daos.media.insert({
      fileName: `${tag}-logo.png`, originalName: `${tag} logo.png`,
      storageClass: 'public', storagePath: `public-media/${tag}/logo.png`,
      mimeType: 'image/png', fileExtension: 'png', fileSize: 2048,
    });
    id['logo'] = logo.id;

    const pdf = await daos.media.insert({
      fileName: `${tag}-cat.pdf`, originalName: `${tag} catalogue.pdf`,
      storageClass: 'protected', storagePath: `protected-documents/${tag}/cat.pdf`,
      mimeType: 'application/pdf', fileExtension: 'pdf', fileSize: 999,
    });
    id['pdf'] = pdf.id;
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.posts WHERE category_id = $1`, [id['cat']]);
    await pool.query(`DELETE FROM ltv.projects WHERE customer_id IN
      (SELECT id FROM ltv.customers WHERE name LIKE $1)`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.projects WHERE id IN
      (SELECT project_id FROM ltv.project_translations WHERE slug LIKE $1)`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.documents WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.customers WHERE name LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.post_categories WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.industries WHERE slug LIKE $1`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.media WHERE file_name LIKE $1`, [`${tag}-%`]);
    await pool.end();
  });

  // ══════════════════ post_categories ══════════════════

  it('danh muc bai viet la cay va co slug KHONG theo locale', async () => {
    const con = await daos.postCategories.insert({
      name: 'Tin nganh', slug: slug('tin-nganh'), parentId: id['cat']!,
    });
    expect(con.depth).toBe(1);
    expect((await daos.postCategories.findSubtreeIds(id['cat']!)).sort())
      .toEqual([id['cat'], con.id].sort());
    expect(await daos.postCategories.isSlugAvailable(slug('tin-nganh'))).toBe(false);
  });

  it('danh muc con bai viet thi dem duoc, va DB tu choi xoa', async () => {
    const p = await daos.posts.insert({ categoryId: id['cat']! });
    expect(await daos.postCategories.countPosts(id['cat']!)).toBeGreaterThan(0);
    // `posts.category_id` NOT NULL + RESTRICT
    await expect(daos.postCategories.hardDelete(id['cat']!)).rejects.toThrow();
    await daos.posts.hardDelete(p.id);
  });

  // ══════════════════ posts ══════════════════

  it('bai viet: bon nhom quan he thay ca tap trong MOT lan goi', async () => {
    const post = await daos.posts.insert({ categoryId: id['cat']! });
    const brandA = await daos.brands.insert({
      brandType: 'manufacturer', name: 'A', slug: slug('brand-a'),
    });
    const brandB = await daos.brands.insert({
      brandType: 'manufacturer', name: 'B', slug: slug('brand-b'),
    });

    await daos.posts.replaceLinks(post.id, { brandIds: [brandA.id, brandB.id] });
    expect((await daos.posts.findLinks(post.id)).brandIds.sort())
      .toEqual([brandA.id, brandB.id].sort());

    // Thay ca tap, khong cong don
    await daos.posts.replaceLinks(post.id, { brandIds: [brandA.id] });
    expect((await daos.posts.findLinks(post.id)).brandIds).toEqual([brandA.id]);

    await pool.query(`DELETE FROM ltv.posts WHERE id = $1`, [post.id]);
    await pool.query(`DELETE FROM ltv.brands WHERE slug LIKE $1`, [`${tag}-brand-%`]);
  });

  it('`undefined` = khong dong toi; mang rong = xoa het', async () => {
    const post = await daos.posts.insert({ categoryId: id['cat']! });
    const b = await daos.brands.insert({
      brandType: 'manufacturer', name: 'C', slug: slug('brand-c'),
    });
    await daos.posts.replaceLinks(post.id, { brandIds: [b.id] });

    // Chi doi `productIds` — `brandIds` khong duoc dong toi
    await daos.posts.replaceLinks(post.id, { productIds: [] });
    expect((await daos.posts.findLinks(post.id)).brandIds).toEqual([b.id]);

    // Bay gio moi xoa that
    await daos.posts.replaceLinks(post.id, { brandIds: [] });
    expect((await daos.posts.findLinks(post.id)).brandIds).toEqual([]);

    await pool.query(`DELETE FROM ltv.posts WHERE id = $1`, [post.id]);
    await pool.query(`DELETE FROM ltv.brands WHERE slug = $1`, [slug('brand-c')]);
  });

  // ══════════════════ projects: muc do cong khai cua khach ══════════════════

  /**
   * Bang quyet dinh nay la thu nguy hiem nhat trong ca nhom D5: dua nham ten
   * mot khach da ky NDA len website la su co phap ly, va khong ai phat hien
   * duoc bang mat thuong. Nen bon nhanh duoc kiem rieng tung cai.
   */
  const makeProject = async (
    key: string,
    visibility: 'public' | 'hide_name' | 'industry_only' | 'confidential',
  ) => {
    const cus = await daos.customers.insert({
      name: `${tag} Nha may loc dau Dung Quat`, industryId: id['ind']!, logoId: id['logo']!,
    });
    const pj = await daos.projects.insert({
      projectType: 'installation', customerId: cus.id, customerVisibility: visibility,
    });
    await daos.projects.upsertTranslation(pj.id, {
      locale: 'vi', title: `Du an ${key}`, slug: slug(key),
      customerDisplayName: 'Mot nha may loc dau mien Trung',
    });
    return { pj, cus };
  };

  it('public  →  ten hien thi neu co, khong thi ten that', async () => {
    const { pj } = await makeProject('pub', 'public');
    expect(await daos.projects.resolvePublicCustomerName(pj.id, 'vi'))
      .toBe('Mot nha may loc dau mien Trung');

    // Bo ten hien thi thi moi lay ten that
    await daos.projects.upsertTranslation(pj.id, {
      locale: 'vi', title: 'Du an pub', slug: slug('pub'), customerDisplayName: null,
    });
    expect(await daos.projects.resolvePublicCustomerName(pj.id, 'vi'))
      .toBe(`${tag} Nha may loc dau Dung Quat`);
  });

  it('hide_name  →  CHI ten hien thi, khong bao gio ten that', async () => {
    const { pj } = await makeProject('hide', 'hide_name');
    expect(await daos.projects.resolvePublicCustomerName(pj.id, 'vi'))
      .toBe('Mot nha may loc dau mien Trung');

    // Khong co ten hien thi thi tra null — KHONG duoc roi ve ten that
    await daos.projects.upsertTranslation(pj.id, {
      locale: 'vi', title: 'Du an hide', slug: slug('hide'), customerDisplayName: null,
    });
    expect(await daos.projects.resolvePublicCustomerName(pj.id, 'vi')).toBeNull();
  });

  it('industry_only  →  ten NGANH, khong phai ten khach', async () => {
    const { pj } = await makeProject('nganh', 'industry_only');
    expect(await daos.projects.resolvePublicCustomerName(pj.id, 'vi')).toBe('Loc dau');
  });

  it('confidential  →  null, KE CA khi bien tap da go ten hien thi', async () => {
    const { pj } = await makeProject('mat', 'confidential');
    // Bien tap da go `customerDisplayName`, nhung cot muc do la trong tai cuoi.
    // Kich ban that: du an duoc viet luc con `public`, sau do hop dong doi
    // sang NDA — khong ai nho quay lai xoa o mo ta.
    expect(await daos.projects.resolvePublicCustomerName(pj.id, 'vi')).toBeNull();
  });

  it('doi muc do sang confidential thi ten bien mat NGAY', async () => {
    const { pj } = await makeProject('doi', 'public');
    expect(await daos.projects.resolvePublicCustomerName(pj.id, 'vi')).not.toBeNull();
    await daos.projects.update(pj.id, { customerVisibility: 'confidential' });
    expect(await daos.projects.resolvePublicCustomerName(pj.id, 'vi')).toBeNull();
  });

  it('du an khong co khach  →  null, khong nem loi', async () => {
    const pj = await daos.projects.insert({ projectType: 'training' });
    await daos.projects.upsertTranslation(pj.id, {
      locale: 'vi', title: 'Dao tao', slug: slug('dao-tao'),
    });
    expect(await daos.projects.resolvePublicCustomerName(pj.id, 'vi')).toBeNull();
  });

  it('ngay du an la NGAY TREN LICH, khong lech vi mui gio', async () => {
    /**
     * Ban dau toi de kieu la `Date` va test nay DO ngay lan chay dau:
     *   expected '2026-03-14' to be '2026-03-15'
     *
     * Trinh phan tich mac dinh cua `pg` dung DATE thanh `Date` o nua dem GIO
     * DIA PHUONG. Sandbox chay o Asia/Bangkok (UTC+7), nen `2026-03-15` doc ra
     * thanh `2026-03-14T17:00Z`. Neu may phat trien dat o UTC thi loi nay
     * KHONG bao gio lo ra o do, va chi xuat hien tren may chu that.
     *
     * Cach sua khong phai la cong bu mui gio, ma la khong dung `Date` nua:
     * ngay ban giao du an la mot o tren to lich. Xem `dao/connection.ts`.
     */
    const pj = await daos.projects.insert({
      projectType: 'commissioning', startedAt: '2026-03-15', completedAt: '2026-04-20',
    });
    const back = await daos.projects.findById(pj.id);
    expect(back!.startedAt).toBe('2026-03-15');
    expect(back!.completedAt).toBe('2026-04-20');
    expect(typeof back!.startedAt).toBe('string');
  });

  it('DB tu choi ngay hoan thanh truoc ngay bat dau', async () => {
    await expect(
      daos.projects.insert({
        projectType: 'repair', startedAt: '2026-05-01', completedAt: '2026-01-01',
      }),
    ).rejects.toThrow();
  });

  it('ngay phat hanh tai lieu cung khong lech', async () => {
    const d = await daos.documents.insert({
      documentType: 'certificate', fileId: id['pdf']!,
      title: 'ISO 9001', slug: slug('iso9001'), publicationDate: '2026-01-01',
    });
    expect((await daos.documents.findById(d.id))!.publicationDate).toBe('2026-01-01');
  });

  // ══════════════════ documents: HAI dieu kien ══════════════════

  it('tai cong khai can CA published LAN visibility=public', async () => {
    const d = await daos.documents.insert({
      documentType: 'catalogue', fileId: id['pdf']!,
      title: 'Catalogue 2026', slug: slug('cat-2026'),
    });

    // draft + public  →  khong tai duoc
    expect(await daos.documents.findDownloadableBySlug(slug('cat-2026'))).toBeNull();

    // published + public  →  tai duoc
    await daos.documents.publish(d.id, new Date());
    expect(await daos.documents.findDownloadableBySlug(slug('cat-2026'))).not.toBeNull();

    // published + hidden  →  KHONG tai duoc, du van la `published`
    await daos.documents.update(d.id, { visibility: 'hidden' });
    expect(await daos.documents.findDownloadableBySlug(slug('cat-2026'))).toBeNull();
    // ...nhung quan tri van tim thay
    expect(await daos.documents.findBySlug(slug('cat-2026'))).not.toBeNull();
  });

  it('tep bi xoa mem thi tai lieu khong tai duoc nua', async () => {
    const m = await daos.media.insert({
      fileName: `${tag}-tam.pdf`, originalName: `${tag} tam.pdf`,
      storageClass: 'protected', storagePath: `protected-documents/${tag}/tam.pdf`,
      mimeType: 'application/pdf', fileExtension: 'pdf', fileSize: 10,
    });
    const d = await daos.documents.insert({
      documentType: 'manual', fileId: m.id, title: 'Manual', slug: slug('manual'),
    });
    await daos.documents.publish(d.id, new Date());
    expect(await daos.documents.findDownloadableBySlug(slug('manual'))).not.toBeNull();

    // Nut tai ve van hien ma bam vao 404 la kieu hong khach thay truoc minh
    await daos.media.softDelete(m.id, new Date());
    expect(await daos.documents.findDownloadableBySlug(slug('manual'))).toBeNull();
  });

  it('bo dem tai xuong tang tai cho', async () => {
    const d = await daos.documents.insert({
      documentType: 'datasheet', fileId: id['pdf']!, title: 'DS', slug: slug('ds'),
    });
    await Promise.all(Array.from({ length: 8 }, () => daos.documents.recordDownload(d.id, new Date())));
    expect((await daos.documents.findById(d.id))!.downloadCount).toBe(8);
  });

  it('tai lieu cua san pham lay bang MOT truy van', async () => {
    const b = await daos.brands.insert({
      brandType: 'manufacturer', name: 'D', slug: slug('brand-d'),
    });
    const p = await daos.products.insert({
      brandId: b.id, name: 'May X', slug: slug('may-x'),
    });
    const d = await daos.documents.insert({
      documentType: 'brochure', fileId: id['pdf']!, title: 'Brochure', slug: slug('bro'),
    });
    await daos.documents.publish(d.id, new Date());
    await daos.documents.replaceLinks(d.id, { productIds: [p.id] });

    const found = await daos.documents.findByProduct(p.id);
    expect(found.map((x) => x.slug)).toEqual([slug('bro')]);

    // Ha co thi bien khoi tab tai lieu
    await daos.documents.unpublish(d.id);
    expect(await daos.documents.findByProduct(p.id)).toEqual([]);

    await pool.query(`DELETE FROM ltv.products WHERE id = $1`, [p.id]);
    await pool.query(`DELETE FROM ltv.brands WHERE id = $1`, [b.id]);
  });

  // ══════════════════ customers: hai co che doc lap ══════════════════

  it('DUYET NOI DUNG khong dong nghia voi DUOC PHEP dung logo', async () => {
    const c = await daos.customers.insert({
      name: `${tag} Khach A`, logoId: id['logo']!,
    });
    await daos.customers.publish(c.id, new Date());

    // Da duyet noi dung, nhung chua ky giay dong y dung logo
    expect((await daos.customers.findById(c.id))!.status).toBe('published');
    expect((await daos.customers.findById(c.id))!.isPublic).toBe(false);

    const cong = await daos.customers.findPublicWithLogo(50);
    expect(cong.map((x) => x.id)).not.toContain(c.id);

    // Chi khi co hanh dong rieng, co y thuc
    await daos.customers.update(c.id, { isPublic: true });
    expect((await daos.customers.findPublicWithLogo(50)).map((x) => x.id)).toContain(c.id);
  });

  it('khach duoc phep nhung KHONG co logo thi khong hien', async () => {
    const c = await daos.customers.insert({ name: `${tag} Khach B` });
    await daos.customers.publish(c.id, new Date());
    await daos.customers.update(c.id, { isPublic: true });
    expect((await daos.customers.findPublicWithLogo(50)).map((x) => x.id)).not.toContain(c.id);
  });

  it('logo bi xoa mem thi khach bien khoi trang chu', async () => {
    const m = await daos.media.insert({
      fileName: `${tag}-logo2.png`, originalName: `${tag} logo2.png`,
      storageClass: 'public', storagePath: `public-media/${tag}/logo2.png`,
      mimeType: 'image/png', fileExtension: 'png', fileSize: 100,
    });
    const c = await daos.customers.insert({ name: `${tag} Khach C`, logoId: m.id });
    await daos.customers.publish(c.id, new Date());
    await daos.customers.update(c.id, { isPublic: true });
    expect((await daos.customers.findPublicWithLogo(50)).map((x) => x.id)).toContain(c.id);

    await daos.media.softDelete(m.id, new Date());
    expect((await daos.customers.findPublicWithLogo(50)).map((x) => x.id)).not.toContain(c.id);
  });

  it('khach con du an thi dem duoc', async () => {
    const c = await daos.customers.insert({ name: `${tag} Khach D` });
    expect(await daos.customers.countProjects(c.id)).toBe(0);
    await daos.projects.insert({ projectType: 'handover', customerId: c.id });
    expect(await daos.customers.countProjects(c.id)).toBe(1);
  });
});
