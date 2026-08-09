import { describe, expect, it, vi } from 'vitest';
import {
  AdminProductServiceImpl,
  type AdminProductDaos,
} from '../src/services/admin-products/service.js';
import type { Product, ProductDetail } from '../src/dao/products/object.js';
import type { SlugService } from '../src/services/shared/slug.interface.js';
import type { PublishService } from '../src/services/shared/publish.interface.js';
import {
  AdminRedirectServiceImpl,
  type AdminRedirectDaos,
} from '../src/services/admin-redirects/service.js';
import { SettingServiceImpl, type SettingDaos } from '../src/services/settings/service.js';
import { adminDeleteQuerySchema } from '../src/api/dto/admin-taxonomy.dto.js';
import { contentListSchema, postTranslationSchema } from '../src/api/dto/admin-content.dto.js';
import { redirectListQuerySchema } from '../src/api/dto/admin-system.dto.js';
import {
  AdminContentServiceImpl,
  type AdminContentDaos,
} from '../src/services/admin-content/service.js';
import { AdminSiteServiceImpl, type AdminSiteDaos } from '../src/services/admin-site/service.js';

const product: Product = {
  id: '11111111-1111-4111-8111-111111111111',
  brandId: '22222222-2222-4222-8222-222222222222',
  featuredImageId: null,
  name: 'Draft product',
  slug: 'draft-product',
  shortDescription: null,
  overview: [],
  features: [],
  applicationsText: [],
  principle: [],
  sampleTypes: [],
  operatingConditions: [],
  accessoriesOptions: [],
  seoTitle: null,
  seoDescription: null,
  model: null,
  internalCode: null,
  sku: null,
  productType: 'equipment',
  priceVisibility: 'hidden',
  saleMode: 'inquiry',
  requiresConfiguration: false,
  warrantyMonths: null,
  status: 'draft',
  isFeatured: false,
  displayOrder: 0,
  publishedAt: null,
  firstPublishedAt: null,
  discontinuedAt: null,
};

