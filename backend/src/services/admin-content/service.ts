import {
  extractMediaIds,
  type AdminContentListItemView,
  type ContentBlock,
  type Locale,
} from '@ltv/contracts';
import { ConflictError, DomainError, NotFoundError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { PublishService } from '../shared/publish.interface.js';
import type { SlugService } from '../shared/slug.interface.js';
import type { AdminContentFilter, AdminContentKind, AdminContentService } from './interface.js';

export type AdminContentDaos = DaoScope<
  'services' | 'projects' | 'posts' | 'pages' | 'postCategories' | 'redirects' | 'contentMediaRefs'
>;

export class AdminContentServiceImpl implements AdminContentService {
  constructor(
    private readonly daos: AdminContentDaos,
    private readonly slugs: SlugService,
    private readonly publisher: PublishService,
  ) {}

  async list(
    kind: AdminContentKind,
    filter: AdminContentFilter,
    page: { page: number; pageSize: number },
  ) {
    const result = await this.listAdminDao(kind, filter, page);
    return {
      items: result.data.map((row) => contentListView(row, filter.locale)),
      page: result.meta.page,
      pageSize: result.meta.pageSize,
      totalItems: result.meta.totalItems,
    };
  }

  async findById(kind: AdminContentKind, id: string) {
    const entity = await this.require(kind, id);
    const translations = (
      await Promise.all([
        this.findTranslation(kind, id, 'vi'),
        this.findTranslation(kind, id, 'en'),
      ])
    ).filter((translation) => translation !== null);
    const links = kind === 'page' ? {} : await this.findLinks(kind, id);
    const media =
      kind === 'project'
        ? await this.daos.projects.findMedia(id)
        : kind === 'post'
          ? await this.daos.posts.findMedia(id)
          : [];
    return { kind, entity, translations, links, media };
  }

  async create(kind: AdminContentKind, input: Record<string, unknown>, actorId: string) {
    const entity = await this.daos.transaction(async (tx) => {
      const created = await insertTx(tx, kind, { ...input, createdBy: actorId });
      await updateEntity(tx, kind, created.id, { ...input, updatedBy: actorId });
      if (kind !== 'page' && hasLinks(input)) await replaceLinksTx(tx, kind, created.id, input);
      if (kind === 'project' && input.media !== undefined)
        await tx.projects.replaceMedia(created.id, input.media as never);
      if (kind === 'post' && input.media !== undefined)
        await tx.posts.replaceMedia(created.id, input.media as string[]);
      return created;
    });
    return this.findById(kind, entity.id);
  }

  async update(
    kind: AdminContentKind,
    id: string,
    input: Record<string, unknown>,
    actorId: string,
  ) {
    await this.require(kind, id);
    const fields = { ...input };
    const parentId = fields.parentId;
    for (const key of [
      'productIds',
      'brandIds',
      'industryIds',
      'serviceIds',
      'projectIds',
      'media',
      'parentId',
    ])
      delete fields[key];
    if (parentId !== undefined && kind !== 'service') {
      throw new DomainError('PARENT_NOT_SUPPORTED', `${kind} khong phai cau truc cay`);
    }
    await this.daos.transaction(async (tx) => {
      if (Object.keys(fields).length > 0)
        await updateEntity(tx, kind, id, { ...fields, updatedBy: actorId });
      if (kind !== 'page' && hasLinks(input)) await replaceLinksTx(tx, kind, id, input);
      if (kind === 'project' && input.media !== undefined)
        await tx.projects.replaceMedia(id, input.media as never);
      if (kind === 'post' && input.media !== undefined)
        await tx.posts.replaceMedia(id, input.media as string[]);
      if (parentId !== undefined) await tx.services.moveNode(id, parentId as string | null);
    });
    return this.findById(kind, id);
  }

  async upsertTranslation(
    kind: AdminContentKind,
    id: string,
    locale: Locale,
    input: Record<string, unknown>,
  ) {
    await this.require(kind, id);
    const current = (await this.findTranslation(kind, id, locale)) as unknown as Record<
      string,
      unknown
    > | null;
    const status = input.status as string | undefined;
    const changes = { ...input };
    delete changes.status;

    if (Object.keys(changes).length > 0 || !current) {
      const translation = mergeTranslation(kind, locale, current, changes);
      const slug = translation.slug as string;
      if (!current || current.slug !== slug) {
        await this.slugs.assertAvailable({ entity: kind, locale, slug, exceptId: id });
      }
      await this.daos.transaction(async (tx) => {
        await upsertTranslationTx(tx, kind, id, translation);
        await syncTranslationRefs(tx, kind, id, locale, changes);
        if (current && current.slug !== slug && current.firstPublishedAt !== null) {
          await tx.redirects.createCollapsingChain({
            sourcePath: this.slugs.publicPath(kind, current.slug as string, locale),
            targetPath: this.slugs.publicPath(kind, slug, locale),
            redirectType: 301,
          });
        }
      });
    }
    if (status === 'published') {
      try {
        await this.publisher.publish({ entity: kind, id, locale });
      } catch (error) {
        if (error instanceof ConflictError && error.code === 'PUBLISH_PRECONDITION_FAILED') {
          throw new DomainError(error.code, error.message, 'VALIDATION_FAILED', error.details);
        }
        throw error;
      }
    } else if (status === 'hidden') await this.publisher.unpublish({ entity: kind, id, locale });
    return this.findTranslation(kind, id, locale);
  }

  async delete(kind: AdminContentKind, id: string, hard: boolean) {
    const entity = (await this.require(kind, id)) as { status: string };
    if (kind === 'page' && !(await this.daos.pages.canDelete(id))) {
      throw new ConflictError('SYSTEM_PAGE_DELETE_FORBIDDEN', 'Khong duoc xoa trang he thong');
    }
    if (hard) {
      const translations = await this.listTranslations(kind, id);
      if (entity.status !== 'draft' || translations.some((row) => row.firstPublishedAt !== null)) {
        throw new ConflictError(
          'HARD_DELETE_NOT_ALLOWED',
          'Noi dung da tung cong khai hoac khong con la ban nhap',
        );
      }
      await this.daos.transaction(async (tx) => {
        await tx.contentMediaRefs.deleteForEntity(`${kind}_translation`, id);
        switch (kind) {
          case 'service':
            await tx.services.hardDelete(id);
            return;
          case 'project':
            await tx.projects.hardDelete(id);
            return;
          case 'post':
            await tx.posts.hardDelete(id);
            return;
          case 'page':
            await tx.pages.hardDelete(id);
            return;
        }
      });
      return;
    }
    await softDelete(this.daos, kind, id);
  }
  async restore(kind: AdminContentKind, id: string) {
    await restore(this.daos, kind, id);
    return this.findById(kind, id);
  }

  async listPostCategories(
    filter: Record<string, unknown>,
    page: { page: number; pageSize: number },
  ) {
    const r = await this.daos.postCategories.list(filter, page);
    return {
      items: r.data,
      page: r.meta.page,
      pageSize: r.meta.pageSize,
      totalItems: r.meta.totalItems,
    };
  }
  findPostCategory(id: string) {
    return requireRow(this.daos.postCategories.findById(id), 'POST_CATEGORY', id);
  }
  async createPostCategory(input: Record<string, unknown>) {
    await this.slugs.assertAvailable({ entity: 'post_category', slug: input.slug as string });
    return this.daos.postCategories.insert({ ...input, initialStatus: 'draft' } as never);
  }
  async updatePostCategory(id: string, input: Record<string, unknown>) {
    const current = (await this.findPostCategory(id)) as {
      slug: string;
      firstPublishedAt: Date | null;
    };
    if (input.slug !== undefined && input.slug !== current.slug) {
      await this.slugs.rename({
        entity: 'post_category',
        id,
        slug: input.slug as string,
        currentSlug: current.slug,
        wasEverPublished: current.firstPublishedAt !== null,
      });
    }
    const fields = { ...input };
    const parentId = fields.parentId;
    delete fields.parentId;
    delete fields.slug;
    if (Object.keys(fields).length > 0) await this.daos.postCategories.update(id, fields);
    if (parentId !== undefined)
      await this.daos.postCategories.moveNode(id, parentId as string | null);
    return this.findPostCategory(id);
  }
  async publishPostCategory(id: string) {
    await this.findPostCategory(id);
    return this.daos.postCategories.publish(id, new Date());
  }
  async hidePostCategory(id: string) {
    await this.findPostCategory(id);
    return this.daos.postCategories.unpublish(id);
  }
  async deletePostCategory(id: string, hard: boolean) {
    await this.findPostCategory(id);
    if (hard) {
      if (!(await this.slugs.canHardDelete('post_category', id)))
        throw new ConflictError(
          'HARD_DELETE_NOT_ALLOWED',
          'Danh muc da tung cong khai hoac co phu thuoc',
        );
      return this.daos.postCategories.hardDelete(id);
    }
    await this.daos.postCategories.softDelete(id, new Date());
  }
  async restorePostCategory(id: string) {
    await this.daos.postCategories.restore(id);
    return this.findPostCategory(id);
  }

  private listAdminDao(
    kind: AdminContentKind,
    filter: AdminContentFilter,
    page: { page: number; pageSize: number },
  ) {
    const common = {
      status: filter.status,
      translationStatus: filter.translationStatus,
      locale: filter.locale,
      search: filter.search,
      includeDeleted: filter.includeDeleted,
    };
    switch (kind) {
      case 'service':
        return this.daos.services.listAdmin(
          {
            ...common,
            where: { parent_id: filter.parentId, is_featured: filter.isFeatured },
          },
          page,
        );
      case 'project':
        return this.daos.projects.listAdmin(
          {
            ...common,
            where: { project_type: filter.projectType, is_featured: filter.isFeatured },
          },
          page,
        );
      case 'post':
        return this.daos.posts.listAdmin(
          {
            ...common,
            where: { category_id: filter.categoryId, is_featured: filter.isFeatured },
          },
          page,
        );
      case 'page':
        return this.daos.pages.listAdmin(common, page);
    }
  }
  private require(kind: AdminContentKind, id: string) {
    switch (kind) {
      case 'service':
        return requireRow(this.daos.services.findById(id), 'SERVICE', id);
      case 'project':
        return requireRow(this.daos.projects.findById(id), 'PROJECT', id);
      case 'post':
        return requireRow(this.daos.posts.findById(id), 'POST', id);
      case 'page':
        return requireRow(this.daos.pages.findById(id), 'PAGE', id);
    }
  }
  private listTranslations(kind: AdminContentKind, id: string) {
    switch (kind) {
      case 'service':
        return this.daos.services.listTranslations(id);
      case 'project':
        return this.daos.projects.listTranslations(id);
      case 'post':
        return this.daos.posts.listTranslations(id);
      case 'page':
        return this.daos.pages.listTranslations(id);
    }
  }
  private findTranslation(kind: AdminContentKind, id: string, locale: Locale) {
    switch (kind) {
      case 'service':
        return this.daos.services.findTranslation(id, locale);
      case 'project':
        return this.daos.projects.findTranslation(id, locale);
      case 'post':
        return this.daos.posts.findTranslation(id, locale);
      case 'page':
        return this.daos.pages.findTranslation(id, locale);
    }
  }
  private findLinks(kind: Exclude<AdminContentKind, 'page'>, id: string) {
    switch (kind) {
      case 'service':
        return this.daos.services.findLinks(id);
      case 'project':
        return this.daos.projects.findLinks(id);
      case 'post':
        return this.daos.posts.findLinks(id);
    }
  }
}

function contentListView(
  row: Awaited<ReturnType<AdminContentDaos['pages']['listAdmin']>>['data'][number],
  preferredLocale?: Locale,
): AdminContentListItemView {
  const preferred =
    (preferredLocale === undefined
      ? row.translations.find((item) => item.locale === 'vi')
      : row.translations.find((item) => item.locale === preferredLocale)) ?? row.translations[0];
  return {
    id: row.id,
    kind: row.kind,
    title: preferred?.title ?? null,
    slug: preferred?.slug ?? null,
    status: row.status,
    translations: row.translations.map((item) => ({
      locale: item.locale,
      title: item.title,
      slug: item.slug,
      status: item.status,
      published_at: item.publishedAt?.toISOString() ?? null,
    })),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    deleted_at: row.deletedAt?.toISOString() ?? null,
  };
}

async function requireRow<T>(p: Promise<T | null>, kind: string, id: string) {
  const v = await p;
  if (!v)
    throw new NotFoundError(`${kind}_NOT_FOUND`, `Khong tim thay ${kind.toLowerCase()} ${id}`);
  return v;
}

const TRANSLATION_FIELDS: Record<AdminContentKind, readonly string[]> = {
  service: [
    'name',
    'slug',
    'shortDescription',
    'overview',
    'customerProblems',
    'scopeOfWork',
    'process',
    'benefits',
    'faq',
    'seoTitle',
    'seoDescription',
  ],
  project: [
    'title',
    'slug',
    'shortDescription',
    'scopeOfWork',
    'implementation',
    'result',
    'customerDisplayName',
    'seoTitle',
    'seoDescription',
  ],
  post: ['title', 'slug', 'excerpt', 'content', 'seoTitle', 'seoDescription'],
  page: ['title', 'slug', 'summary', 'content', 'seoTitle', 'seoDescription'],
};

function mergeTranslation(
  kind: AdminContentKind,
  locale: Locale,
  current: Record<string, unknown> | null,
  changes: Record<string, unknown>,
): Record<string, unknown> {
  const requiredTitle = kind === 'service' ? 'name' : 'title';
  const missing = [requiredTitle, 'slug'].filter(
    (field) => !Object.hasOwn(changes, field) && (current === null || current[field] === undefined),
  );
  if (missing.length > 0) {
    throw new DomainError(
      'VALIDATION_FAILED',
      'Ban dich moi phai co tieu de va slug',
      'VALIDATION_FAILED',
      { fields: missing.map((field) => ({ field, message: 'Truong bat buoc khi tao ban dich' })) },
    );
  }

  const merged: Record<string, unknown> = { locale };
  for (const field of TRANSLATION_FIELDS[kind]) {
    if (Object.hasOwn(changes, field)) merged[field] = changes[field];
    else if (current && Object.hasOwn(current, field)) merged[field] = current[field];
  }
  return merged;
}
function hasLinks(i: Record<string, unknown>) {
  return ['productIds', 'brandIds', 'industryIds', 'serviceIds', 'projectIds'].some(
    (k) => i[k] !== undefined,
  );
}
async function updateEntity(
  tx: Pick<AdminContentDaos, 'services' | 'projects' | 'posts' | 'pages'>,
  k: AdminContentKind,
  id: string,
  i: Record<string, unknown>,
) {
  switch (k) {
    case 'service':
      await tx.services.update(id, i as never);
      return;
    case 'project':
      await tx.projects.update(id, i as never);
      return;
    case 'post':
      await tx.posts.update(id, i as never);
      return;
    case 'page':
      await tx.pages.update(id, i as never);
      return;
  }
}
async function insertTx(
  tx: Pick<AdminContentDaos, 'services' | 'projects' | 'posts' | 'pages'>,
  k: AdminContentKind,
  i: Record<string, unknown>,
) {
  switch (k) {
    case 'service':
      return tx.services.insert(i as never);
    case 'project':
      return tx.projects.insert(i as never);
    case 'post':
      return tx.posts.insert(i as never);
    case 'page':
      return tx.pages.insert(i as never);
  }
}
async function replaceLinksTx(
  tx: Pick<AdminContentDaos, 'services' | 'projects' | 'posts'>,
  k: Exclude<AdminContentKind, 'page'>,
  id: string,
  i: Record<string, unknown>,
) {
  const l = {
    productIds: i.productIds,
    brandIds: i.brandIds,
    industryIds: i.industryIds,
    serviceIds: i.serviceIds,
    projectIds: i.projectIds,
  };
  switch (k) {
    case 'service':
      await tx.services.replaceLinks(id, l as never);
      return;
    case 'project':
      await tx.projects.replaceLinks(id, l as never);
      return;
    case 'post':
      await tx.posts.replaceLinks(id, l as never);
      return;
  }
}
async function upsertTranslationTx(
  tx: Pick<AdminContentDaos, 'services' | 'projects' | 'posts' | 'pages'>,
  k: AdminContentKind,
  id: string,
  i: Record<string, unknown>,
) {
  switch (k) {
    case 'service':
      return tx.services.upsertTranslation(id, i as never);
    case 'project':
      return tx.projects.upsertTranslation(id, i as never);
    case 'post':
      return tx.posts.upsertTranslation(id, i as never);
    case 'page':
      return tx.pages.upsertTranslation(id, i as never);
  }
}
async function syncTranslationRefs(
  tx: Pick<AdminContentDaos, 'contentMediaRefs'>,
  k: AdminContentKind,
  id: string,
  locale: Locale,
  i: Record<string, unknown>,
) {
  for (const [field, value] of Object.entries(i)) {
    if (
      !Array.isArray(value) ||
      ![
        'overview',
        'customerProblems',
        'scopeOfWork',
        'process',
        'benefits',
        'implementation',
        'result',
        'content',
      ].includes(field)
    )
      continue;
    await tx.contentMediaRefs.replaceForField(
      { entityType: `${k}_translation`, entityId: id, locale, fieldName: field },
      extractMediaIds({ version: 1, blocks: value as ContentBlock[] }),
    );
  }
}
async function softDelete(d: AdminContentDaos, k: AdminContentKind, id: string) {
  const at = new Date();
  switch (k) {
    case 'service':
      return d.services.softDelete(id, at);
    case 'project':
      return d.projects.softDelete(id, at);
    case 'post':
      return d.posts.softDelete(id, at);
    case 'page':
      return d.pages.softDelete(id, at);
  }
}
async function restore(d: AdminContentDaos, k: AdminContentKind, id: string) {
  switch (k) {
    case 'service':
      return d.services.restore(id);
    case 'project':
      return d.projects.restore(id);
    case 'post':
      return d.posts.restore(id);
    case 'page':
      return d.pages.restore(id);
  }
}
