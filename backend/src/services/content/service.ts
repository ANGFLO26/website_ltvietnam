import type {
  DocumentCardView,
  DocumentDetailView,
  Locale,
  PageDetailView,
  PostCardView,
  PostCategoryView,
  PostDetailView,
  ProjectCardView,
  ProjectDetailView,
  ServiceCardView,
  ServiceDetailView,
  ServiceTreeView,
} from '@ltv/contracts';
import { chiCo } from '../../shared/omit-undefined.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { PublicTranslationRow } from '../../dao/translation.support.js';
import type { PageArg, PagedResult } from '../taxonomy/interface.js';
import type { ContentSearchHit, ContentService } from './interface.js';
import { detailSeo, translatedDetailSeo } from '../seo/metadata.js';

export type ContentDaos = DaoScope<
  'pages' | 'services' | 'projects' | 'posts' | 'postCategories' | 'documents' | 'industries'
>;

const TRAN_TRANG = 100;

function trang(p: PageArg | undefined): { page: number; pageSize: number } {
  return {
    page: Math.max(1, Math.trunc(p?.page ?? 1)),
    pageSize: Math.min(TRAN_TRANG, Math.max(1, Math.trunc(p?.pageSize ?? 20))),
  };
}

const iso = (d: Date | null): string | null => d?.toISOString() ?? null;

export class ContentServiceImpl implements ContentService {
  constructor(
    private readonly daos: ContentDaos,
    private readonly siteUrl: string = 'http://localhost:3000',
  ) {}

  // ══════════════════════════ pages ══════════════════════════
  async findPage(locale: Locale, slug: string): Promise<PageDetailView | null> {
    const r = await this.daos.pages.findBySlug(locale, slug);
    if (!r) return null;
    /**
     * HAI dieu kien, va thieu mot cai la mot lo ro ri khac nhau.
     *
     * `findBySlug` cua tang dao KHONG loc trang thai — no la ham dung chung cho
     * ca duong quan tri (giong `findDetailBySlug` cua san pham). Nen service phai
     * loc, va phai loc CA HAI:
     *
     *   `page.status`        thuc the da duyet chua
     *   `translation.status` BAN DICH nay da duyet chua
     *
     * Kiem mot cai thoi la mot loi im lang: chi kiem thuc the thi ban dich dang
     * viet nua voi bi cong bo; chi kiem ban dich thi mot trang da rut xuong nhap
     * van con URL song.
     */
    if (r.page.status !== 'published' || r.translation.status !== 'published') return null;

    return {
      ...translatedDetailSeo(
        this.siteUrl,
        'page',
        locale,
        r.translation.slug,
        await this.daos.pages.hreflangAlternates(r.page.id),
        r.page.pageType,
      ),
      slug: r.translation.slug,
      locale,
      title: r.translation.title,
      page_type: r.page.pageType,
      summary: r.translation.summary,
      content: r.translation.content,
      seo_title: r.translation.seoTitle,
      seo_description: r.translation.seoDescription,
    };
  }

  // ══════════════════════════ services ══════════════════════════
  async listServices(
    locale: Locale,
    filter?: { featured?: boolean | undefined },
    page?: PageArg,
  ): Promise<PagedResult<ServiceCardView>> {
    const p = trang(page);
    const r = await this.daos.services.listPublicByLocale(
      locale,
      { limit: p.pageSize, offset: (p.page - 1) * p.pageSize },
      /**
       * BO HAN khoa khi khong loc, khong truyen `{ is_featured: undefined }`.
       *
       * `exactOptionalPropertyTypes` chan viec gan `undefined` cho mot khoa tuy
       * chon, nhung day khong phai chuyen cua trinh bien dich: `listPublicByLocale`
       * duyet `Object.entries(where)` va mot khoa co gia tri `undefined` se sinh
       * ra `AND p.is_featured = NULL` — luon SAI, tuc danh sach dich vu tra ve
       * RONG. Bo han khoa la cach duy nhat dung.
       */
      filter?.featured !== undefined ? { is_featured: filter.featured } : undefined,
    );
    return {
      items: await this.serviceCards(r.rows),
      page: p.page,
      pageSize: p.pageSize,
      totalItems: r.total,
    };
  }

