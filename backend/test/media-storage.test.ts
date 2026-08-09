import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { loadConfig } from '@ltv/config';
import { DomainError } from '../src/shared/errors.js';
import { LocalMediaStorage, detectMime } from '../src/services/media/storage.js';

describe('F7 LocalMediaStorage', () => {
  let root: string;
  let storage: LocalMediaStorage;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ltv-f7-media-'));
    const cfg = loadConfig({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      JWT_SECRET: 'a'.repeat(32),
      PASSWORD_RESET_SECRET: 'b'.repeat(32),
      MEDIA_ROOT: root,
      MEDIA_MAX_UPLOAD_BYTES: '1048576',
    } as NodeJS.ProcessEnv);
    storage = new LocalMediaStorage(cfg);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('chan PHP doi duoi jpg, SVG va ten co path traversal', async () => {
    await expect(
      storage.store({
        originalName: 'shell.jpg',
        claimedMimeType: 'image/jpeg',
        size: 20,
        buffer: Buffer.from('<?php echo "pwn"; ?>'),
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_TYPE_NOT_ALLOWED' });

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    await expect(
      storage.store({
        originalName: 'x.svg',
        claimedMimeType: 'image/svg+xml',
        size: svg.length,
        buffer: svg,
      }),
    ).rejects.toBeInstanceOf(DomainError);

    const png = await imageBuffer('png');
    await expect(
      storage.store({
        originalName: '../../etc/passwd',
        claimedMimeType: 'image/png',
        size: png.length,
        buffer: png,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_FILENAME_INVALID' });
  });

  it('giai ma anh that va tao du bon bien the WebP trong public-media', async () => {
    const png = await imageBuffer('png');
    const saved = await storage.store({
      originalName: 'may-thi-nghiem.png',
      claimedMimeType: 'image/png',
      size: png.length,
      buffer: png,
    });

    expect(saved.storageClass).toBe('public');
    expect(saved.publicUrl).toMatch(/^\/media\/originals\//);
    expect(saved.width).toBe(800);
    expect(saved.height).toBe(600);
    expect(Object.keys(saved.variants)).toEqual(['thumb', 'small', 'medium', 'large']);
    for (const path of Object.values(saved.variants ?? {})) {
      expect(path).toMatch(/^public-media\/variants\/.*\.webp$/);
      expect((await stat(join(root, ...path.split('/')))).isFile()).toBe(true);
      expect(detectMime(await readFile(join(root, ...path.split('/'))))).toBe('image/webp');
    }
  });

  it('luu PDF o protected-documents va khong sinh URL/variant cong khai', async () => {
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
    const saved = await storage.store({
      originalName: 'catalogue.pdf',
      claimedMimeType: 'application/pdf',
      size: pdf.length,
      buffer: pdf,
    });
    expect(saved.storageClass).toBe('protected');
    expect(saved.storagePath).toMatch(/^protected-documents\//);
    expect(saved.publicUrl).toBeNull();
    expect(saved.variants).toEqual({});
    expect((await stat(join(root, ...saved.storagePath.split('/')))).isFile()).toBe(true);
  });

  it('tu choi MIME khai bao khac magic bytes va tep vuot tran', async () => {
    const png = await imageBuffer('png');
    await expect(
      storage.store({
        originalName: 'fake.jpg',
        claimedMimeType: 'image/jpeg',
        size: png.length,
        buffer: png,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_TYPE_NOT_ALLOWED' });

    const tooLarge = Buffer.alloc(1_048_577, 1);
    await expect(
      storage.store({
        originalName: 'large.pdf',
        claimedMimeType: 'application/pdf',
        size: tooLarge.length,
        buffer: tooLarge,
      }),
    ).rejects.toMatchObject({ code: 'MEDIA_TOO_LARGE' });
  });
});

async function imageBuffer(format: 'png' | 'jpeg' | 'webp' = 'png'): Promise<Buffer> {
  const image = sharp({
    create: { width: 800, height: 600, channels: 3, background: '#2563eb' },
  });
  if (format === 'jpeg') return image.jpeg().toBuffer();
  if (format === 'webp') return image.webp().toBuffer();
  return image.png().toBuffer();
}