describe('F8 admin commands', () => {
  it('parses false query booleans as false and rejects ambiguous values', () => {
    expect(adminDeleteQuerySchema.parse({ hard: 'false' }).hard).toBe(false);
    expect(adminDeleteQuerySchema.parse({ hard: '0' }).hard).toBe(false);
    expect(adminDeleteQuerySchema.parse({ hard: 'true' }).hard).toBe(true);
    expect(contentListSchema.parse({ featured: 'false' }).featured).toBe(false);
    expect(redirectListQuerySchema.parse({ never_hit: 'false' }).never_hit).toBe(false);
    expect(() => adminDeleteQuerySchema.parse({ hard: 'yes' })).toThrow();
  });

  it('accepts a status-only translation PATCH as documented', async () => {
    expect(postTranslationSchema.parse({ status: 'published' })).toEqual({ status: 'published' });

    const current = {
      id: '55555555-5555-4555-8555-555555555555',
      postId: product.id,
      locale: 'vi' as const,
      title: 'Bai viet',
      slug: 'bai-viet',
      excerpt: null,
      content: [],
      seoTitle: null,
      seoDescription: null,
      status: 'draft' as const,
      publishedAt: null,
      firstPublishedAt: null,
    };
    const posts = {
      findById: vi.fn(async () => ({ id: product.id, status: 'draft' })),
      findTranslation: vi.fn(async () => current),
    };
    const transaction = vi.fn();
    const daos = { posts, transaction } as unknown as AdminContentDaos;
    const publisher = { publish: vi.fn(async () => undefined) } as unknown as PublishService;
    const slugs = {} as SlugService;
    const service = new AdminContentServiceImpl(daos, slugs, publisher);

    await service.upsertTranslation('post', product.id, 'vi', { status: 'published' });

    expect(transaction).not.toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith({
      entity: 'post',
      id: product.id,
      locale: 'vi',
    });
  });

  it('preserves omitted translation fields during a partial PATCH', async () => {
    const current = {
      id: '55555555-5555-4555-8555-555555555555',
      serviceId: product.id,
      locale: 'en' as const,
      name: 'Old title',
      slug: 'old-slug',
      shortDescription: 'keep me',
      overview: [],
      customerProblems: [],
      scopeOfWork: [],
      process: [],
      benefits: [],
      faq: [],
      seoTitle: 'Keep SEO',
      seoDescription: null,
      status: 'draft' as const,
      publishedAt: null,
      firstPublishedAt: null,
    };
    const upsertTranslation = vi.fn(async () => current);
    const services = {
      findById: vi.fn(async () => ({ id: product.id, status: 'draft' })),
      findTranslation: vi.fn(async () => current),
      upsertTranslation,
    };
    const tx = {
      services,
      redirects: { createCollapsingChain: vi.fn() },
      contentMediaRefs: { replaceForField: vi.fn() },
    };
    const daos = {
      ...tx,
      transaction: vi.fn(async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx)),
    } as unknown as AdminContentDaos;
    const service = new AdminContentServiceImpl(daos, {} as SlugService, {} as PublishService);

    await service.upsertTranslation('service', product.id, 'en', { name: 'New title' });

    expect(upsertTranslation).toHaveBeenCalledWith(
      product.id,
      expect.objectContaining({
        locale: 'en',
        name: 'New title',
        slug: 'old-slug',
        shortDescription: 'keep me',
        seoTitle: 'Keep SEO',
      }),
    );
  });

  it('honors include_deleted when listing admin pages', async () => {
    const listAll = vi.fn(async () => []);
    const pages = { listAll };
    const daos = { pages, transaction: vi.fn() } as unknown as AdminContentDaos;
    const service = new AdminContentServiceImpl(daos, {} as SlugService, {} as PublishService);

    await service.list('page', { includeDeleted: true }, { page: 1, pageSize: 20 });

    expect(listAll).toHaveBeenCalledWith(true);
  });

  it('hides a customer editorially without revoking its independent logo-consent flag', async () => {
    const customer = {
      id: product.id,
      name: 'Customer',
      shortDescription: null,
      logoId: null,
      industryId: null,
      websiteUrl: null,
      isPublic: true,
      isFeatured: false,
      displayOrder: 0,
      status: 'published' as const,
    };
    const unpublish = vi.fn(async () => ({ ...customer, status: 'hidden' as const }));
    const customers = { findById: vi.fn(async () => customer), unpublish };
    const daos = { customers, transaction: vi.fn() } as unknown as AdminSiteDaos;
    const service = new AdminSiteServiceImpl(daos, {} as SlugService, {} as PublishService);

    const hidden = await service.hideCustomer(customer.id);

    expect(unpublish).toHaveBeenCalledWith(customer.id);
    expect(hidden).toMatchObject({ status: 'hidden', isPublic: true });
  });

  it('PATCH product only replaces relation sets that are present (ADR-008)', async () => {
    const replaceCategories = vi.fn(async () => undefined);
    const replaceStandards = vi.fn(async () => undefined);
    const update = vi.fn(async (_id: string, fields: Partial<Product>) => ({
      ...product,
      ...fields,
    }));
    const products = {
      findById: vi.fn(async () => product),
      findDetailBySlug: vi.fn(async (): Promise<ProductDetail> => ({
        product,
        brand: { id: product.brandId, name: 'Brand', slug: 'brand' },
        categories: [],
        standards: [],
        applications: [],
        industries: [],
        media: [],
        specifications: [],
        related: [],
      })),
      update,
      replaceCategories,
      replaceStandards,
      replaceApplications: vi.fn(),
      replaceIndustries: vi.fn(),
      replaceMedia: vi.fn(),
      replaceRelated: vi.fn(),
      replaceSpecifications: vi.fn(),
    };
    const refs = { replaceForField: vi.fn() };
    const tx = { products, contentMediaRefs: refs };
    const daos = {
      ...tx,
      transaction: vi.fn(async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx)),
    } as unknown as AdminProductDaos;
    const slugs = {
      rename: vi.fn(),
      assertAvailable: vi.fn(),
      canHardDelete: vi.fn(),
    } as unknown as SlugService;
    const publisher = {} as PublishService;
    const service = new AdminProductServiceImpl(daos, slugs, publisher);

    await service.update(
      product.id,
      {
        categories: [{ categoryId: '33333333-3333-4333-8333-333333333333', isPrimary: true }],
      },
      '44444444-4444-4444-8444-444444444444',
    );

    expect(replaceCategories).toHaveBeenCalledOnce();
    expect(replaceStandards).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(product.id, {
      updatedBy: '44444444-4444-4444-8444-444444444444',
    });
  });

  it('rejects redirect sources that would shadow a live system route', async () => {
    const daos = { redirects: {}, transaction: vi.fn() } as unknown as AdminRedirectDaos;
    const service = new AdminRedirectServiceImpl(daos, { isLivePath: vi.fn() });
    await expect(
      service.create({ sourcePath: '/products', targetPath: '/news' }),
    ).rejects.toMatchObject({ code: 'REDIRECT_SOURCE_IS_LIVE_ROUTE' });
    expect(daos.transaction).not.toHaveBeenCalled();
  });

  it('rejects redirect sources that shadow published dynamic content', async () => {
    const daos = { redirects: {}, transaction: vi.fn() } as unknown as AdminRedirectDaos;
    const isLivePath = vi.fn(async () => true);
    const service = new AdminRedirectServiceImpl(daos, { isLivePath });

    await expect(
      service.create({ sourcePath: '/products/live-product', targetPath: '/products/new' }),
    ).rejects.toMatchObject({ code: 'REDIRECT_SOURCE_IS_LIVE_ROUTE' });
    expect(isLivePath).toHaveBeenCalledWith('/products/live-product');
    expect(daos.transaction).not.toHaveBeenCalled();
  });

  it('retargets a redirect without deleting the row and losing its hit history', async () => {
    const current = {
      id: product.id,
      sourcePath: '/old',
      targetPath: '/current',
      redirectType: 301 as const,
      status: 'active' as const,
      hitCount: 42,
      lastHitAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const retargetCollapsingChain = vi.fn(async () => ({ ...current, targetPath: '/new' }));
    const redirects = {
      findById: vi.fn(async () => current),
      retargetCollapsingChain,
      delete: vi.fn(),
    };
    const tx = { redirects };
    const daos = {
      redirects,
      transaction: vi.fn(async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx)),
    } as unknown as AdminRedirectDaos;
    const service = new AdminRedirectServiceImpl(daos, { isLivePath: vi.fn(async () => false) });

    const updated = await service.update(current.id, { targetPath: '/new', status: 'disabled' });

    expect(redirects.delete).not.toHaveBeenCalled();
    expect(retargetCollapsingChain).toHaveBeenCalledWith(current.id, {
      targetPath: '/new',
      status: 'disabled',
    });
    expect(updated).toMatchObject({ id: current.id, hitCount: 42 });
  });

  it('settings group update never writes the masked SMTP password back', async () => {
    const smtp = {
      id: '1',
      group: 'email',
      key: 'smtp_password',
      value: 'real-secret',
      valueType: 'encrypted' as const,
      isPublic: false,
      isEncrypted: true,
    };
    const upsert = vi.fn(async () => smtp);
    const settings = {
      findByGroup: vi.fn(async () => [smtp]),
      upsert,
    };
    const tx = { settings };
    const daos = {
      settings,
      transaction: vi.fn(async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx)),
    } as unknown as SettingDaos;
    const service = new SettingServiceImpl(daos);

    const result = await service.updateGroup('email', { smtp_password: '********' });
    expect(upsert).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({ value: '********', masked: true });
  });
});
