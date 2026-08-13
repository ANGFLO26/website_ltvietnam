import { createHash } from 'node:crypto';
import type { AppConfig } from '@ltv/config';
import type { MediaAdminView, MediaUsageView } from '@ltv/contracts';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { Media } from '../../dao/media/object.js';
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import { page, type Page } from '../../shared/http/envelope.js';
import type { MediaUsage, MediaUsageService } from '../shared/media-usage.interface.js';
import type {
  MediaListInput,
  MediaMetadataInput,
  MediaService,
  OpenedFile,
  PublicMediaFile,
  UploadedMediaFile,
} from './interface.js';
import { LocalMediaStorage } from './storage.js';

export type MediaDaos = DaoScope<'media' | 'documents'>;

interface MediaServiceOptions {
  readonly onAudit?: (event: string, fields: Record<string, unknown>) => void;
}

export class MediaServiceImpl implements MediaService {
  private readonly storage: LocalMediaStorage;

  constructor(
    private readonly daos: MediaDaos,
    private readonly usage: MediaUsageService,
    private readonly cfg: AppConfig,
    private readonly options: MediaServiceOptions = {},
    storage?: LocalMediaStorage,
  ) {
    this.storage = storage ?? new LocalMediaStorage(cfg);
  }

  async upload(
    file: UploadedMediaFile,
    metadata: MediaMetadataInput,
    actorUserId: string,
  ): Promise<MediaAdminView> {
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const duplicate = await this.daos.media.findByChecksum(checksum);
    if (duplicate) throw duplicateError(duplicate.id);

    const stored = await this.storage.store(file);
    try {
      const media = await this.daos.media.insert({
        ...stored,
        checksum,
        title: metadata.title ?? null,
        altText: metadata.altText ?? null,
        caption: metadata.caption ?? null,
        credit: metadata.credit ?? null,
        uploadedBy: actorUserId,
      });
      this.audit('media_uploaded', {
        actor_user_id: actorUserId,
        entity_type: 'media',
        entity_id: media.id,
        result: 'success',
      });
      return toView(media, null, this.cfg.MEDIA_PUBLIC_DIR);
    } catch (error) {
      await this.storage.discard(stored);
      if ((error as { code?: unknown }).code === '23505') {
        const existing = await this.daos.media.findByChecksum(checksum);
        throw duplicateError(existing?.id);
      }
      throw error;
    }
  }

  async list(input: MediaListInput): Promise<Page<MediaAdminView>> {
    const result = await this.daos.media.list(
      {
        ...(input.type !== undefined && {
          mimeGroup: input.type === 'image' ? 'image' : 'application',
        }),
        ...(input.mimeType !== undefined && { mimeType: input.mimeType }),
        ...(input.search !== undefined && { search: input.search }),
      },
      { page: input.page, pageSize: input.pageSize },
    );
    return page(
      result.data.map((media) => toView(media, null, this.cfg.MEDIA_PUBLIC_DIR)),
      result.meta,
    );
  }

  async findById(id: string): Promise<MediaAdminView> {
    const media = await this.daos.media.findById(id);
    if (!media) throw new NotFoundError('MEDIA_NOT_FOUND', `Khong tim thay tep ${id}`);
    return toView(media, await this.usage.usage(id), this.cfg.MEDIA_PUBLIC_DIR);
  }

  async update(id: string, input: MediaMetadataInput): Promise<MediaAdminView> {
    if (!(await this.daos.media.findById(id))) {
      throw new NotFoundError('MEDIA_NOT_FOUND', `Khong tim thay tep ${id}`);
    }
    const media = await this.daos.media.update(id, input);
    return toView(media, await this.usage.usage(id), this.cfg.MEDIA_PUBLIC_DIR);
  }

  async delete(id: string, actorUserId: string): Promise<void> {
    try {
      await this.usage.softDelete(id);
      this.audit('media_delete_attempt', {
        actor_user_id: actorUserId,
        entity_type: 'media',
        entity_id: id,
        result: 'success',
      });
    } catch (error) {
      this.audit('media_delete_attempt', {
        actor_user_id: actorUserId,
        entity_type: 'media',
        entity_id: id,
        result: 'rejected',
        error_code: (error as { code?: unknown }).code ?? 'INTERNAL',
      });
      throw error;
    }
  }