  async serviceTree(locale: Locale): Promise<readonly ServiceTreeView[]> {
    /**
     * Lay TAT CA (lap het trang) roi dung cay o bo nho — cung cach voi cay danh
     * muc cua F1, va cung ly do: `findChildren` de quy la N+1 tren mot thanh
     * dieu huong duoc goi o moi trang.
     */
    const tatCa: PublicTranslationRow[] = [];
    let trangSo = 1;
    for (;;) {
      const r = await this.daos.services.listPublicByLocale(locale, {
        limit: TRAN_TRANG,
        offset: (trangSo - 1) * TRAN_TRANG,
      });
      tatCa.push(...r.rows);
      if (tatCa.length >= r.total || r.rows.length === 0) break;
      trangSo += 1;
      if (trangSo > 100) break;
    }

    const cards = await this.serviceCards(tatCa);
    const ent = await this.serviceEntities(tatCa.map((x) => x.entityId));

    /** Cay dung tu `parentId` cua THUC THE, khong tu `depth` cua ban dich. */
    const node = new Map<string, ServiceTreeView & { children: ServiceTreeView[] }>();
    tatCa.forEach((row, i) => {
      node.set(row.entityId, { ...cards[i]!, children: [] });
    });
    const goc: (ServiceTreeView & { children: ServiceTreeView[] })[] = [];
    for (const row of tatCa) {
      const n = node.get(row.entityId)!;
      const e = ent.get(row.entityId);
      const chaId = e?.parentId ?? null;
      if (chaId === null) {
        goc.push(n);
        continue;
      }
      const cha = node.get(chaId);
      // Node mo coi (cha chua publish / chua co ban dich) -> BO, khong noi len goc.
      if (cha) cha.children.push(n);
    }
    return goc;
  }

  async findService(locale: Locale, slug: string): Promise<ServiceDetailView | null> {
    const r = await this.daos.services.findBySlug(locale, slug);
    if (!r) return null;
    if (r.service.status !== 'published' || r.translation.status !== 'published') return null;
    return {
      ...translatedDetailSeo(
        this.siteUrl,
        'service',
        locale,
        r.translation.slug,
        await this.daos.services.hreflangAlternates(r.service.id),
      ),
      slug: r.translation.slug,
      locale,
      title: r.translation.name,
      short_description: r.translation.shortDescription,
      overview: r.translation.overview,
      customer_problems: r.translation.customerProblems,
      scope_of_work: r.translation.scopeOfWork,
      process: r.translation.process,
      benefits: r.translation.benefits,
      faq: r.translation.faq,
      featured_image_id: r.service.featuredImageId,
      depth: r.service.depth,
      seo_title: r.translation.seoTitle,
      seo_description: r.translation.seoDescription,
    };
  }

  async servicesOfIndustry(
    locale: Locale,
    industrySlug: string,
    page?: PageArg,
  ): Promise<PagedResult<ServiceCardView> | null> {
    const ng = await this.daos.industries.findBySlug(industrySlug);
    // `null` = nganh KHONG TON TAI -> 404. Mang rong = nganh co nhung chua gan
    // dich vu -> 200. Hai cau tra loi khac nhau.
    if (!ng || ng.status !== 'published') return null;

    const ids = await this.daos.services.idsByIndustry(ng.id);
    const p = trang(page);
    const r = await this.daos.services.listPublicByLocale(
      locale,
      { limit: p.pageSize, offset: (p.page - 1) * p.pageSize },
      undefined,
      ids,
    );
    return {
      items: await this.serviceCards(r.rows),
      page: p.page,
      pageSize: p.pageSize,
      totalItems: r.total,
    };
  }

