import {
  extractMediaIds,
  type AdminEntityStatus,
  type AdminProductListItemView,
  type ContentBlock,
} from '@ltv/contracts';
import { ConflictError, DomainError, NotFoundError } from '../../shared/errors.js';
import { chiCo } from '../../shared/omit-undefined.js';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { CreateProductInput, Product, UpdateProductInput } from '../../dao/products/object.js';
import type { PublishService } from '../shared/publish.interface.js';
import type { SlugService } from '../shared/slug.interface.js';
import type {
  AdminProductCreate,
  AdminProductPage,
  AdminProductService,
  AdminProductWrite,
} from './interface.js';

export type AdminProductDaos = DaoScope<'products' | 'contentMediaRefs'>;
type Audit = (event: string, fields: Record<string, unknown>) => void;

const CONTENT_FIELDS = [
  'overview',
  'features',
  'applicationsText',
  'principle',
  'sampleTypes',
  'operatingConditions',
  'accessoriesOptions',
] as const;

export class AdminProductServiceImpl implements AdminProductService {
  constructor(
    private readonly daos: AdminProductDaos,
    private readonly slugs: SlugService,
    private readonly publisher: PublishService,
    private readonly onAudit?: Audit,
  ) {}

  async list(
    filter: {
      readonly status?: AdminEntityStatus | undefined;
      readonly brandId?: string | undefined;
      readonly categoryId?: string | undefined;
      readonly search?: string | undefined;
      readonly includeDeleted?: boolean | undefined;
    },
    page: { readonly page: number; readonly pageSize: number },
  ): Promise<AdminProductPage> {
    const result = await this.daos.products.listAdmin(chiCo(filter), page);
    return {
      items: result.data.map(productListView),
      page: result.meta.page,
      pageSize: result.meta.pageSize,
      totalItems: result.meta.totalItems,
    };
  }

  async findById(id: string) {
    const product = await this.requireProduct(id);
    const detail = await this.daos.products.findDetailBySlug(product.slug);
    if (!detail) throw new NotFoundError('PRODUCT_NOT_FOUND', `Khong tim thay san pham ${id}`);
    return detail;
  }

  async create(input: AdminProductCreate, actorId: string) {
    await this.slugs.assertAvailable({ entity: 'product', slug: input.slug });
    const product = await this.daos.transaction(async (tx) => {
      const created = await tx.products.insert({
        ...(entityFields(input) as CreateProductInput),
        createdBy: actorId,
      });
      const saved = await tx.products.update(created.id, {
        ...entityFields(input),
        updatedBy: actorId,
      });
      await replaceRelations(tx, created.id, input);
      await syncContentRefs(tx, created.id, input);
      return saved;
    });
    this.audit('admin_product_created', product.id, actorId);
    return this.findById(product.id);
  }

  async update(id: string, input: AdminProductWrite, actorId: string) {
    const current = await this.requireProduct(id);
    if (input.slug !== undefined && input.slug !== current.slug) {
      await this.slugs.rename({
        entity: 'product',
        id,
        slug: input.slug,
        currentSlug: current.slug,
        wasEverPublished: current.firstPublishedAt !== null,
      });
    }

    await this.daos.transaction(async (tx) => {
      const withoutSlug = { ...input };
      delete withoutSlug.slug;
      const fields = entityFields({ ...withoutSlug, updatedBy: actorId });
      if (Object.values(fields).some((value) => value !== undefined)) {
        await tx.products.update(id, fields);
      }
      await replaceRelations(tx, id, input);
      await syncContentRefs(tx, id, input);
    });
    this.audit('admin_product_updated', id, actorId, {
      slug_changed: input.slug !== undefined && input.slug !== current.slug,
    });
    return this.findById(id);
  }

  async publish(id: string) {
    await this.requireProduct(id);
    try {
      await this.publisher.publish({ entity: 'product', id });
    } catch (error) {
      if (error instanceof ConflictError && error.code === 'PUBLISH_PRECONDITION_FAILED') {
        throw new DomainError(error.code, error.message, 'VALIDATION_FAILED', error.details);
      }
      throw error;
    }
    this.audit('admin_product_published', id);
    return this.findById(id);
  }

