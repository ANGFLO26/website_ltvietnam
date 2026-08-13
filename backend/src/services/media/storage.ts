import { createReadStream } from 'node:fs';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '@ltv/config';
import sharp from 'sharp';
import type { CreateMediaInput, Media } from '../../dao/media/object.js';
import { DomainError, NotFoundError } from '../../shared/errors.js';
import type { AllowedMediaMimeType, OpenedFile, UploadedMediaFile } from './interface.js';

const IMAGE_VARIANTS = {
  thumb: 320,
  small: 640,
  medium: 1280,
  large: 1920,
} as const;

const MIME_EXTENSION: Record<AllowedMediaMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export type StoredUpload = CreateMediaInput;

/** Adapter kho tep cuc bo. Moi duong dan deu duoc rang trong MEDIA_ROOT. */
export class LocalMediaStorage {
  private readonly root: string;
  private readonly publicDir: string;
  private readonly publicOriginals: string;
  private readonly publicVariants: string;
  private readonly protectedDir: string;
  private readonly tempDir: string;
  private readonly quarantineDir: string;

  constructor(private readonly cfg: AppConfig) {
    this.root = resolve(cfg.MEDIA_ROOT);
    this.publicDir = childDirectory(this.root, cfg.MEDIA_PUBLIC_DIR, 'MEDIA_PUBLIC_DIR');
    this.publicOriginals = childDirectory(this.publicDir, 'originals', 'public originals');
    this.publicVariants = childDirectory(this.publicDir, 'variants', 'public variants');
    this.protectedDir = childDirectory(this.root, cfg.MEDIA_PROTECTED_DIR, 'MEDIA_PROTECTED_DIR');
    this.tempDir = childDirectory(this.root, cfg.MEDIA_TEMP_DIR, 'MEDIA_TEMP_DIR');
    this.quarantineDir = childDirectory(
      this.root,
      cfg.MEDIA_QUARANTINE_DIR,
      'MEDIA_QUARANTINE_DIR',
    );
  }