  // ══════════════════════════ projects ══════════════════════════
  async listProjects(
    locale: Locale,
    filter?: { projectType?: string | undefined; featured?: boolean | undefined },
    page?: PageArg,
  ): Promise<PagedResult<ProjectCardView>> {
    const p = trang(page);
    const r = await this.daos.projects.listPublicByLocale(
      locale,
      { limit: p.pageSize, offset: (p.page - 1) * p.pageSize },
      /**
       * `chiCo` bo cac khoa chua dat.
       *
       * Hai bo loc doc lap nen khong the dung mot toan tu ba ngoi nhu truoc: voi
       * `{ project_type: x }` va `{ is_featured: true }` cung co mat thi ca hai
       * phai vao `where`. `TranslationSupport` gio da bo khoa `undefined`, nhung
       * dua ra `undefined` roi trong cho tang duoi don la dat bao dam o xa cho
       * gay loi — noi nao biet thi noi do bo.
       */
      chiCo({
        project_type: filter?.projectType,
        is_featured: filter?.featured,
      }),
    );

    /**
     * BATCH LOAD — mot truy van cho ca trang, khong mot truy van moi dong.
     *
     * `listPublicByLocale` tra ve id + slug + tieu de. The du an con can anh dai
     * dien, loai, dia diem — nam o bang CHA. Lay ca lo bang `findById` trong
     * `Promise.all` van la N truy van; nen dung `list()` mot lan roi loc trong bo
     * nho theo id.
     */
    const ent = await this.projectEntities(r.rows.map((x) => x.entityId));

    const items: ProjectCardView[] = [];
    for (const row of r.rows) {
      const e = ent.get(row.entityId);
      if (!e) continue;
      items.push({
        slug: row.slug,
        title: row.title,
        published_at: iso(row.publishedAt),
        short_description: null,
        featured_image_id: e.featuredImageId,
        project_type: e.projectType,
        location_text: e.locationText,
        completed_at: e.completedAt,
        /**
         * Ten khach hang CHI khi ho cho phep — `resolvePublicCustomerName` o tang
         * dao la noi duy nhat biet luat `customer_visibility`. Goi no cho tung
         * dong la N+1, nen o DANH SACH tra `null` va de trang chi tiet lo viec
         * do. Danh doi noi ro: the trong danh sach khong hien ten khach hang.
         */
        customer_name: null,
        is_featured: e.isFeatured,
      });
    }
    return { items, page: p.page, pageSize: p.pageSize, totalItems: r.total };
  }

  async findProject(locale: Locale, slug: string): Promise<ProjectDetailView | null> {
    const r = await this.daos.projects.findBySlug(locale, slug);
    if (!r) return null;
    if (r.project.status !== 'published' || r.translation.status !== 'published') return null;
    return {
      ...translatedDetailSeo(
        this.siteUrl,
        'project',
        locale,
        r.translation.slug,
        await this.daos.projects.hreflangAlternates(r.project.id),
      ),
      slug: r.translation.slug,
      locale,
      title: r.translation.title,
      short_description: r.translation.shortDescription,
      scope_of_work: r.translation.scopeOfWork,
      implementation: r.translation.implementation,
      result: r.translation.result,
      featured_image_id: r.project.featuredImageId,
      project_type: r.project.projectType,
      location_text: r.project.locationText,
      country_code: r.project.countryCode,
      started_at: r.project.startedAt,
      completed_at: r.project.completedAt,
      customer_name: await this.daos.projects.resolvePublicCustomerName(r.project.id, locale),
      published_at: iso(r.translation.publishedAt),
      seo_title: r.translation.seoTitle,
      seo_description: r.translation.seoDescription,
    };
  }

  // ══════════════════════════ posts ══════════════════════════
  async listPosts(
    locale: Locale,
    filter?: { categorySlug?: string | undefined },
    page?: PageArg,
  ): Promise<PagedResult<PostCardView> | null> {
    let categoryId: string | undefined;
    if (filter?.categorySlug !== undefined) {
      const c = await this.daos.postCategories.findBySlug(filter.categorySlug);
      if (!c || c.status !== 'published') return null;
      categoryId = c.id;
    }
    return this.postsBy(locale, categoryId, page);
  }

  async postsOfCategory(
    locale: Locale,
    slug: string,
    page?: PageArg,
  ): Promise<PagedResult<PostCardView> | null> {
    const c = await this.daos.postCategories.findBySlug(slug);
    if (!c || c.status !== 'published') return null;
    return this.postsBy(locale, c.id, page);
  }

  private async postsBy(
    locale: Locale,
    categoryId: string | undefined,
    page?: PageArg,
  ): Promise<PagedResult<PostCardView>> {
    const p = trang(page);
    const r = await this.daos.posts.listPublicByLocale(
      locale,
      { limit: p.pageSize, offset: (p.page - 1) * p.pageSize },
      categoryId !== undefined ? { category_id: categoryId } : undefined,
    );

    const ent = await this.postEntities(r.rows.map((x) => x.entityId));
    /** Danh muc lay CA LO mot lan, khong mot truy van moi bai. */
    const catIds = [...new Set([...ent.values()].map((e) => e.categoryId))];
    const cats = await this.postCategoryMap(catIds);

    const items: PostCardView[] = [];
    for (const row of r.rows) {
      const e = ent.get(row.entityId);
      if (!e) continue;
      items.push({
        slug: row.slug,
        title: row.title,
        published_at: iso(row.publishedAt),
        excerpt: null,
        featured_image_id: e.featuredImageId,
        category: cats.get(e.categoryId) ?? null,
        is_featured: e.isFeatured,
      });
    }
    return { items, page: p.page, pageSize: p.pageSize, totalItems: r.total };
  }

