import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { loadConfig, type AppConfig } from '@ltv/config';
import type { Media } from '../src/dao/media/object.js';
import type { DownloadableDocument } from '../src/dao/documents/object.js';
import type { MediaUsageService } from '../src/services/shared/media-usage.interface.js';
import { MediaServiceImpl, type MediaDaos } from '../src/services/media/service.js';
import { LocalMediaStorage, type StoredUpload } from '../src/services/media/storage.js';

describe('F7 MediaService: cong public va tai lieu protected', () => {
  let root: string;
  let cfg: AppConfig;
  let storage: LocalMediaStorage;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ltv-f7-service-'));
    cfg = loadConfig({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      JWT_SECRET: 'a'.repeat(32),
      PASSWORD_RESET_SECRET: 'b'.repeat(32),
      MEDIA_ROOT: root,
    } as NodeJS.ProcessEnv);
    storage = new LocalMediaStorage(cfg);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('chi mo anh public da duoc DAO xac nhan; protected PDF khong qua /media', async () => {
    const png = await sharp({
      create: { width: 32, height: 24, channels: 3, background: '#123456' },
    })
      .png()
      .toBuffer();
    const imageStored = await storage.store({
      originalName: 'image.png',
      claimedMimeType: 'image/png',
      size: png.length,
      buffer: png,
    });
    const image = mediaOf(imageStored);
    const pdf = Buffer.from('%PDF-1.4\n%%EOF\n');
    const pdfMedia = mediaOf(
      await storage.store({
        originalName: 'private.pdf',
        claimedMimeType: 'application/pdf',
        size: pdf.length,
        buffer: pdf,
      }),
    );

    const findAsset = vi.fn(async (path: string) => (path === image.storagePath ? image : null));
    const service = makeService(cfg, storage, {
      findActiveByPublicAssetPath: findAsset,
      findById: vi.fn(async (id: string) => (id === pdfMedia.id ? pdfMedia : null)),
    });

    const asset = image.storagePath.replace(/^public-media\//, '');
    const opened = await service.openPublic(asset);
    expect(opened.mimeType).toBe('image/png');
    expect(opened.cacheControl).toContain('immutable');
    expect((await readStream(opened.stream)).length).toBeGreaterThan(0);

    await expect(
      service.openPublic(pdfMedia.storagePath.replace(/^protected-documents\//, '')),
    ).rejects.toMatchObject({ code: 'MEDIA_NOT_FOUND' });
    expect(findAsset).not.toHaveBeenCalledWith(pdfMedia.storagePath);
  });

  it('A5 phuc vu an toan anh demo legacy public/ ben trong public-media', async () => {
    const bytes = await sharp({
      create: { width: 16, height: 16, channels: 3, background: '#0f3554' },
    })
      .jpeg()
      .toBuffer();
    await mkdir(join(root, 'public-media'), { recursive: true });
    await writeFile(join(root, 'public-media', 'demo-image.jpg'), bytes);
    const media = mediaOf({
      fileName: 'demo-image.jpg',
      originalName: 'demo-image.jpg',
      storageClass: 'public',
      storagePath: 'public/demo-image.jpg',
      publicUrl: '/media/public/demo-image.jpg',
      mimeType: 'image/jpeg',
      fileExtension: 'jpg',
      fileSize: bytes.length,
      width: 16,
      height: 16,
      variants: {},
    });
    const findAsset = vi.fn(async (path: string) =>
      path === 'public/demo-image.jpg' ? media : null,
    );
    const service = makeService(cfg, storage, {
      findActiveByPublicAssetPath: findAsset,
    });

    const opened = await service.openPublic('public/demo-image.jpg');
    expect(await readStream(opened.stream)).toEqual(bytes);
    expect(findAsset.mock.calls.map(([path]) => path)).toEqual([
      'public-media/public/demo-image.jpg',
      'public/demo-image.jpg',
    ]);
  });

  it('tai PDF qua document gate va tang download_count dung mot lan', async () => {
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
    const media = mediaOf(
      await storage.store({
        originalName: 'catalogue-2026.pdf',
        claimedMimeType: 'application/pdf',
        size: pdf.length,
        buffer: pdf,
      }),
    );
    const document = downloadable(media.id);
    const recordDownload = vi.fn(async () => undefined);
    const service = makeService(
      cfg,
      storage,
      {
        findById: vi.fn(async () => media),
      },
      {
        findDownloadableBySlug: vi.fn(async () => document),
        recordDownload,
      },
    );

    const opened = await service.downloadDocument(document.slug);
    expect(opened.fileName).toBe('catalogue-2026.pdf');
    expect(opened.mimeType).toBe('application/pdf');
    expect(await readStream(opened.stream)).toEqual(pdf);
    expect(recordDownload).toHaveBeenCalledOnce();
    expect(recordDownload.mock.calls[0]?.[0]).toBe(document.id);
  });

  it('an su ton tai cua document draft/hidden va tu choi media khong protected', async () => {
    const noDocument = makeService(
      cfg,
      storage,
      {},
      {
        findDownloadableBySlug: vi.fn(async () => null),
      },
    );
    await expect(noDocument.downloadDocument('private')).rejects.toMatchObject({
      code: 'DOCUMENT_NOT_PUBLIC',
    });

    const image = mediaOf({
      fileName: 'x.png',
      originalName: 'x.png',
      storageClass: 'public',
      storagePath: 'public-media/originals/x.png',
      publicUrl: '/media/originals/x.png',
      variants: {},
      mimeType: 'image/png',
      fileExtension: 'png',
      fileSize: 1,
      width: 1,
      height: 1,
    });
    const wrongStorage = makeService(
      cfg,
      storage,
      {
        findById: vi.fn(async () => image),
      },
      {
        findDownloadableBySlug: vi.fn(async () => downloadable(image.id)),
      },
    );
    await expect(wrongStorage.downloadDocument('catalogue')).rejects.toMatchObject({
      code: 'DOCUMENT_FILE_UNAVAILABLE',
    });
  });

  it('purge chi xoa file sau delay, kiem lai reference va danh dau purged_at', async () => {
    const png = await sharp({
      create: { width: 16, height: 16, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    const media = {
      ...mediaOf(
        await storage.store({
          originalName: 'old.png',
          claimedMimeType: 'image/png',
          size: png.length,
          buffer: png,
        }),
      ),
      deletedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const original = join(root, ...media.storagePath.split('/'));
    expect((await stat(original)).isFile()).toBe(true);
    const markPurged = vi.fn(async () => undefined);
    const findPurgeable = vi.fn(async () => [media.id]);
    const service = makeService(
      cfg,
      storage,
      {
        findStoredById: vi.fn(async () => media),
        countReferences: vi.fn(async () => 0),
        markPurged,
      },
      {},
      { findPurgeable },
    );

    const now = new Date('2026-08-09T00:00:00Z');
    expect(await service.purgeDue(10, now)).toBe(1);
    await expect(stat(original)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(markPurged).toHaveBeenCalledWith(media.id, now);
    expect(findPurgeable.mock.calls[0]?.[0]).toEqual(
      new Date(now.getTime() - cfg.MEDIA_PURGE_DELAY_DAYS * 86_400_000),
    );
  });
});

function makeService(
  cfg: AppConfig,
  storage: LocalMediaStorage,
  mediaMethods: Record<string, unknown>,
  documentMethods: Record<string, unknown> = {},
  usageMethods: Record<string, unknown> = {},
): MediaServiceImpl {
  const daos = {
    media: mediaMethods,
    documents: documentMethods,
    transaction: async () => undefined,
  } as unknown as MediaDaos;
  const usage = {
    usage: vi.fn(),
    canDelete: vi.fn(),
    softDelete: vi.fn(),
    findPurgeable: vi.fn(),
    ...usageMethods,
  } as unknown as MediaUsageService;
  return new MediaServiceImpl(daos, usage, cfg, {}, storage);
}

function mediaOf(stored: StoredUpload): Media {
  return {
    id: randomUUID(),
    fileName: stored.fileName,
    originalName: stored.originalName,
    storageDisk: stored.storageDisk ?? 'local',
    storageClass: stored.storageClass,
    storagePath: stored.storagePath,
    publicUrl: stored.publicUrl ?? null,
    variants: stored.variants ?? {},
    mimeType: stored.mimeType,
    fileExtension: stored.fileExtension,
    fileSize: stored.fileSize,
    width: stored.width ?? null,
    height: stored.height ?? null,
    checksum: stored.checksum ?? null,
    title: stored.title ?? null,
    altText: stored.altText ?? null,
    caption: stored.caption ?? null,
    credit: stored.credit ?? null,
    uploadedBy: stored.uploadedBy ?? null,
    createdAt: new Date(),
    deletedAt: null,
    purgedAt: null,
  };
}

function downloadable(fileId: string): DownloadableDocument {
  return {
    id: randomUUID(),
    documentType: 'catalogue',
    fileId,
    title: 'Catalogue',
    slug: 'catalogue',
    description: null,
    seoTitle: null,
    seoDescription: null,
    language: 'en',
    version: null,
    publicationDate: null,
    status: 'published',
    visibility: 'public',
    downloadCount: 0,
    publishedAt: new Date(),
    firstPublishedAt: new Date(),
  };
}

async function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
