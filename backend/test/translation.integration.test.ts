import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { createKysely } from '../src/dao/connection.js';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { TranslationMissingError } from '../src/dao/translation.support.js';
import { SlugTakenError } from '../src/dao/slugged.dao.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('Nhom noi dung co ban dich tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  const tag = `tr-${Date.now()}`;
  const slug = (k: string) => `${tag}-${k}`;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: url, options: '-c search_path=ltv,public' });
    daos = createDaoManager(createKysely(pool));
  });
  afterAll(async () => {
    await pool.query(`DELETE FROM ltv.services WHERE id IN
      (SELECT service_id FROM ltv.service_translations WHERE slug LIKE $1)`, [`${tag}-%`]);
    await pool.query(`DELETE FROM ltv.pages WHERE page_type LIKE $1`, [`${tag}-%`]);
    await pool.end();
  });

  /** Dich vu co ca hai ban dich, chua xuat ban gi ca. */
  const makeService = async (key: string) => {
    const s = await daos.services.insert({ serviceType: 'calibration' });
    await daos.services.upsertTranslation(s.id, {
      locale: 'vi', name: `Hieu chuan ${key}`, slug: slug(`${key}-vi`),
    });
    await daos.services.upsertTranslation(s.id, {
      locale: 'en', name: `Calibration ${key}`, slug: slug(`${key}-en`),
    });
    return s;
  };

  // ══════════════════ HREFLANG ══════════════════

  /**
   * Day la quy tac de sai nhat trong ca nhom, va hong theo kieu KHONG AI THAY:
   * `<link hreflang="en">` tro toi mot trang 404 thi Google khong bao loi, no
   * chi am tham ha do tin cay. Nen bon truong hop duoi day duoc viet rieng
   * tung cai, khong gop.
   */

  it('CA HAI ban dich published + cha published  →  co hai muc alternate', async () => {
    const s = await makeService('a');
    await daos.services.publish(s.id, new Date());
    await daos.services.publishTranslation(s.id, 'vi', new Date());
    await daos.services.publishTranslation(s.id, 'en', new Date());

    const alts = await daos.services.hreflangAlternates(s.id);
    expect(alts.map((a) => a.locale)).toEqual(['en', 'vi']);
    expect(alts.find((a) => a.locale === 'en')!.slug).toBe(slug('a-en'));
  });

  it('ban EN con NHAP  →  KHONG sinh hreflang EN', async () => {
    const s = await makeService('b');
    await daos.services.publish(s.id, new Date());
    await daos.services.publishTranslation(s.id, 'vi', new Date());
    // ban `en` van la draft

    // Chi mot ngon ngu doc duoc thi khong co "ban thay the" nao —
    // the hreflang tu tro ve chinh minh la vo nghia.
    expect(await daos.services.hreflangAlternates(s.id)).toEqual([]);
    expect(await daos.services.publishedLocales(s.id)).toEqual(['vi']);
  });

  it('ban dich published nhung CHA con nhap  →  khong sinh gi ca', async () => {
    const s = await makeService('c');
    // KHONG goi publish() cho bang cha
    await daos.services.publishTranslation(s.id, 'vi', new Date());
    await daos.services.publishTranslation(s.id, 'en', new Date());

    // Ban dich san sang nhung dich vu chua cong khai — trang van 404
    expect(await daos.services.hreflangAlternates(s.id)).toEqual([]);
    expect(await daos.services.publishedLocales(s.id)).toEqual([]);
  });

  it('cha bi XOA MEM  →  hreflang bien mat ngay', async () => {
    const s = await makeService('d');
    await daos.services.publish(s.id, new Date());
    await daos.services.publishTranslation(s.id, 'vi', new Date());
    await daos.services.publishTranslation(s.id, 'en', new Date());
    expect(await daos.services.hreflangAlternates(s.id)).toHaveLength(2);

    await daos.services.softDelete(s.id, new Date());
    expect(await daos.services.hreflangAlternates(s.id)).toEqual([]);
  });

  it('ha co MOT ban dich  →  ca cap alternate bien mat', async () => {
    const s = await makeService('e');
    await daos.services.publish(s.id, new Date());
    await daos.services.publishTranslation(s.id, 'vi', new Date());
    await daos.services.publishTranslation(s.id, 'en', new Date());
    expect(await daos.services.hreflangAlternates(s.id)).toHaveLength(2);

    await daos.services.unpublishTranslation(s.id, 'en');
    expect(await daos.services.hreflangAlternates(s.id)).toEqual([]);
  });

  // ══════════════════ moc thoi gian tung ban dich ══════════════════

  it('`first_published_at` la RIENG cho tung ngon ngu', async () => {
    const s = await makeService('f');
    const thang3 = new Date('2026-03-01T00:00:00Z');
    const thang9 = new Date('2026-09-01T00:00:00Z');

    await daos.services.publishTranslation(s.id, 'vi', thang3);
    await daos.services.publishTranslation(s.id, 'en', thang9);

    const trs = await daos.services.listTranslations(s.id);
    const vi = trs.find((t) => t.locale === 'vi')!;
    const en = trs.find((t) => t.locale === 'en')!;
    expect(vi.firstPublishedAt?.toISOString()).toBe(thang3.toISOString());
    expect(en.firstPublishedAt?.toISOString()).toBe(thang9.toISOString());
  });

  it('xuat ban lai KHONG ghi de `first_published_at`', async () => {
    const s = await makeService('g');
    const lan1 = new Date('2026-01-01T00:00:00Z');
    const lan2 = new Date('2026-07-01T00:00:00Z');

    await daos.services.publishTranslation(s.id, 'vi', lan1);
    await daos.services.unpublishTranslation(s.id, 'vi');
    await daos.services.publishTranslation(s.id, 'vi', lan2);

    const vi = (await daos.services.listTranslations(s.id)).find((t) => t.locale === 'vi')!;
    expect(vi.publishedAt?.toISOString()).toBe(lan2.toISOString());
    expect(vi.firstPublishedAt?.toISOString()).toBe(lan1.toISOString());
  });

  it('xuat ban ban dich khong ton tai  →  nem loi, khong im lang', async () => {
    const s = await daos.services.insert({});
    await expect(daos.services.publishTranslation(s.id, 'en', new Date()))
      .rejects.toThrow(TranslationMissingError);
  });

  // ══════════════════ slug phan pham vi theo locale ══════════════════

  it('cung mot slug o HAI ngon ngu khac nhau  →  duoc phep', async () => {
    const s1 = await daos.services.insert({});
    const s2 = await daos.services.insert({});
    const chung = slug('trung-slug');
    await daos.services.upsertTranslation(s1.id, { locale: 'vi', name: 'A', slug: chung });
    // `UNIQUE (locale, slug)` — khac locale thi khong trung
    await expect(
      daos.services.upsertTranslation(s2.id, { locale: 'en', name: 'A', slug: chung }),
    ).resolves.toBeTruthy();
  });

  it('cung mot slug trong CUNG mot ngon ngu  →  bi tu choi', async () => {
    const s1 = await daos.services.insert({});
    const s2 = await daos.services.insert({});
    const chung = slug('doi-nhau');
    await daos.services.upsertTranslation(s1.id, { locale: 'vi', name: 'A', slug: chung });

    expect(await daos.services.isLocaleSlugAvailable('vi', chung)).toBe(false);
    expect(await daos.services.isLocaleSlugAvailable('en', chung)).toBe(true);
    await expect(daos.services.assertLocaleSlugAvailable('vi', chung)).rejects.toThrow(SlugTakenError);
    await expect(
      daos.services.upsertTranslation(s2.id, { locale: 'vi', name: 'B', slug: chung }),
    ).rejects.toThrow();
  });

  it('upsert lan hai SUA cho, khong tao hang moi', async () => {
    const s = await daos.services.insert({});
    const a = await daos.services.upsertTranslation(s.id, {
      locale: 'vi', name: 'Ban dau', slug: slug('upsert'),
    });
    const b = await daos.services.upsertTranslation(s.id, {
      locale: 'vi', name: 'Da sua', slug: slug('upsert'), shortDescription: 'them mo ta',
    });
    expect(b.id).toBe(a.id);
    expect(b.name).toBe('Da sua');
    expect(await daos.services.listTranslations(s.id)).toHaveLength(1);
  });

  it('SUA NOI DUNG khong dung toi trang thai xuat ban', async () => {
    const s = await makeService('h');
    const luc = new Date('2026-02-02T00:00:00Z');
    await daos.services.publishTranslation(s.id, 'vi', luc);

    // Sua mot loi chinh ta khong duoc lam doi `published_at` —
    // neu doi thi sitemap bao voi Google la trang moi tinh, moi lan sua.
    await daos.services.upsertTranslation(s.id, {
      locale: 'vi', name: 'Hieu chuan (da sua chinh ta)', slug: slug('h-vi'),
    });
    const vi = (await daos.services.listTranslations(s.id)).find((t) => t.locale === 'vi')!;
    expect(vi.status).toBe('published');
    expect(vi.publishedAt?.toISOString()).toBe(luc.toISOString());
  });

  // ══════════════════ giai URL ══════════════════

  it('findBySlug tra ve ca thuc the lan ban dich', async () => {
    const s = await makeService('i');
    const found = await daos.services.findBySlug('en', slug('i-en'));
    expect(found!.service.id).toBe(s.id);
    expect(found!.translation.name).toBe('Calibration i');
    expect(found!.translation.locale).toBe('en');
    // Slug tieng Viet khong giai duoc bang locale `en`
    expect(await daos.services.findBySlug('en', slug('i-vi'))).toBeNull();
  });

  it('findBySlug KHONG loc theo trang thai — DAO tra ve su that', async () => {
    // Ban nhap van tra ve duoc: tang tren can phan biet "khong ton tai" (404)
    // voi "ton tai nhung chua cong khai" (quan tri xem truoc duoc).
    const s = await makeService('j');
    const found = await daos.services.findBySlug('vi', slug('j-vi'));
    expect(found).not.toBeNull();
    expect(found!.service.status).toBe('draft');
    expect(found!.translation.status).toBe('draft');
    void s;
  });

  it('cha xoa mem thi findBySlug tra ve null', async () => {
    const s = await makeService('k');
    await daos.services.softDelete(s.id, new Date());
    expect(await daos.services.findBySlug('vi', slug('k-vi'))).toBeNull();
  });

  // ══════════════════ dich vu la CAY + co ban dich ══════════════════

  it('dich vu vua la cay vua co ban dich, hai co che khong dam nhau', async () => {
    const cha = await makeService('cha');
    const con = await daos.services.insert({ parentId: cha.id });
    await daos.services.upsertTranslation(con.id, {
      locale: 'vi', name: 'Dich vu con', slug: slug('con-vi'),
    });

    expect((await daos.services.findById(con.id))!.depth).toBe(1);
    expect((await daos.services.findSubtreeIds(cha.id)).sort())
      .toEqual([cha.id, con.id].sort());

    await daos.transaction((tx) => tx.services.moveNode(con.id, null));
    expect((await daos.services.findById(con.id))!.depth).toBe(0);
    // Ban dich khong bi anh huong boi viec doi vi tri trong cay
    expect(await daos.services.findBySlug('vi', slug('con-vi'))).not.toBeNull();
    expect(await daos.services.findInconsistentNodes()).toEqual([]);
  });

  // ══════════════════ trang he thong ══════════════════

  it('trang he thong THIEU ban tieng Anh da xuat ban bi neu ten', async () => {
    const p = await daos.pages.insert({ pageType: slug('privacy'), isSystemPage: true });
    await daos.pages.upsertTranslation(p.id, {
      locale: 'vi', title: 'Chinh sach bao mat', slug: slug('chinh-sach'),
    });
    await daos.pages.publishTranslation(p.id, 'vi', new Date());

    let thieu = await daos.pages.findSystemPagesMissingEnglish();
    expect(thieu).toContain(slug('privacy'));

    // Viet ban `en` nhung de NHAP — van la thieu.
    // Day la ly do phai dung NOT EXISTS chu khong phai dem so ban dich.
    await daos.pages.upsertTranslation(p.id, {
      locale: 'en', title: 'Privacy Policy', slug: slug('privacy-policy'),
    });
    thieu = await daos.pages.findSystemPagesMissingEnglish();
    expect(thieu).toContain(slug('privacy'));

    await daos.pages.publishTranslation(p.id, 'en', new Date());
    thieu = await daos.pages.findSystemPagesMissingEnglish();
    expect(thieu).not.toContain(slug('privacy'));
  });

  it('trang he thong KHONG duoc xoa', async () => {
    const he = await daos.pages.insert({ pageType: slug('terms'), isSystemPage: true });
    const thuong = await daos.pages.insert({ pageType: slug('gioi-thieu') });
    expect(await daos.pages.canDelete(he.id)).toBe(false);
    expect(await daos.pages.canDelete(thuong.id)).toBe(true);
  });

  it('page_type la khoa nghiep vu — khong doi duoc qua update', async () => {
    const p = await daos.pages.insert({ pageType: slug('lien-he') });
    // `pageType` khong co trong `UpdatePageInput`, nen day la loi bien dich.
    // Kiem o day de neu ai do them no vao thi test do truoc khi ma nguon
    // tro toi "trang lien he" bi gay am tham.
    await daos.pages.update(p.id, { displayOrder: 5 });
    expect((await daos.pages.findById(p.id))!.pageType).toBe(slug('lien-he'));
    expect(await daos.pages.findByType(slug('lien-he'))).not.toBeNull();
  });

  it('trang trung page_type bi tu choi', async () => {
    await daos.pages.insert({ pageType: slug('trung') });
    await expect(daos.pages.insert({ pageType: slug('trung') })).rejects.toThrow();
  });
});