  async findPost(locale: Locale, slug: string): Promise<PostDetailView | null> {
    const r = await this.daos.posts.findBySlug(locale, slug);
    if (!r) return null;
    if (r.post.status !== 'published' || r.translation.status !== 'published') return null;
    const cats = await this.postCategoryMap([r.post.categoryId]);
    return {
      ...translatedDetailSeo(
        this.siteUrl,
        'post',
        locale,
        r.translation.slug,
        await this.daos.posts.hreflangAlternates(r.post.id),
      ),
      slug: r.translation.slug,
      locale,
      title: r.translation.title,
      excerpt: r.translation.excerpt,
      content: r.translation.content,
      featured_image_id: r.post.featuredImageId,
      category: cats.get(r.post.categoryId) ?? null,
      published_at: iso(r.translation.publishedAt),
      seo_title: r.translation.seoTitle,
      seo_description: r.translation.seoDescription,
    };
  }

  // ══════════════ post categories (khong co ban dich) ══════════════
  async listPostCategories(page?: PageArg): Promise<PagedResult<PostCategoryView>> {
    const p = trang(page);
    const r = await this.daos.postCategories.list({ status: 'published' }, p);
    /**
     * `countPosts` la MOT truy van MOI danh muc — N+1 that su, va toi de no o
     * day CO Y THUC.
     *
     * So danh muc tin la con so nho va co dinh (thuong duoi 10): day khong phai
     * danh sach tang theo du lieu nguoi dung. Viet mot truy van gop cho no doi
     * lay mot ham DAO chi dung o mot cho.
     *
     * Nguong ro rang: neu so danh muc vuot khoang 20 thi phai gop. Ghi lai de
     * lan sau ai doc thi biet day la lua chon co dieu kien, khong phai su bo sot.
     */
    const items = await Promise.all(
      r.data.map(async (c) => ({
        slug: c.slug,
        name: c.name,
        depth: c.depth,
        post_count: await this.daos.postCategories.countPosts(c.id),
      })),
    );
    return { items, page: p.page, pageSize: p.pageSize, totalItems: r.meta.totalItems };
  }

  // ══════════════════ documents (khong co ban dich) ══════════════════
  async listDocuments(
    filter?: { documentType?: string | undefined },
    page?: PageArg,
  ): Promise<PagedResult<DocumentCardView>> {
    const p = trang(page);
    const r = await this.daos.documents.list(
      {
        status: 'published',
        ...(filter?.documentType !== undefined
          ? { documentType: filter.documentType as never }
          : {}),
      },
      p,
    );
    return {
      items: r.data.map((d) => ({
        slug: d.slug,
        title: d.title,
        document_type: d.documentType,
        file_size_bytes: null,
        page_count: null,
        is_public: d.visibility === 'public',
      })),
      page: p.page,
      pageSize: p.pageSize,
      totalItems: r.meta.totalItems,
    };
  }

  async findDocument(slug: string): Promise<DocumentDetailView | null> {
    const d = await this.daos.documents.findBySlug(slug);
    if (!d || d.status !== 'published') return null;
    return {
      ...detailSeo(this.siteUrl, `/resources/${d.slug}`),
      slug: d.slug,
      title: d.title,
      document_type: d.documentType,
      file_size_bytes: null,
      page_count: null,
      is_public: d.visibility === 'public',
      description: d.description,
      download_count: d.downloadCount,
    };
  }

  // ══════════════════════════ batch load ══════════════════════════
  /**
   * Lay thuc the theo LO. Mot truy van cho ca trang, khong mot truy van moi dong.
   *
   * `list()` tra ve tap da loc `published`, va ta chi giu lai nhung id dang can.
   * Cach nay ton mot truy van doc hoi nhieu hon can thiet, nhung no la MOT truy
   * van — con `findById` cho tung dong la 20.
   */
  private async serviceEntities(ids: readonly string[]) {
    if (ids.length === 0) return new Map<string, { parentId: string | null }>();
    const r = await this.daos.services.list(
      { status: 'published' },
      { page: 1, pageSize: TRAN_TRANG },
    );
    const can = new Set(ids);
    return new Map(
      r.data.filter((x) => can.has(x.id)).map((x) => [x.id, { parentId: x.parentId }]),
    );
  }

