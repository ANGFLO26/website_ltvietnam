import { describe, expect, it, vi } from 'vitest';
import type { PublishService } from '../src/services/shared/publish.interface.js';
import type { SlugService } from '../src/services/shared/slug.interface.js';
import {
  AdminContentServiceImpl,
  type AdminContentDaos,
} from '../src/services/admin-content/service.js';

describe('A3 admin content detail read-model', () => {
  it('tra du VI/EN, relation va media theo thu tu de editor round-trip', async () => {
    const id = '10000000-0000-4000-8000-000000000001';
    const projects = {
      findById: vi.fn(async () => ({ id, status: 'draft', featuredImageId: null })),
      findTranslation: vi.fn(async (_id: string, locale: 'vi' | 'en') => ({
        id:
          locale === 'vi'
            ? '20000000-0000-4000-8000-000000000001'
            : '20000000-0000-4000-8000-000000000002',
        projectId: id,
        locale,
        title: locale === 'vi' ? 'Dự án' : 'Project',
        slug: locale === 'vi' ? 'du-an' : 'project',
        scopeOfWork: [],
        implementation: [],
        result: [],
        status: 'draft',
      })),
      findLinks: vi.fn(async () => ({ productIds: ['p1'], serviceIds: ['s1'], brandIds: [] })),
      findMedia: vi.fn(async () => [
        { mediaId: '30000000-0000-4000-8000-000000000001', caption: 'Một', displayOrder: 0 },
        { mediaId: '30000000-0000-4000-8000-000000000002', caption: 'Hai', displayOrder: 1 },
      ]),
    };
    const service = new AdminContentServiceImpl(
      { projects } as unknown as AdminContentDaos,
      {} as SlugService,
      {} as PublishService,
    );

    const detail = await service.findById('project', id);

    expect(detail).toMatchObject({
      kind: 'project',
      translations: [
        { locale: 'vi', title: 'Dự án' },
        { locale: 'en', title: 'Project' },
      ],
      links: { productIds: ['p1'], serviceIds: ['s1'] },
      media: [{ displayOrder: 0 }, { displayOrder: 1 }],
    });
    expect(projects.findTranslation).toHaveBeenCalledTimes(2);
  });
});
