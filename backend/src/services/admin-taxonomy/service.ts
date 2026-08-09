import { ConflictError, DomainError, NotFoundError } from '../../shared/errors.js';
import { chiCo } from '../../shared/omit-undefined.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type {
  CreateApplicationInput,
  UpdateApplicationInput,
} from '../../dao/applications/object.js';
import type { CreateBrandInput, UpdateBrandInput } from '../../dao/brands/object.js';
import type { CreateIndustryInput, UpdateIndustryInput } from '../../dao/industries/object.js';
import type {
  CreateProductCategoryInput,
  UpdateProductCategoryInput,
} from '../../dao/product-categories/object.js';
import type { CreateStandardInput, UpdateStandardInput } from '../../dao/standards/object.js';
import type { PublishService } from '../shared/publish.interface.js';
import type { SlugService } from '../shared/slug.interface.js';
import type {
  AdminTaxonomyEntity,
  AdminTaxonomyFilter,
  AdminTaxonomyKind,
  AdminTaxonomyPage,
  AdminTaxonomyService,
  AdminTaxonomyWrite,
} from './interface.js';

export type AdminTaxonomyDaos = DaoScope<
  'brands' | 'productCategories' | 'standards' | 'applications' | 'industries'
>;

type Audit = (event: string, fields: Record<string, unknown>) => void;

export class AdminTaxonomyServiceImpl implements AdminTaxonomyService {
  constructor(
    private readonly daos: AdminTaxonomyDaos,
    private readonly slugs: SlugService,
    private readonly publisher: PublishService,
    private readonly onAudit?: Audit,
  ) {}

  async list(
    kind: AdminTaxonomyKind,
    filter: AdminTaxonomyFilter,
    page: { readonly page: number; readonly pageSize: number },
  ): Promise<AdminTaxonomyPage> {
    const result = await this.listFromDao(kind, filter, page);
    return {
      items: result.data,
      page: result.meta.page,
      pageSize: result.meta.pageSize,
      totalItems: result.meta.totalItems,
    };
  }

  async findById(kind: AdminTaxonomyKind, id: string): Promise<AdminTaxonomyEntity> {
    const found = await this.find(kind, id);
    if (!found) throw new NotFoundError(`${code(kind)}_NOT_FOUND`, `Khong tim thay ${kind} ${id}`);
    return found;
  }

  async create(kind: AdminTaxonomyKind, input: AdminTaxonomyWrite): Promise<AdminTaxonomyEntity> {
    if (!input.slug) throw new DomainError('VALIDATION_FAILED', 'Thieu slug');
    await this.slugs.assertAvailable({ entity: kind, slug: input.slug });

    const created = await this.insert(kind, input);
    this.audit('admin_entity_created', kind, created.id);
    return created;
  }

  async update(
    kind: AdminTaxonomyKind,
    id: string,
    input: AdminTaxonomyWrite,
  ): Promise<AdminTaxonomyEntity> {
    const current = await this.findById(kind, id);

    if (input.slug !== undefined && input.slug !== current.slug) {
      await this.slugs.rename({
        entity: kind,
        id,
        slug: input.slug,
        currentSlug: current.slug,
        wasEverPublished: current.firstPublishedAt !== null,
      });
    }

    const withoutPlacementAndSlug = { ...input, parentId: undefined, slug: undefined };
    if (Object.values(withoutPlacementAndSlug).some((value) => value !== undefined)) {
      await this.updateFields(kind, id, withoutPlacementAndSlug);
    }

    if (input.parentId !== undefined) await this.move(kind, id, input.parentId);

    const updated = await this.findById(kind, id);
    this.audit('admin_entity_updated', kind, id, {
      slug_changed: input.slug !== undefined && input.slug !== current.slug,
    });
    return updated;
  }

  async publish(kind: AdminTaxonomyKind, id: string): Promise<AdminTaxonomyEntity> {
    await this.findById(kind, id);
    try {
      if (kind === 'brand') await this.publisher.publish({ entity: 'brand', id });
      else await this.publishDirect(kind, id);
    } catch (error) {
      if (error instanceof ConflictError && error.code === 'PUBLISH_PRECONDITION_FAILED') {
        throw new DomainError(error.code, error.message, 'VALIDATION_FAILED', error.details);
      }
      throw error;
    }
    this.audit('admin_entity_published', kind, id);
    return this.findById(kind, id);
  }