  async openPublic(assetPath: string): Promise<PublicMediaFile> {
    const clean = publicAssetPath(assetPath);
    let storagePath = `${this.cfg.MEDIA_PUBLIC_DIR.replaceAll('\\', '/')}/${clean}`;
    let media = await this.daos.media.findActiveByPublicAssetPath(storagePath);
    // F4 cu da seed `public/<file>` truoc khi F7 chot public-media/originals.
    // Fallback chi mo nhanh public/ va adapter van rang tep vao publicDir.
    if (!media && clean.startsWith('public/')) {
      const legacyPath = clean;
      media = await this.daos.media.findActiveByPublicAssetPath(legacyPath);
      if (media) storagePath = legacyPath;
    }
    if (!media) throw new NotFoundError('MEDIA_NOT_FOUND', 'Khong tim thay tep media');
    const opened = await this.storage.open(media, storagePath);
    return {
      ...opened,
      cacheControl: `public, max-age=${this.cfg.MEDIA_PUBLIC_MAX_AGE_SECONDS}, immutable`,
    };
  }

  async downloadDocument(slug: string): Promise<OpenedFile> {
    const document = await this.daos.documents.findDownloadableBySlug(slug);
    if (!document) {
      throw new NotFoundError('DOCUMENT_NOT_PUBLIC', 'Tai lieu khong ton tai hoac khong cong khai');
    }
    const media = await this.daos.media.findById(document.fileId);
    if (!media || media.storageClass !== 'protected' || media.mimeType !== 'application/pdf') {
      throw new NotFoundError('DOCUMENT_FILE_UNAVAILABLE', 'Tep tai lieu khong san sang');
    }
    const opened = await this.storage.open(media, media.storagePath);
    try {
      await this.daos.documents.recordDownload(document.id, new Date());
    } catch (error) {
      opened.stream.destroy();
      throw error;
    }
    return { ...opened, fileName: media.originalName };
  }

  async purgeDue(limit = 50, now = new Date()): Promise<number> {
    const delayMs = this.cfg.MEDIA_PURGE_DELAY_DAYS * 24 * 60 * 60 * 1000;
    const ids = await this.usage.findPurgeable(new Date(now.getTime() - delayMs), limit);
    let purged = 0;
    for (const id of ids) {
      const media = await this.daos.media.findStoredById(id);
      if (!media || media.purgedAt || (await this.daos.media.countReferences(id)) > 0) continue;
      await this.storage.removeMediaFiles(media);
      await this.daos.media.markPurged(id, now);
      purged += 1;
    }
    return purged;
  }

  private audit(event: string, fields: Record<string, unknown>): void {
    // Audit khong duoc lam use case that bai sau khi DB/tep da ghi thanh cong.
    try {
      this.options.onAudit?.(event, fields);
    } catch {
      // Logger chuan khong nem; adapter thay the neu hong cung khong pha duong ghi.
    }
  }
}

function toView(media: Media, usage: MediaUsage | null, publicDir: string): MediaAdminView {
  return {
    id: media.id,
    file_name: media.fileName,
    original_name: media.originalName,
    storage_class: media.storageClass,
    public_url: media.storageClass === 'public' ? media.publicUrl : null,
    variants:
      media.storageClass === 'public'
        ? Object.fromEntries(
            Object.entries(media.variants).flatMap(([name, path]) => {
              const url = publicUrl(path, publicDir);
              return url === null ? [] : [[name, url]];
            }),
          )
        : {},
    mime_type: media.mimeType,
    file_extension: media.fileExtension,
    file_size_bytes: media.fileSize,
    width: media.width,
    height: media.height,
    checksum: media.checksum,
    title: media.title,
    alt_text: media.altText,
    caption: media.caption,
    credit: media.credit,
    uploaded_by: media.uploadedBy,
    created_at: media.createdAt.toISOString(),
    usage: usage ? usageView(usage) : null,
  };
}

function usageView(usage: MediaUsage): MediaUsageView {
  return {
    foreign_keys: usage.foreignKeys,
    content_blocks: usage.contentBlocks,
    total: usage.total,
    places: usage.places.map((place) => ({
      source: place.source,
      entity_type: place.entityType,
      entity_id: place.entityId,
      field_name: place.fieldName,
      locale: place.locale,
    })),
  };
}

function publicUrl(storagePath: string, publicDir: string): string | null {
  const normalized = storagePath.replaceAll('\\', '/');
  const prefix = `${publicDir.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '')}/`;
  if (!normalized.startsWith(prefix)) return null;
  return `/media/${normalized.slice(prefix.length)}`;
}

function publicAssetPath(value: string): string {
  const clean = value.replace(/^\/+/, '');
  if (
    !clean ||
    clean.includes('\\') ||
    clean.includes('\0') ||
    clean.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new NotFoundError('MEDIA_NOT_FOUND', 'Khong tim thay tep media');
  return clean;
}

function duplicateError(existingId?: string): ConflictError {
  return new ConflictError(
    'MEDIA_DUPLICATE',
    'Noi dung tep da ton tai trong thu vien media',
    existingId ? { existing_id: existingId } : undefined,
  );
}
