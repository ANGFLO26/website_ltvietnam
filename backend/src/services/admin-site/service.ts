import { adminHomepageSettingsIssues } from '@ltv/contracts';
import { ConflictError, DomainError, NotFoundError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { AppDocument, DocumentLinks } from '../../dao/documents/object.js';
import type { MenuItem } from '../../dao/menus/object.js';
import type { PublishService } from '../shared/publish.interface.js';
import type { SlugService } from '../shared/slug.interface.js';
import type { TtlCache } from '../../shared/cache.js';
import type { AdminSiteService } from './interface.js';

export type AdminSiteDaos = DaoScope<
  'documents' | 'customers' | 'offices' | 'banners' | 'homepageSections' | 'menus'
>;

export class AdminSiteServiceImpl implements AdminSiteService {
  constructor(
    private readonly daos: AdminSiteDaos,
    private readonly slugs: SlugService,
    private readonly publisher: PublishService,
    private readonly siteCache?: TtlCache,
  ) {}

  async listDocuments(filter: Record<string, unknown>, page: { page: number; pageSize: number }) {
    const result = await this.daos.documents.list(filter, page);
    return paged(result);
  }

  async findDocument(id: string) {
    const document = await this.requireDocument(id);
    return { document, links: await this.daos.documents.findLinks(id) };
  }

  async createDocument(input: Parameters<AdminSiteService['createDocument']>[0]) {
    await this.slugs.assertAvailable({ entity: 'document', slug: input.slug });
    const document = await this.daos.transaction(async (tx) => {
      const created = await tx.documents.insert(
        documentFields(input) as Parameters<typeof tx.documents.insert>[0],
      );
      await tx.documents.replaceLinks(created.id, linkFields(input));
      return created;
    });
    return document;
  }

  async updateDocument(id: string, input: Parameters<AdminSiteService['updateDocument']>[1]) {
    const current = await this.requireDocument(id);
    if (input.slug !== undefined && input.slug !== current.slug) {
      await this.slugs.rename({
        entity: 'document',
        id,
        slug: input.slug,
        currentSlug: current.slug,
        wasEverPublished: current.firstPublishedAt !== null,
      });
    }
    return this.daos.transaction(async (tx) => {
      const withoutSlug = { ...input };
      delete withoutSlug.slug;
      const fields = documentFields(withoutSlug);
      let updated: AppDocument = current;
      if (Object.values(fields).some((value) => value !== undefined)) {
        updated = await tx.documents.update(id, fields);
      }
      if (hasLinks(input)) await tx.documents.replaceLinks(id, linkFields(input));
      return updated.slug === current.slug && input.slug !== undefined
        ? ((await tx.documents.findById(id)) ?? updated)
        : updated;
    });
  }

  async publishDocument(id: string) {
    await this.requireDocument(id);
    try {
      await this.publisher.publish({ entity: 'document', id });
    } catch (error) {
      if (error instanceof ConflictError && error.code === 'PUBLISH_PRECONDITION_FAILED') {
        throw new DomainError(error.code, error.message, 'VALIDATION_FAILED', error.details);
      }
      throw error;
    }
    return this.requireDocument(id);
  }

  async hideDocument(id: string) {
    await this.requireDocument(id);
    await this.publisher.unpublish({ entity: 'document', id });
    return this.requireDocument(id);
  }

  async deleteDocument(id: string, hard: boolean): Promise<void> {
    await this.requireDocument(id);
    if (!hard) return this.daos.documents.softDelete(id, new Date());
    if (!(await this.slugs.canHardDelete('document', id))) {
      throw new ConflictError(
        'HARD_DELETE_NOT_ALLOWED',
        'Tai lieu da tung cong khai hoac dang co phu thuoc',
      );
    }
    await this.daos.documents.hardDelete(id);
  }

  async restoreDocument(id: string) {
    await this.daos.documents.restore(id);
    return this.requireDocument(id);
  }

  async listCustomers(filter: Record<string, unknown>, page: { page: number; pageSize: number }) {
    return paged(await this.daos.customers.list(filter, page));
  }
  findCustomer(id: string) {
    return requireRow(this.daos.customers.findById(id), 'CUSTOMER', id);
  }
  async createCustomer(input: Parameters<AdminSiteService['createCustomer']>[0]) {
    const result = await this.daos.transaction(async (tx) => {
      const created = await tx.customers.insert(input);
      return tx.customers.update(created.id, input);
    });
    this.invalidateHome();
    return result;
  }
  async updateCustomer(id: string, input: Parameters<AdminSiteService['updateCustomer']>[1]) {
    await this.findCustomer(id);
    const result = await this.daos.customers.update(id, input);
    this.invalidateHome();
    return result;
  }
  async publishCustomer(id: string) {
    await this.findCustomer(id);
    const result = await this.daos.customers.publish(id, new Date());
    this.invalidateHome();
    return result;
  }
  async hideCustomer(id: string) {
    await this.findCustomer(id);
    const result = await this.daos.customers.unpublish(id);
    this.invalidateHome();
    return result;
  }
  async deleteCustomer(id: string) {
    await this.findCustomer(id);
    await this.daos.customers.softDelete(id, new Date());
    this.invalidateHome();
  }
  async restoreCustomer(id: string) {
    await this.daos.customers.restore(id);
    const result = await this.findCustomer(id);
    this.invalidateHome();
    return result;
  }

  listOffices(filter: Record<string, unknown>) {
    return this.daos.offices.list(filter);
  }
  findOffice(id: string) {
    return requireRow(this.daos.offices.findById(id), 'OFFICE', id);
  }
  async createOffice(input: Parameters<AdminSiteService['createOffice']>[0]) {
    const result = await this.daos.transaction(async (tx) => {
      const created = await tx.offices.insert({ ...input, initialStatus: 'draft' });
      return tx.offices.update(created.id, input);
    });
    this.invalidateHome();
    return result;
  }
  async updateOffice(id: string, input: Parameters<AdminSiteService['updateOffice']>[1]) {
    await this.findOffice(id);
    const result = await this.daos.offices.update(id, input);
    this.invalidateHome();
    return result;
  }
  async publishOffice(id: string) {
    await this.findOffice(id);
    const result = await this.daos.offices.publish(id);
    this.invalidateHome();
    return result;
  }
  async hideOffice(id: string) {
    await this.findOffice(id);
    const result = await this.daos.offices.unpublish(id);
    this.invalidateHome();
    return result;
  }
  async deleteOffice(id: string) {
    await this.findOffice(id);
    await this.daos.offices.delete(id);
    this.invalidateHome();
  }

  listBanners(filter: Record<string, unknown>) {
    return this.daos.banners.list(filter);
  }
  findBanner(id: string) {
    return requireRow(this.daos.banners.findById(id), 'BANNER', id);
  }
  async createBanner(input: Parameters<AdminSiteService['createBanner']>[0]) {
    const result = await this.daos.transaction(async (tx) => {
      const created = await tx.banners.insert(input);
      return tx.banners.update(created.id, input);
    });
    this.invalidateHome();
    return result;
  }
  async updateBanner(id: string, input: Parameters<AdminSiteService['updateBanner']>[1]) {
    await this.findBanner(id);
    const result = await this.daos.banners.update(id, input);
    this.invalidateHome();
    return result;
  }
  async publishBanner(id: string) {
    await this.findBanner(id);
    const result = await this.daos.banners.publish(id);
    this.invalidateHome();
    return result;
  }
  async hideBanner(id: string) {
    await this.findBanner(id);
    const result = await this.daos.banners.unpublish(id);
    this.invalidateHome();
    return result;
  }
  async deleteBanner(id: string) {
    await this.findBanner(id);
    await this.daos.banners.delete(id);
    this.invalidateHome();
  }

  homepage() {
    return this.daos.homepageSections.listAll();
  }
  async updateHomepage(input: Parameters<AdminSiteService['updateHomepage']>[0]) {
    const issues = adminHomepageSettingsIssues(input.sectionType, input.settings ?? {});
    if (issues.length > 0)
      throw new DomainError(
        'HOMEPAGE_SETTINGS_INVALID',
        'Cau hinh homepage khong hop le',
        'VALIDATION_FAILED',
        {
          fields: issues.map((message) => ({ field: 'settings', message })),
        },
      );
    const result = await this.daos.homepageSections.upsert(input);
    this.invalidateHome();
    return result;
  }

  async listMenus() {
    const menus = await this.daos.menus.listAll();
    const result = [];
    for (const menu of menus)
      result.push({ ...menu, items: await this.daos.menus.listItems(menu.id) });
    return result;
  }
  async createMenu(input: Parameters<AdminSiteService['createMenu']>[0]) {
    const result = await this.daos.menus.insert(input);
    this.invalidateNavigation();
    return result;
  }
  async updateMenu(id: string, input: Parameters<AdminSiteService['updateMenu']>[1]) {
    await requireRow(this.daos.menus.findById(id), 'MENU', id);
    const result = await this.daos.menus.update(id, input);
    this.invalidateNavigation();
    return result;
  }
  async deleteMenu(id: string) {
    await requireRow(this.daos.menus.findById(id), 'MENU', id);
    await this.daos.menus.delete(id);
    this.invalidateNavigation();
  }
  async addMenuItem(menuId: string, input: Parameters<AdminSiteService['addMenuItem']>[1]) {
    await requireRow(this.daos.menus.findById(menuId), 'MENU', menuId);
    assertMenuParent(await this.daos.menus.listItems(menuId), null, input.parentId);
    const result = await this.daos.menus.insertItem(menuId, input);
    this.invalidateNavigation();
    return result;
  }
  async updateMenuItem(id: string, input: Parameters<AdminSiteService['updateMenuItem']>[1]) {
    const current = await requireRow(this.daos.menus.findItemById(id), 'MENU_ITEM', id);
    if (input.parentId !== undefined)
      assertMenuParent(await this.daos.menus.listItems(current.menuId), current, input.parentId);
    const result = await this.daos.menus.updateItem(id, input);
    this.invalidateNavigation();
    return result;
  }
  async deleteMenuItem(id: string) {
    await requireRow(this.daos.menus.findItemById(id), 'MENU_ITEM', id);
    await this.daos.menus.deleteItem(id);
    this.invalidateNavigation();
  }
  async reorderMenu(menuId: string, itemIds: readonly string[]) {
    await requireRow(this.daos.menus.findById(menuId), 'MENU', menuId);
    const current = await this.daos.menus.listItems(menuId);
    const expected = current.map((item) => item.id).sort();
    const received = [...new Set(itemIds)].sort();
    if (expected.length !== itemIds.length || expected.join('|') !== received.join('|')) {
      throw new DomainError(
        'MENU_REORDER_INVALID_SET',
        'Danh sach sap xep phai chua dung toan bo muc cua menu',
      );
    }
    await this.daos.transaction((tx) => tx.menus.reorderItems(menuId, itemIds));
    this.invalidateNavigation();
    return this.daos.menus.listItems(menuId);
  }

  private invalidateHome(): void {
    this.siteCache?.invalidatePrefix('home:');
  }

  private invalidateNavigation(): void {
    this.siteCache?.invalidatePrefix('nav:');
  }

  private requireDocument(id: string) {
    return requireRow(this.daos.documents.findById(id), 'DOCUMENT', id);
  }
}

function assertMenuParent(
  items: readonly MenuItem[],
  current: MenuItem | null,
  parentId: string | null | undefined,
): void {
  if (parentId === undefined || parentId === null) return;
  if (current?.id === parentId)
    throw new DomainError('MENU_CYCLE', 'Muc menu khong the lam cha cua chinh no');
  const parent = items.find((item) => item.id === parentId);
  if (!parent) throw new DomainError('MENU_PARENT_INVALID', 'Muc cha khong thuoc cung menu');
  if (parent.parentId !== null)
    throw new DomainError('MENU_DEPTH_EXCEEDED', 'Menu chi ho tro toi da hai cap');
  if (current && items.some((item) => item.parentId === current.id))
    throw new DomainError(
      'MENU_DEPTH_EXCEEDED',
      'Muc dang co con khong the chuyen thanh muc cap hai',
    );
}

function paged<T>(result: {
  data: T[];
  meta: { page: number; pageSize: number; totalItems: number };
}) {
  return {
    items: result.data,
    page: result.meta.page,
    pageSize: result.meta.pageSize,
    totalItems: result.meta.totalItems,
  };
}

async function requireRow<T>(promise: Promise<T | null>, kind: string, id: string): Promise<T> {
  const row = await promise;
  if (!row)
    throw new NotFoundError(`${kind}_NOT_FOUND`, `Khong tim thay ${kind.toLowerCase()} ${id}`);
  return row;
}

function documentFields(input: Parameters<AdminSiteService['updateDocument']>[1]) {
  const fields = { ...input };
  delete fields.productIds;
  delete fields.brandIds;
  delete fields.serviceIds;
  delete fields.postIds;
  return fields;
}
function linkFields(input: DocumentLinks): DocumentLinks {
  return {
    ...(input.productIds !== undefined && { productIds: input.productIds }),
    ...(input.brandIds !== undefined && { brandIds: input.brandIds }),
    ...(input.serviceIds !== undefined && { serviceIds: input.serviceIds }),
    ...(input.postIds !== undefined && { postIds: input.postIds }),
  };
}
function hasLinks(input: DocumentLinks): boolean {
  return (
    input.productIds !== undefined ||
    input.brandIds !== undefined ||
    input.serviceIds !== undefined ||
    input.postIds !== undefined
  );
}
