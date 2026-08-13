import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from '@ltv/db';
import { createTestPool } from '@ltv/testing';
import { createDaoManager, type DaoManager } from '../src/dao/dao-manager.js';
import { ContentServiceImpl, type ContentDaos } from '../src/services/content/service.js';

/**
 * NOI DUNG CO BAN DICH — F3.
 *
 * Bai kiem dat cuoc cao nhat: DIEU KIEN HAI TRANG THAI. Doc cong khai chi duoc
 * tra ve khi CA thuc the CHA da publish VA ban dich cua locale do da publish
 * (ADR-004). Kiem mot cai thoi la mot lo ro ri im lang:
 *
 *   chi kiem cha    -> ban dich dang viet nua voi bi cong bo
 *   chi kiem dich   -> mot bai da rut xuong nhap van con URL song
 *
 * Bon nhom (pages, services, projects, posts) deu phai chiu luat nay, va bai kiem
 * duoi day di qua CA BON — khong kiem mot dai dien roi coi nhu da kiem ca nhom
 * (loi toi da mac o F2).
 */
const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

run('ContentService tren PostgreSQL that', () => {
  let pool: pg.Pool;
  let daos: DaoManager;
  let cs: ContentServiceImpl;
  let sqlCount = 0;
  const tag = `ct-${Date.now()}`;
  const s = (k: string) => `${tag}-${k}`;
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
    cs = new ContentServiceImpl(daos as unknown as ContentDaos);

    // ── danh muc tin ──
    const dm = await daos.postCategories.insert({ name: 'Tin ky thuat', slug: s('dm') });
    id['dm'] = dm.id;
    await daos.postCategories.publish(dm.id, new Date());

    // ── nganh (de kiem /industries/:slug/services) ──
    const ng = await daos.industries.insert({ name: 'Nganh', slug: s('ng') });
    id['ng'] = ng.id;
    await daos.industries.publish(ng.id, new Date());

    // ── posts: bon to hop trang thai ──
    for (const [k, chaPub, dichPub] of [
      ['ca-hai', true, true],
      ['chi-cha', true, false],
      ['chi-dich', false, true],
      ['khong-cai-nao', false, false],
    ] as const) {
      const p = await daos.posts.insert({ categoryId: dm.id, postType: 'news' } as never);
      id[`post-${k}`] = p.id;
      await daos.posts.upsertTranslation(p.id, {
        locale: 'vi',
        title: `Bai ${k}`,
        slug: s(`post-${k}`),
        excerpt: null,
        content: [],
      } as never);
      if (dichPub) await daos.posts.publishTranslation(p.id, 'vi', new Date());
      if (chaPub) await daos.posts.publish(p.id, new Date());
    }

    // ── mot bai co CA HAI locale publish (de kiem hreflang) ──
    const hai = await daos.posts.insert({ categoryId: dm.id, postType: 'news' } as never);
    id['post-hai-ngu'] = hai.id;
    for (const [locale, slug] of [
      ['vi', s('hai-vi')],
      ['en', s('hai-en')],
    ] as const) {
      await daos.posts.upsertTranslation(hai.id, {
        locale,
        title: `Hai ngu ${locale}`,
        slug,
        excerpt: null,
        content: [],
      } as never);
      await daos.posts.publishTranslation(hai.id, locale, new Date());
    }
    await daos.posts.publish(hai.id, new Date());

    // ── services: cay hai cap + gan nganh ──
    const sv0 = await daos.services.insert({ serviceType: 'maintenance' } as never);
    const sv1 = await daos.services.insert({ parentId: sv0.id } as never);
    Object.assign(id, { sv0: sv0.id, sv1: sv1.id });
    for (const [sv, k] of [
      [sv0, 'sv-goc'],
      [sv1, 'sv-con'],
    ] as const) {
      await daos.services.upsertTranslation(sv.id, {
        locale: 'vi',
        name: `Dich vu ${k}`,
        slug: s(k),
        shortDescription: null,
        overview: [],
        customerProblems: [],
        scopeOfWork: [],
        process: [],
        benefits: [],
        faq: { version: 1, items: [] },
      } as never);
      await daos.services.publishTranslation(sv.id, 'vi', new Date());
      await daos.services.publish(sv.id, new Date());
    }
    await daos.services.replaceLinks(sv0.id, { industryIds: [ng.id] });

    // ── projects ──
    const pr = await daos.projects.insert({ projectType: 'installation' } as never);
    id['pr'] = pr.id;
    await daos.projects.upsertTranslation(pr.id, {
      locale: 'vi',
      title: 'Du an',
      slug: s('du-an'),
      shortDescription: null,
      scopeOfWork: [],
      implementation: [],
      result: [],
    } as never);
    await daos.projects.publishTranslation(pr.id, 'vi', new Date());
    await daos.projects.publish(pr.id, new Date());

    /**
     * `page_type` la UNIQUE — MOT trang cho moi loai.
     *
     * Dung `'about'` lam bo test do voi `duplicate key value violates unique
     * constraint "pages_page_type_check"` khi seed da tao trang do. Cung loai loi
     * voi `uq_standards_org_code` o F1: mot bai kiem chi chay duoc tren database
     * RONG thi no khong kiem duoc he thong that.
     */
    const pg = await daos.pages.insert({ pageType: s('pt') } as never);
    id['pg'] = pg.id;
    await daos.pages.upsertTranslation(pg.id, {
      locale: 'vi',
      title: 'Gioi thieu',
      slug: s('gioi-thieu'),
      summary: null,
      content: [],
    } as never);
    await daos.pages.publishTranslation(pg.id, 'vi', new Date());
    await daos.pages.publish(pg.id, new Date());
  });

  afterAll(async () => {
    for (const t of [
      'post_translations',
      'service_translations',
      'project_translations',
      'page_translations',
    ]) {
      await pool.query(`DELETE FROM ltv.${t} WHERE slug LIKE $1`, [`${tag}%`]);
    }
    await pool.query(`DELETE FROM ltv.service_industries WHERE service_id = ANY($1::uuid[])`, [
      [id['sv0'], id['sv1']].filter(Boolean),
    ]);
    for (const [t, col] of [
      ['posts', 'category_id'],
      ['services', 'id'],
      ['projects', 'id'],
      ['pages', 'id'],
    ] as const) {
      void col;
      await pool.query(
        `DELETE FROM ltv.${t} WHERE id NOT IN (SELECT id FROM ltv.${t} WHERE false) AND id = ANY($1::uuid[])`,
        [Object.values(id)],
      );
    }
    await pool.query(`DELETE FROM ltv.pages WHERE page_type LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.post_categories WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.query(`DELETE FROM ltv.industries WHERE slug LIKE $1`, [`${tag}%`]);
    await pool.end();
  });

  // ══════════════ DIEU KIEN HAI TRANG THAI ══════════════
  describe('CA HAI phai publish — ADR-004', () => {
    it('danh sach bai viet: CHI to hop ca-hai xuat hien', async () => {
      const r = await cs.listPosts('vi', undefined, { pageSize: 100 });
      const slugs = r!.items.map((x) => x.slug);
      expect(slugs, 'cha+dich publish -> PHAI co').toContain(s('post-ca-hai'));
      expect(slugs, 'chi CHA publish -> phai vang').not.toContain(s('post-chi-cha'));
      expect(slugs, 'chi DICH publish -> phai vang').not.toContain(s('post-chi-dich'));
      expect(slugs, 'khong cai nao -> phai vang').not.toContain(s('post-khong-cai-nao'));
    });

    it('chi tiet bai viet: ba to hop kia deu tra `null` -> 404', async () => {
      expect(await cs.findPost('vi', s('post-ca-hai'))).not.toBeNull();
      for (const k of ['chi-cha', 'chi-dich', 'khong-cai-nao']) {
        expect(await cs.findPost('vi', s(`post-${k}`)), k).toBeNull();
      }
    });

    it('rut CHA xuong nhap thi URL chet ngay (khong con song)', async () => {
      /**
       * Kiem chieu DONG: mot bai dang song, rut thuc the xuong nhap, va URL phai
       * chet NGAY. Thieu dieu kien tren bang cha thi ban dich van `published` va
       * URL van song — mot trang da rut xuong nhap van co the doc duoc tu ben
       * ngoai.
       */
      expect(await cs.findPost('vi', s('post-ca-hai'))).not.toBeNull();
      await daos.posts.unpublish(id['post-ca-hai']!);
      try {
        expect(await cs.findPost('vi', s('post-ca-hai'))).toBeNull();
      } finally {
        await daos.posts.publish(id['post-ca-hai']!, new Date());
      }
    });

    it('luat nay ap cho CA BON nhom, khong chi posts', async () => {
      // Khong kiem mot dai dien roi coi nhu da kiem ca nhom — loi da mac o F2.
      expect(await cs.findPage('vi', s('gioi-thieu')), 'pages').not.toBeNull();
      expect(await cs.findService('vi', s('sv-goc')), 'services').not.toBeNull();
      expect(await cs.findProject('vi', s('du-an')), 'projects').not.toBeNull();

      for (const [ten, id2, ktra] of [
        ['pages', id['pg']!, () => cs.findPage('vi', s('gioi-thieu'))],
        ['services', id['sv0']!, () => cs.findService('vi', s('sv-goc'))],
        ['projects', id['pr']!, () => cs.findProject('vi', s('du-an'))],
      ] as const) {
        const dao =
          ten === 'pages' ? daos.pages : ten === 'services' ? daos.services : daos.projects;
        await dao.unpublishTranslation(id2, 'vi');
        try {
          expect(await ktra(), `${ten}: rut BAN DICH -> phai null`).toBeNull();
        } finally {
          await dao.publishTranslation(id2, 'vi', new Date());
        }
      }
    });
  });

  // ══════════════ dieu kien o TANG DAO, khong qua service ══════════════
  describe('SQL cua `listPublicByLocale` — kiem TRUC TIEP', () => {
    /**
     * Bo bai kiem nay ra doi tu mot PHEP TIEM LOI KHONG BI BAT.
     *
     * Toi bo `AND p.status='published' AND p.deleted_at IS NULL` khoi SQL cua
     * `listPublicByLocale` va CA 18 BAI KIEM VAN XANH. Ly do: `ContentService`
     * cung loc mot lan nua — `postEntities()` chi lay thuc the `published`, roi
     * `if (!e) continue` bo nhung dong khong khop. Dieu kien duoc ap HAI LAN, va
     * lan thu hai la TINH CO.
     *
     * Hai hau qua:
     *
     *   1. Dieu kien trong SQL khong duoc canh: ai do bo no di thi khong gi do.
     *   2. Nghiem trong hon — `total_items` dem tu SQL, con `items` bi loc lai o
     *      service. Neu SQL rong hon service thi tong KHONG khop danh sach: phan
     *      trang hien "12 ket qua" nhung tra ve 11, va trang cuoi co the rong.
     *
     * Nen kiem tang DAO TRUC TIEP, va kiem ca su nhat quan giua `total` va so
     * dong that.
     */
    it('bon to hop trang thai — kiem o tang DAO', async () => {
      const r = await daos.posts.listPublicByLocale('vi', { limit: 100, offset: 0 });
      const slugs = r.rows.map((x) => x.slug);
      expect(slugs, 'ca hai publish').toContain(s('post-ca-hai'));
      expect(slugs, 'chi CHA publish').not.toContain(s('post-chi-cha'));
      expect(slugs, 'chi DICH publish -> SQL phai loai').not.toContain(s('post-chi-dich'));
      expect(slugs, 'khong cai nao').not.toContain(s('post-khong-cai-nao'));
    });

    it('`total` KHOP so dong khi tat ca vua mot trang', async () => {
      /**
       * Neu SQL rong hon dieu kien cua service thi tong dem duoc se lon hon so
       * dong that, va phan trang noi doi. Kiem ca hai tang cung mot luc.
       */
      const dao = await daos.posts.listPublicByLocale('vi', { limit: 100, offset: 0 });
      const svc = await cs.listPosts('vi', undefined, { pageSize: 100 });
      expect(dao.rows.length).toBe(dao.total);
      expect(svc!.items.length, 'service loc bo dong ma SQL da dem').toBe(svc!.totalItems);
    });

    it('`restrictToIds` RONG -> khong tra gi (khong phai "khong loc")', async () => {
      /**
       * Mot nganh chua gan dich vu nao cho ra mang id rong. Bo qua bo loc khi
       * mang rong se tra ve MOI dich vu roi hien chung nhu thuoc nganh do.
       */
      const r = await daos.services.listPublicByLocale(
        'vi',
        { limit: 100, offset: 0 },
        undefined,
        [],
      );
      expect(r.rows).toEqual([]);
      expect(r.total).toBe(0);
      // Doi chieu: khong truyen tham so thi PHAI co du lieu.
      const tatCa = await daos.services.listPublicByLocale('vi', { limit: 100, offset: 0 });
      expect(tatCa.rows.length).toBeGreaterThan(0);
    });

    it('THU TU co MOC PHA VO THE — khang dinh tren SQL sinh ra', async () => {
      /**
       * Kiem SQL, KHONG chay thu — va day la mot bai hoc toi da phai hoc hai lan.
       *
       * `published_at` co the trung nhau (nhap hang loat), va khong co moc duy
       * nhat thi thu tu giua cac trang KHONG on dinh. Nhung tren bang nho
       * PostgreSQL van tra ve thu tu on dinh theo thu tu quet, nen phep do THUC
       * NGHIEM se xanh du moc bi bo — toi tiem loi (bo `p.id ASC`) va phep do
       * khong he do.
       *
       * On dinh thu tu la mot thuoc tinh cua TRUY VAN, khong phai cua mot lan
       * chay. Nen bat SQL roi khang dinh tren no.
       */
      const cau: string[] = [];
      const dbBat = new Kysely<Database>({
        dialect: new PostgresDialect({ pool }),
        log: (e) => {
          if (e.level === 'query') cau.push(e.query.sql);
        },
      });
      const d2 = createDaoManager(dbBat);
      await d2.posts.listPublicByLocale('vi', { limit: 5, offset: 0 });

      const orderBy = cau.find((q) => /order by/i.test(q));
      expect(orderBy, 'khong bat duoc cau co ORDER BY').toBeDefined();
      expect(orderBy!.replace(/\s+/g, ' ').toLowerCase()).toMatch(
        /order by .*published_at desc nulls last, .*\bid\b asc/,
      );
    });
  });

  describe('admin read-model', () => {
    it('gom translation, tim kiem va phan trang trong mot truy van', async () => {
      const before = sqlCount;
      const result = await daos.services.listAdmin(
        { locale: 'vi', search: 'Dich vu sv-goc' },
        { pageSize: 10 },
      );

      expect(sqlCount - before).toBe(1);
      expect(result.meta.totalItems).toBe(1);
      expect(result.data[0]).toMatchObject({
        id: id['sv0'],
        kind: 'service',
        translations: [
          expect.objectContaining({
            locale: 'vi',
            title: 'Dich vu sv-goc',
            slug: s('sv-goc'),
            status: 'published',
          }),
        ],
      });
    });
  });

  // ══════════════ locale ══════════════
  describe('locale', () => {
    it('locale KHAC nhau cho ket qua KHAC nhau', async () => {
      // Bai chi co ban dich `vi` thi khong xuat hien o `en`.
      const vi = (await cs.listPosts('vi', undefined, { pageSize: 100 }))!.items.map((x) => x.slug);
      const en = (await cs.listPosts('en', undefined, { pageSize: 100 }))!.items.map((x) => x.slug);
      expect(vi).toContain(s('post-ca-hai'));
      expect(en).not.toContain(s('post-ca-hai'));
      // Bai hai ngu thi co mat o CA HAI, voi slug KHAC nhau.
      expect(vi).toContain(s('hai-vi'));
      expect(en).toContain(s('hai-en'));
    });

    it('phan hoi TU KE ra locale cua no', async () => {
      /**
       * Khong du thua du client da gui `?locale=`: mot phan hoi tu ke ngon ngu
       * thi mot ban cache dat sai khoa se lo ra ngay khi doc, thay vi hien noi
       * dung sai ngon ngu ma khong ai biet tai sao.
       */
      expect((await cs.findPost('vi', s('hai-vi')))!.locale).toBe('vi');
      expect((await cs.findPost('en', s('hai-en')))!.locale).toBe('en');
    });

    it('slug cua locale KHAC khong tra ve o locale nay', async () => {
      // `UNIQUE (locale, slug)` cho phep hai locale dung slug khac nhau; tra cuu
      // phai ton trong cap (locale, slug), khong chi slug.
      expect(await cs.findPost('en', s('hai-vi'))).toBeNull();
      expect(await cs.findPost('vi', s('hai-en'))).toBeNull();
    });
  });

  // ══════════════ hreflang (ADR-004) ══════════════
  describe('hreflang', () => {
    it('RONG khi chi mot ngon ngu duoc xuat ban', async () => {
      /**
       * Mot the `<link hreflang>` la LOI HUA voi Google rang dia chi kia ton tai
       * va doc duoc. Neu ban EN moi la ban nhap thi dia chi do tra 404, va Google
       * khong bao loi — no am tham ha do tin cay cua ca cum trang.
       */
      expect((await cs.findPost('vi', s('post-ca-hai')))!.hreflang_alternates).toEqual([]);
    });

    it('CO khi ca hai ngon ngu duoc xuat ban', async () => {
      const r = await cs.findPost('vi', s('hai-vi'));
      const locales = r!.hreflang_alternates.map((x) => x.locale).sort();
      expect(locales).toEqual(['en', 'vi']);
      expect(r!.hreflang_alternates.find((x) => x.locale === 'en')!.slug).toBe(s('hai-en'));
    });

    it('rut mot ngon ngu xuong nhap thi hreflang RONG lai', async () => {
      await daos.posts.unpublishTranslation(id['post-hai-ngu']!, 'en');
      try {
        expect((await cs.findPost('vi', s('hai-vi')))!.hreflang_alternates).toEqual([]);
      } finally {
        await daos.posts.publishTranslation(id['post-hai-ngu']!, 'en', new Date());
      }
    });
  });

  // ══════════════ cay dich vu ══════════════
  describe('cay dich vu', () => {
    it('long nhau theo `parentId` cua THUC THE', async () => {
      const cay = await cs.serviceTree('vi');
      const goc = cay.find((n) => n.slug === s('sv-goc'));
      expect(goc, 'khong thay dich vu goc').toBeDefined();
      expect(goc!.children.map((n) => n.slug)).toContain(s('sv-con'));
    });

    it('node MO COI (cha chua co ban dich) bi bo', async () => {
      await daos.services.unpublishTranslation(id['sv0']!, 'vi');
      try {
        const cay = await cs.serviceTree('vi');
        // Con khong duoc noi len goc khi cha bien mat khoi tap.
        expect(cay.map((n) => n.slug)).not.toContain(s('sv-con'));
      } finally {
        await daos.services.publishTranslation(id['sv0']!, 'vi', new Date());
      }
    });
  });

  // ══════════════ quan he + 404 vs rong ══════════════
  describe('`null` khac mang rong', () => {
    it('bo loc danh muc khong ton tai -> `null` (404)', async () => {
      expect(await cs.listPosts('vi', { categorySlug: 'khong-he-co' })).toBeNull();
      expect(await cs.postsOfCategory('vi', 'khong-he-co')).toBeNull();
    });

    it('nganh khong ton tai -> `null`; nganh co nhung chua gan -> mang RONG', async () => {
      expect(await cs.servicesOfIndustry('vi', 'khong-he-co')).toBeNull();
      const r = await cs.servicesOfIndustry('vi', s('ng'), { pageSize: 100 });
      expect(r).not.toBeNull();
      expect(r!.items.map((x) => x.slug)).toContain(s('sv-goc'));
      // `sv-con` KHONG gan nganh nay -> khong duoc xuat hien.
      expect(r!.items.map((x) => x.slug)).not.toContain(s('sv-con'));
    });

    it('danh muc co nhung chua co bai -> mang RONG, khong phai null', async () => {
      const dm2 = await daos.postCategories.insert({ name: 'Rong', slug: s('dm-rong') });
      await daos.postCategories.publish(dm2.id, new Date());
      try {
        const r = await cs.postsOfCategory('vi', s('dm-rong'));
        expect(r).not.toBeNull();
        expect(r!.items).toEqual([]);
        expect(r!.totalItems).toBe(0);
      } finally {
        await pool.query(`DELETE FROM ltv.post_categories WHERE id = $1`, [dm2.id]);
      }
    });
  });

  // ══════════════ ngan sach truy van ══════════════
  describe('ngan sach truy van', () => {
    it('danh sach bai viet: so truy van KHONG tang theo so dong', async () => {
      /**
       * Day la ly do `listPublicByLocale` phai ton tai. Voi be mat DAO cu, cach
       * duy nhat la `list()` roi `findTranslation()` cho tung dong — N+1 tren
       * dung trang duoc xem nhieu nhat.
       */
      const do1 = async (pageSize: number) => {
        const truoc = sqlCount;
        const r = await cs.listPosts('vi', undefined, { pageSize });
        return { q: sqlCount - truoc, n: r!.items.length };
      };
      const mot = await do1(1);
      const nhieu = await do1(100);
      expect(mot.n).toBe(1);
      expect(nhieu.n).toBeGreaterThan(1);
      expect(nhieu.q, `1 dong dung ${mot.q}, ${nhieu.n} dong dung ${nhieu.q}`).toBe(mot.q);
    });
  });

  // ══════════════ view ══════════════
  describe('hinh dang view', () => {
    it('KHONG lo `id`/`status`, chi snake_case', async () => {
      const d = (await cs.findPost('vi', s('post-ca-hai')))! as Record<string, unknown>;
      for (const k of ['id', 'status', 'postId', 'categoryId', 'published_at_raw']) {
        expect(d, `lo ${k}`).not.toHaveProperty(k);
      }
      for (const k of Object.keys(d)) expect(k).not.toMatch(/[A-Z]/);
    });

    it('danh muc trong the bai viet dung SLUG', async () => {
      const r = await cs.listPosts('vi', undefined, { pageSize: 100 });
      const bai = r!.items.find((x) => x.slug === s('post-ca-hai'))!;
      expect(bai.category).toEqual({ slug: s('dm'), name: 'Tin ky thuat' });
    });
  });
});