  private async serviceCards(rows: readonly PublicTranslationRow[]): Promise<ServiceCardView[]> {
    if (rows.length === 0) return [];
    const ent = await this.serviceEntitiesFull(rows.map((x) => x.entityId));
    return rows.flatMap((row) => {
      const e = ent.get(row.entityId);
      if (!e) return [];
      return [
        {
          slug: row.slug,
          title: row.title,
          published_at: iso(row.publishedAt),
          short_description: null,
          featured_image_id: e.featuredImageId,
          depth: e.depth,
          is_featured: e.isFeatured,
        },
      ];
    });
  }

  private async serviceEntitiesFull(ids: readonly string[]) {
    const r = await this.daos.services.list(
      { status: 'published' },
      { page: 1, pageSize: TRAN_TRANG },
    );
    const can = new Set(ids);
    return new Map(
      r.data
        .filter((x) => can.has(x.id))
        .map((x) => [
          x.id,
          { featuredImageId: x.featuredImageId, depth: x.depth, isFeatured: x.isFeatured },
        ]),
    );
  }

  private async projectEntities(ids: readonly string[]) {
    if (ids.length === 0) return new Map<string, never>();
    const r = await this.daos.projects.list(
      { status: 'published' },
      { page: 1, pageSize: TRAN_TRANG },
    );
    const can = new Set(ids);
    return new Map(
      r.data
        .filter((x) => can.has(x.id))
        .map((x) => [
          x.id,
          {
            featuredImageId: x.featuredImageId,
            projectType: x.projectType,
            locationText: x.locationText,
            completedAt: x.completedAt,
            isFeatured: x.isFeatured,
          },
        ]),
    );
  }

  private async postEntities(ids: readonly string[]) {
    if (ids.length === 0) return new Map<string, never>();
    const r = await this.daos.posts.list(
      { status: 'published' },
      { page: 1, pageSize: TRAN_TRANG },
    );
    const can = new Set(ids);
    return new Map(
      r.data
        .filter((x) => can.has(x.id))
        .map((x) => [
          x.id,
          {
            categoryId: x.categoryId,
            featuredImageId: x.featuredImageId,
            isFeatured: x.isFeatured,
          },
        ]),
    );
  }

  /**
   * Tim kiem ba nhom noi dung theo locale.
   *
   * Ba truy van SONG SONG chu khong tuan tu: chung doc lap nhau, va `/tim-kiem`
   * la trang nguoi dung dang ngoi doi ket qua.
   *
   * Thu tu ghep — dich vu, du an, bai viet — la co y va on dinh: nguoi tim mot
   * tu khoa ky thuat thuong can nang luc cung cap truoc, tin tuc sau cung.
   */
  async searchContent(
    locale: Locale,
    q: string,
    limit: number,
  ): Promise<{ items: readonly ContentSearchHit[]; total: number }> {
    const tuKhoa = q.trim();
    if (tuKhoa === '') return { items: [], total: 0 };

    const page = { limit: Math.min(TRAN_TRANG, Math.max(1, Math.trunc(limit))), offset: 0 };
    const [services, projects, posts] = await Promise.all([
      this.daos.services.listPublicByLocale(locale, page, undefined, undefined, tuKhoa),
      this.daos.projects.listPublicByLocale(locale, page, undefined, undefined, tuKhoa),
      this.daos.posts.listPublicByLocale(locale, page, undefined, undefined, tuKhoa),
    ]);

    const hit = (type: ContentSearchHit['type']) => (row: PublicTranslationRow) => ({
      type,
      slug: row.slug,
      title: row.title,
      subtitle: row.summary,
    });

    return {
      items: [
        ...services.rows.map(hit('service')),
        ...projects.rows.map(hit('project')),
        ...posts.rows.map(hit('post')),
      ],
      total: services.total + projects.total + posts.total,
    };
  }

  private async postCategoryMap(ids: readonly string[]) {
    const ra = new Map<string, { slug: string; name: string }>();
    if (ids.length === 0) return ra;
    const r = await this.daos.postCategories.list(
      { status: 'published' },
      { page: 1, pageSize: TRAN_TRANG },
    );
    const can = new Set(ids);
    for (const c of r.data) if (can.has(c.id)) ra.set(c.id, { slug: c.slug, name: c.name });
    return ra;
  }
}