  async store(file: UploadedMediaFile): Promise<StoredUpload> {
    this.assertUploadSize(file);
    const originalName = safeOriginalName(file.originalName);
    const mimeType = detectMime(file.buffer);
    if (!mimeType || !sameClaimedMime(file.claimedMimeType, mimeType)) {
      throw invalidFile(
        'MEDIA_TYPE_NOT_ALLOWED',
        'Noi dung tep khong khop mot dinh dang duoc phep (JPG, PNG, WebP, PDF)',
      );
    }

    await this.ensureDirectories();
    const id = randomUUID();
    const extension = MIME_EXTENSION[mimeType];
    const fileName = `${id}.${extension}`;
    const tempPath = resolve(this.tempDir, `${id}.upload`);
    const created: string[] = [tempPath];

    try {
      await writeFile(tempPath, file.buffer, { flag: 'wx' });
      if (mimeType === 'application/pdf') {
        const destination = resolve(this.protectedDir, fileName);
        await rename(tempPath, destination);
        created[0] = destination;
        return {
          fileName,
          originalName,
          storageDisk: 'local',
          storageClass: 'protected',
          storagePath: relativeStoragePath(this.root, destination),
          publicUrl: null,
          variants: {},
          mimeType,
          fileExtension: extension,
          fileSize: file.size,
          width: null,
          height: null,
        };
      }

      const metadata = await sharp(tempPath, {
        failOn: 'error',
        limitInputPixels: 40_000_000,
      }).metadata();
      if (!metadata.width || !metadata.height || !formatMatches(metadata.format, mimeType)) {
        throw invalidFile(
          'MEDIA_IMAGE_INVALID',
          'Tep anh bi hong hoac dinh dang that khong hop le',
        );
      }

      const variants: Record<string, string> = {};
      for (const [name, width] of Object.entries(IMAGE_VARIANTS)) {
        const destination = resolve(this.publicVariants, `${id}-${name}.webp`);
        // Ghi vao danh sach TRUOC `toFile`: neu dia day giua chung thi tep
        // dang do van duoc don trong nhanh catch.
        created.push(destination);
        await sharp(tempPath, { failOn: 'error', limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(destination);
        variants[name] = relativeStoragePath(this.root, destination);
      }

      const destination = resolve(this.publicOriginals, fileName);
      await rename(tempPath, destination);
      created[0] = destination;
      return {
        fileName,
        originalName,
        storageDisk: 'local',
        storageClass: 'public',
        storagePath: relativeStoragePath(this.root, destination),
        publicUrl: `/media/originals/${fileName}`,
        variants,
        mimeType,
        fileExtension: extension,
        fileSize: file.size,
        width: metadata.width,
        height: metadata.height,
      };
    } catch (error) {
      await Promise.all(created.map((path) => removeFile(path)));
      if (error instanceof DomainError) throw error;
      throw invalidFile('MEDIA_IMAGE_INVALID', 'Khong the doc hoac tao bien the cho tep anh');
    }
  }

  async discard(upload: StoredUpload): Promise<void> {
    await this.removePaths([upload.storagePath, ...Object.values(upload.variants ?? {})]);
  }

  async removeMediaFiles(media: Media): Promise<void> {
    await this.removePaths([media.storagePath, ...Object.values(media.variants)]);
  }

  async open(media: Media, storagePath: string): Promise<OpenedFile> {
    const allowed =
      storagePath === media.storagePath || Object.values(media.variants).includes(storagePath);
    if (!allowed) throw new NotFoundError('MEDIA_NOT_FOUND', 'Khong tim thay tep media');
    const legacyPublicPath = storagePath.startsWith('public/')
      ? storageAbsolutePath(this.publicDir, storagePath.slice('public/'.length))
      : null;
    const path = legacyPublicPath ?? storageAbsolutePath(this.root, storagePath);
    if (media.storageClass === 'public') assertInside(this.publicDir, path, 'public media');
    else if (media.storageClass === 'protected')
      assertInside(this.protectedDir, path, 'protected media');
    else throw new NotFoundError('MEDIA_NOT_FOUND', 'Khong tim thay tep media');
    const info = await fileInfo(path);
    return {
      stream: createReadStream(path),
      size: info.size,
      mimeType: storagePath === media.storagePath ? media.mimeType : 'image/webp',
      fileName: storagePath === media.storagePath ? media.originalName : basename(path),
    };
  }

  private assertUploadSize(file: UploadedMediaFile): void {
    if (file.size <= 0 || file.buffer.length <= 0) {
      throw invalidFile('MEDIA_EMPTY', 'Tep tai len khong duoc rong');
    }
    if (file.size !== file.buffer.length) {
      throw invalidFile('MEDIA_SIZE_MISMATCH', 'Kich thuoc tep tai len khong nhat quan');
    }
    if (file.size > this.cfg.MEDIA_MAX_UPLOAD_BYTES) {
      throw new DomainError(
        'MEDIA_TOO_LARGE',
        `Tep vuot qua gioi han ${this.cfg.MEDIA_MAX_UPLOAD_BYTES} byte`,
        'VALIDATION_FAILED',
      );
    }
  }

  private async ensureDirectories(): Promise<void> {
    // Quarantine duoc tao san de bo quet malware co the chuyen tep mot cach
    // nguyen tu sau nay; upload sai hien tai bi xoa ngay, khong giu noi dung la.
    await Promise.all([
      mkdir(this.publicOriginals, { recursive: true }),
      mkdir(this.publicVariants, { recursive: true }),
      mkdir(this.protectedDir, { recursive: true }),
      mkdir(this.tempDir, { recursive: true }),
      mkdir(this.quarantineDir, { recursive: true }),
    ]);
  }

  private async removePaths(paths: readonly string[]): Promise<void> {
    await Promise.all(
      paths.map(async (storagePath) => {
        const path = storageAbsolutePath(this.root, storagePath);
        await removeFile(path);
      }),
    );
  }
}

export function detectMime(buffer: Buffer): AllowedMediaMimeType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'image/png';
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'image/webp';
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  return null;
}

function sameClaimedMime(claimed: string, detected: AllowedMediaMimeType): boolean {
  return claimed.toLowerCase() === detected;
}

function formatMatches(format: string | undefined, mime: AllowedMediaMimeType): boolean {
  return (
    (format === 'jpeg' && mime === 'image/jpeg') ||
    (format === 'png' && mime === 'image/png') ||
    (format === 'webp' && mime === 'image/webp')
  );
}

function safeOriginalName(value: string): string {
  if (
    value.length < 1 ||
    value.length > 255 ||
    value.includes('\0') ||
    /[\\/]/.test(value) ||
    value === '.' ||
    value === '..' ||
    basename(value) !== value ||
    [...value].some((char) => {
      const code = char.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  )
    throw invalidFile('MEDIA_FILENAME_INVALID', 'Ten tep khong an toan');
  return value;
}

function childDirectory(parent: string, child: string, label: string): string {
  if (!child || isAbsolute(child) || /^[a-zA-Z]:/.test(child)) {
    throw new Error(`${label} phai la thu muc tuong doi ben trong MEDIA_ROOT`);
  }
  const path = resolve(parent, child);
  assertInside(parent, path, label);
  return path;
}

function storageAbsolutePath(root: string, storagePath: string): string {
  if (
    !storagePath ||
    isAbsolute(storagePath) ||
    /^[a-zA-Z]:/.test(storagePath) ||
    storagePath.includes('\\')
  ) {
    throw invalidFile('MEDIA_PATH_INVALID', 'Duong dan media khong hop le');
  }
  const path = resolve(root, ...storagePath.split('/'));
  assertInside(root, path, 'media path');
  return path;
}

function assertInside(parent: string, child: string, label: string): void {
  const rel = relative(parent, child);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`${label} nam ngoai thu muc cho phep`);
  }
}

function relativeStoragePath(root: string, path: string): string {
  assertInside(root, path, 'storage path');
  return relative(root, path).split(sep).join('/');
}

async function fileInfo(path: string) {
  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error('not-file');
    return info;
  } catch {
    throw new NotFoundError('MEDIA_FILE_MISSING', 'Tep media khong con trong kho luu tru');
  }
}

async function removeFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

function invalidFile(code: string, message: string): DomainError {
  return new DomainError(code, message, 'VALIDATION_FAILED');
}