  async hide(id: string) {
    await this.requireProduct(id);
    await this.publisher.unpublish({ entity: 'product', id });
    this.audit('admin_product_hidden', id);
    return this.findById(id);
  }

  async delete(id: string, hard: boolean): Promise<void> {
    await this.requireProduct(id);
    if (!hard) {
      await this.daos.products.softDelete(id, new Date());
      this.audit('admin_product_soft_deleted', id);
      return;
    }
    if (!(await this.slugs.canHardDelete('product', id))) {
      throw new ConflictError(
        'HARD_DELETE_NOT_ALLOWED',
        'Chi duoc xoa vinh vien san pham nhap chua tung cong khai va khong co phu thuoc',
      );
    }
    await this.daos.transaction(async (tx) => {
      await tx.contentMediaRefs.deleteForEntity('product', id);
      await tx.products.hardDelete(id);
    });
    this.audit('admin_product_hard_deleted', id);
  }

  async restore(id: string) {
    await this.daos.products.restore(id);
    await this.requireProduct(id);
    this.audit('admin_product_restored', id);
    return this.findById(id);
  }

  private async requireProduct(id: string): Promise<Product> {
    const product = await this.daos.products.findById(id);
    if (!product) throw new NotFoundError('PRODUCT_NOT_FOUND', `Khong tim thay san pham ${id}`);
    return product;
  }

  private audit(event: string, id: string, actorId?: string, extra = {}): void {
    this.onAudit?.(event, {
      entity: 'product',
      entity_id: id,
      ...(actorId !== undefined && { actor_id: actorId }),
      ...extra,
    });
  }
}

function productListView(
  row: Awaited<ReturnType<AdminProductDaos['products']['listAdmin']>>['data'][number],
): AdminProductListItemView {
  const primaryCategory =
    row.primaryCategoryId === null || row.primaryCategoryName === null
      ? null
      : {
          id: row.primaryCategoryId,
          label: row.primaryCategoryName,
          slug: row.primaryCategorySlug,
        };
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    model: row.model,
    internal_code: row.internalCode,
    sku: row.sku,
    status: row.status,
    brand: { id: row.brandId, label: row.brandName, slug: row.brandSlug },
    primary_category: primaryCategory,
    thumbnail_id: row.thumbnailId,
    thumbnail_url: row.thumbnailUrl,
    thumbnail_alt: row.thumbnailAlt,
    is_featured: row.isFeatured,
    discontinued_at: row.discontinuedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    deleted_at: row.deletedAt?.toISOString() ?? null,
  };
}

function entityFields(input: AdminProductWrite): UpdateProductInput {
  const fields = { ...input };
  delete fields.categories;
  delete fields.standards;
  delete fields.applications;
  delete fields.industries;
  delete fields.media;
  delete fields.relatedProducts;
  delete fields.specifications;
  return fields;
}

async function replaceRelations(
  tx: Pick<AdminProductDaos, 'products' | 'contentMediaRefs'>,
  id: string,
  input: AdminProductWrite,
): Promise<void> {
  if (input.categories !== undefined) await tx.products.replaceCategories(id, input.categories);
  if (input.standards !== undefined) await tx.products.replaceStandards(id, input.standards);
  if (input.applications !== undefined)
    await tx.products.replaceApplications(id, input.applications);
  if (input.industries !== undefined) await tx.products.replaceIndustries(id, input.industries);
  if (input.media !== undefined) await tx.products.replaceMedia(id, input.media);
  if (input.relatedProducts !== undefined)
    await tx.products.replaceRelated(id, input.relatedProducts);
  if (input.specifications !== undefined)
    await tx.products.replaceSpecifications(id, input.specifications);
}

async function syncContentRefs(
  tx: Pick<AdminProductDaos, 'products' | 'contentMediaRefs'>,
  id: string,
  input: AdminProductWrite,
): Promise<void> {
  for (const field of CONTENT_FIELDS) {
    const blocks = input[field];
    if (blocks === undefined) continue;
    await tx.contentMediaRefs.replaceForField(
      { entityType: 'product', entityId: id, fieldName: field },
      extractMediaIds({ version: 1, blocks: blocks as ContentBlock[] }),
    );
  }
}
