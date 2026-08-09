import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ConflictError } from '../src/shared/errors.js';
import type { Media } from '../src/dao/media/object.js';
import {
  MediaUsageServiceImpl,
  type MediaUsageDaos,
} from '../src/services/shared/media-usage.service.js';

describe('F7 MediaUsageService', () => {
  it('tra ca toa do FK va content block, roi chan soft-delete bang MEDIA_IN_USE', async () => {
    const media = fakeMedia();
    const mediaDao = {
      findById: vi.fn(async () => media),
      findReferencePlaces: vi.fn(async () => [
        {
          entityType: 'products',
          entityId: 'product-1',
          fieldName: 'featured_image_id',
        },
      ]),
      countReferences: vi.fn(async () => 2),
      softDelete: vi.fn(async () => undefined),
    };
    const refs = {
      findByMedia: vi.fn(async () => [
        {
          mediaId: media.id,
          entityType: 'post_translation',
          entityId: 'post-1',
          locale: 'vi' as const,
          fieldName: 'content',
        },
      ]),
    };
    const daos = {
      media: mediaDao,
      contentMediaRefs: refs,
      transaction: async <T>(fn: (tx: unknown) => Promise<T>) =>
        fn({
          media: mediaDao,
          contentMediaRefs: refs,
        }),
    } as unknown as MediaUsageDaos;
    const service = new MediaUsageServiceImpl(daos);

    const usage = await service.usage(media.id);
    expect(usage.total).toBe(2);
    expect(usage.places).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'foreign_key', entityType: 'products' }),
        expect.objectContaining({ source: 'content_block', entityType: 'post_translation' }),
      ]),
    );

    await expect(service.softDelete(media.id)).rejects.toMatchObject({
      code: 'MEDIA_IN_USE',
      details: { usage: expect.objectContaining({ total: 2 }) },
    });
    await expect(service.softDelete(media.id)).rejects.toBeInstanceOf(ConflictError);
    expect(mediaDao.softDelete).not.toHaveBeenCalled();
  });
});

function fakeMedia(): Media {
  return {
    id: randomUUID(),
    fileName: 'x.jpg',
    originalName: 'x.jpg',
    storageDisk: 'local',
    storageClass: 'public',
    storagePath: 'public-media/originals/x.jpg',
    publicUrl: '/media/originals/x.jpg',
    variants: {},
    mimeType: 'image/jpeg',
    fileExtension: 'jpg',
    fileSize: 1,
    width: 1,
    height: 1,
    checksum: null,
    title: null,
    altText: null,
    caption: null,
    credit: null,
    uploadedBy: null,
    createdAt: new Date(),
    deletedAt: null,
    purgedAt: null,
  };
}