  async hide(kind: AdminTaxonomyKind, id: string): Promise<AdminTaxonomyEntity> {
    await this.findById(kind, id);
    if (kind === 'brand') await this.publisher.unpublish({ entity: 'brand', id });
    else await this.hideDirect(kind, id);
    this.audit('admin_entity_hidden', kind, id);
    return this.findById(kind, id);
  }

  async delete(kind: AdminTaxonomyKind, id: string, hard: boolean): Promise<void> {
    await this.findById(kind, id);
    if (hard) {
      if (!(await this.slugs.canHardDelete(kind, id))) {
        throw new ConflictError(
          'HARD_DELETE_NOT_ALLOWED',
          'Chi duoc xoa vinh vien noi dung nhap chua tung cong khai va khong co phu thuoc',
        );
      }
      await this.hardDelete(kind, id);
      this.audit('admin_entity_hard_deleted', kind, id);
      return;
    }
    await this.softDelete(kind, id, new Date());
    this.audit('admin_entity_soft_deleted', kind, id);
  }

  async restore(kind: AdminTaxonomyKind, id: string): Promise<AdminTaxonomyEntity> {
    await this.restoreDirect(kind, id);
    const restored = await this.find(kind, id);
    if (!restored)
      throw new NotFoundError(`${code(kind)}_NOT_FOUND`, `Khong tim thay ${kind} ${id}`);
    this.audit('admin_entity_restored', kind, id);
    return restored;
  }

  private listFromDao(
    kind: AdminTaxonomyKind,
    filter: AdminTaxonomyFilter,
    page: { readonly page: number; readonly pageSize: number },
  ) {
    switch (kind) {
      case 'brand':
        return this.daos.brands.list(
          chiCo({
            status: filter.status,
            isFeatured: filter.isFeatured,
            parentId: filter.parentId,
            includeDeleted: filter.includeDeleted,
          }),
          page,
        );
      case 'product_category':
        return this.daos.productCategories.list(
          chiCo({
            status: filter.status,
            isFeatured: filter.isFeatured,
            parentId: filter.parentId,
            includeDeleted: filter.includeDeleted,
          }),
          page,
        );
      case 'standard':
        return this.daos.standards.list(
          chiCo({
            status: filter.status,
            isFeatured: filter.isFeatured,
            organization: filter.organization,
            search: filter.search,
            includeDeleted: filter.includeDeleted,
          }),
          page,
        );
      case 'application':
        return this.daos.applications.list(
          chiCo({
            status: filter.status,
            isFeatured: filter.isFeatured,
            parentId: filter.parentId,
            includeDeleted: filter.includeDeleted,
          }),
          page,
        );
      case 'industry':
        return this.daos.industries.list(
          chiCo({
            status: filter.status,
            isFeatured: filter.isFeatured,
            includeDeleted: filter.includeDeleted,
          }),
          page,
        );
    }
  }

  private find(kind: AdminTaxonomyKind, id: string) {
    switch (kind) {
      case 'brand':
        return this.daos.brands.findById(id);
      case 'product_category':
        return this.daos.productCategories.findById(id);
      case 'standard':
        return this.daos.standards.findById(id);
      case 'application':
        return this.daos.applications.findById(id);
      case 'industry':
        return this.daos.industries.findById(id);
    }
  }

  private insert(kind: AdminTaxonomyKind, input: AdminTaxonomyWrite) {
    switch (kind) {
      case 'brand':
        return this.daos.brands.insert(input as CreateBrandInput);
      case 'product_category':
        return this.daos.productCategories.insert(input as CreateProductCategoryInput);
      case 'standard':
        return this.daos.standards.insert({
          ...input,
          initialStatus: 'draft',
        } as CreateStandardInput);
      case 'application':
        return this.daos.applications.insert({
          ...input,
          initialStatus: 'draft',
        } as CreateApplicationInput);
      case 'industry':
        return this.daos.industries.insert({
          ...input,
          initialStatus: 'draft',
        } as CreateIndustryInput);
    }
  }

