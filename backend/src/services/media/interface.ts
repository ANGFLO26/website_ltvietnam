import type { Readable } from 'node:stream';
import type { MediaAdminView } from '@ltv/contracts';
import type { Page } from '../../shared/http/envelope.js';

export const MEDIA_SERVICE = Symbol('MEDIA_SERVICE');

export const ALLOWED_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

export interface UploadedMediaFile {
  readonly originalName: string;
  readonly claimedMimeType: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export interface MediaMetadataInput {
  readonly title?: string | null;
  readonly altText?: string | null;
  readonly caption?: string | null;
  readonly credit?: string | null;
}

export interface MediaListInput {
  readonly type?: 'image' | 'document';
  readonly mimeType?: AllowedMediaMimeType;
  readonly search?: string;
  readonly page: number;
  readonly pageSize: number;
}

export interface OpenedFile {
  readonly stream: Readable;
  readonly size: number;
  readonly mimeType: string;
  readonly fileName: string;
}

export interface PublicMediaFile extends OpenedFile {
  readonly cacheControl: string;
}

export interface MediaService {
  upload(
    file: UploadedMediaFile,
    metadata: MediaMetadataInput,
    actorUserId: string,
  ): Promise<MediaAdminView>;
  list(input: MediaListInput): Promise<Page<MediaAdminView>>;
  findById(id: string): Promise<MediaAdminView>;
  update(id: string, input: MediaMetadataInput): Promise<MediaAdminView>;
  delete(id: string, actorUserId: string): Promise<void>;
  openPublic(assetPath: string): Promise<PublicMediaFile>;
  downloadDocument(slug: string): Promise<OpenedFile>;
  /** Don toi da `limit` tep da qua thoi gian an toan. Tra so tep da don. */
  purgeDue(limit?: number, now?: Date): Promise<number>;
}
