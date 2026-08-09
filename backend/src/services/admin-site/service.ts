import { ConflictError, DomainError, NotFoundError } from '../../shared/errors.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { AppDocument, DocumentLinks } from '../../dao/documents/object.js';
import type { PublishService } from '../shared/publish.interface.js';
import type { SlugService } from '../shared/slug.interface.js';
import type { AdminSiteService } from './interface.js';

export type AdminSiteDaos = DaoScope<
  'documents' | 'customers' | 'offices' | 'banners' | 'homepageSections' | 'menus'
>;

export class AdminSiteServiceImpl implements AdminSiteService {
  constructor(
    private readonly daos: AdminSiteDaos,
    private readonly slugs: SlugService,
    private readonly publisher: PublishService,
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
    return this.daos.transaction(async (tx) => {
      const created = await tx.customers.insert(input);
      return tx.customers.update(created.id, input);
    });
  }
  async updateCustomer(id: string, input: Parameters<AdminSiteService['updateCustomer']>[1]) {
    await this.findCustomer(id);
    return this.daos.customers.update(id, input);
  }
  async publishCustomer(id: string) {
    await this.findCustomer(id);
    return this.daos.customers.publish(id, new Date());
  }
  async hideCustomer(id: string) {
    await this.findCustomer(id);
    return this.daos.customers.unpublish(id);
  }
  async deleteCustomer(id: string) {
    await this.findCustomer(id);
    await this.daos.customers.softDelete(id, new Date());
  }
  async restoreCustomer(id: string) {
    await this.daos.customers.restore(id);
    return this.findCustomer(id);
  }

  listOffices(filter: Record<string, unknown>) {
    return this.daos.offices.list(filter);
  }
  findOffice(id: string) {
    return requireRow(this.daos.offices.findById(id), 'OFFICE', id);
  }
  async createOffice(input: Parameters<AdminSiteService['createOffice']>[0]) {
    return this.daos.transaction(async (tx) => {
      const created = await tx.offices.insert({ ...input, initialStatus: 'draft' });
      return tx.offices.update(created.id, input);
    });
  }
  async updateOffice(id: string, input: Parameters<AdminSiteService['updateOffice']>[1]) {
    await this.findOffice(id);
    return this.daos.offices.update(id, input);
  }
  async publishOffice(id: string) {
    await this.findOffice(id);
    return this.daos.offices.publish(id);
  }
  async hideOffice(id: string) {
    await this.findOffice(id);
    return this.daos.offices.unpublish(id);
  }
  async deleteOffice(id: string) {
    await this.findOffice(id);
    await this.daos.offices.delete(id);
  }

  listBanners(filter: Record<string, unknown>) {
    return this.daos.banners.list(filter);
  }
  findBanner(id: string) {
    return requireRow(this.daos.banners.findById(id), 'BANNER', id);
  }
  async createBanner(input: Parameters<AdminSiteService['createBanner']>[0]) {
    return this.daos.transaction(async (tx) => {
      const created = await tx.banners.insert(input);
      return tx.banners.update(created.id, input);
    });
  }
  async updateBanner(id: string, input: Parameters<AdminSiteService['updateBanner']>[1]) {
    await this.findBanner(id);
    return this.daos.banners.update(id, input);
  }
  async publishBanner(id: string) {
    await this.findBanner(id);
    return this.daos.banners.publish(id);
  }
  async hideBanner(id: string) {
    await this.findBanner(id);
    return this.daos.banners.unpublish(id);
  }
  async deleteBanner(id: string) {
    await this.findBanner(id);
    await this.daos.banners.delete(id);
  }

  homepage() {
    return this.daos.homepageSections.listAll();
  }
  updateHomepage(input: Parameters<AdminSiteService['updateHomepage']>[0]) {
    return this.daos.homepageSections.upsert(input);
  }

  async listMenus() {
    const menus = await this.daos.menus.listAll();
    const result = [];
    for (const menu of menus)
      result.push({ ...menu, items: await this.daos.menus.listItems(menu.id) });
    return result;
  }
  createMenu(input: Parameters<AdminSiteService['createMenu']>[0]) {
    return this.daos.menus.insert(input);
  }
  async updateMenu(id: string, input: Parameters<AdminSiteService['updateMenu']>[1]) {
    await requireRow(this.daos.menus.findById(id), 'MENU', id);
    return this.daos.menus.update(id, input);
  }
  async deleteMenu(id: string) {
    await requireRow(this.daos.menus.findById(id), 'MENU', id);
    await this.daos.menus.delete(id);
  }
  async addMenuItem(menuId: string, input: Parameters<AdminSiteService['addMenuItem']>[1]) {
    await requireRow(this.daos.menus.findById(menuId), 'MENU', menuId);
    return this.daos.menus.insertItem(menuId, input);
  }
  async updateMenuItem(id: string, input: Parameters<AdminSiteService['updateMenuItem']>[1]) {
    await requireRow(this.daos.menus.findItemById(id), 'MENU_ITEM', id);
    return this.daos.menus.updateItem(id, input);
  }
  async deleteMenuItem(id: string) {
    await requireRow(this.daos.menus.findItemById(id), 'MENU_ITEM', id);
    await this.daos.menus.deleteItem(id);
  }
  async reorderMenu(menuId: string, itemIds: readonly string[]) {
    await requireRow(this.daos.menus.findById(menuId), 'MENU', menuId);
    await this.daos.transaction((tx) => tx.menus.reorderItems(menuId, itemIds));
    return this.daos.menus.listItems(menuId);
  }

  private requireDocument(id: string) {
    return requireRow(this.daos.documents.findById(id), 'DOCUMENT', id);
  }
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