  private updateFields(kind: AdminTaxonomyKind, id: string, input: AdminTaxonomyWrite) {
    switch (kind) {
      case 'brand':
        return this.daos.brands.update(id, input as UpdateBrandInput);
      case 'product_category':
        return this.daos.productCategories.update(id, input as UpdateProductCategoryInput);
      case 'standard':
        return this.daos.standards.update(id, input as UpdateStandardInput);
      case 'application':
        return this.daos.applications.update(id, input as UpdateApplicationInput);
      case 'industry':
        return this.daos.industries.update(id, input as UpdateIndustryInput);
    }
  }

  private async move(kind: AdminTaxonomyKind, id: string, parentId: string | null): Promise<void> {
    switch (kind) {
      case 'brand':
        await this.daos.brands.moveNode(id, parentId);
        return;
      case 'product_category':
        await this.daos.productCategories.moveNode(id, parentId);
        return;
      case 'application':
        await this.daos.applications.moveNode(id, parentId);
        return;
      case 'standard':
      case 'industry':
        throw new DomainError('PARENT_NOT_SUPPORTED', `${kind} khong phai cau truc cay`);
    }
  }

  private async publishDirect(
    kind: Exclude<AdminTaxonomyKind, 'brand'>,
    id: string,
  ): Promise<void> {
    const at = new Date();
    switch (kind) {
      case 'product_category':
        await this.daos.productCategories.publish(id, at);
        return;
      case 'standard':
        await this.daos.standards.publish(id, at);
        return;
      case 'application':
        await this.daos.applications.publish(id, at);
        return;
      case 'industry':
        await this.daos.industries.publish(id, at);
        return;
    }
  }

  private async hideDirect(kind: Exclude<AdminTaxonomyKind, 'brand'>, id: string): Promise<void> {
    switch (kind) {
      case 'product_category':
        await this.daos.productCategories.unpublish(id);
        return;
      case 'standard':
        await this.daos.standards.unpublish(id);
        return;
      case 'application':
        await this.daos.applications.unpublish(id);
        return;
      case 'industry':
        await this.daos.industries.unpublish(id);
        return;
    }
  }

  private async softDelete(kind: AdminTaxonomyKind, id: string, at: Date): Promise<void> {
    switch (kind) {
      case 'brand':
        await this.daos.brands.softDelete(id, at);
        return;
      case 'product_category':
        await this.daos.productCategories.softDelete(id, at);
        return;
      case 'standard':
        await this.daos.standards.softDelete(id, at);
        return;
      case 'application':
        await this.daos.applications.softDelete(id, at);
        return;
      case 'industry':
        await this.daos.industries.softDelete(id, at);
        return;
    }
  }

  private async restoreDirect(kind: AdminTaxonomyKind, id: string): Promise<void> {
    switch (kind) {
      case 'brand':
        await this.daos.brands.restore(id);
        return;
      case 'product_category':
        await this.daos.productCategories.restore(id);
        return;
      case 'standard':
        await this.daos.standards.restore(id);
        return;
      case 'application':
        await this.daos.applications.restore(id);
        return;
      case 'industry':
        await this.daos.industries.restore(id);
        return;
    }
  }

  private async hardDelete(kind: AdminTaxonomyKind, id: string): Promise<void> {
    switch (kind) {
      case 'brand':
        await this.daos.brands.hardDelete(id);
        return;
      case 'product_category':
        await this.daos.productCategories.hardDelete(id);
        return;
      case 'standard':
        await this.daos.standards.hardDelete(id);
        return;
      case 'application':
        await this.daos.applications.hardDelete(id);
        return;
      case 'industry':
        await this.daos.industries.hardDelete(id);
        return;
    }
  }

  private audit(event: string, kind: AdminTaxonomyKind, id: string, extra = {}): void {
    this.onAudit?.(event, { entity: kind, entity_id: id, ...extra });
  }
}

function code(kind: AdminTaxonomyKind): string {
  return kind.toUpperCase();
}
