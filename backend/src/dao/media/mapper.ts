import type { Selectable } from 'kysely';
import type { MediaTable } from '@ltv/db';
import type { Media, MediaVariants, StorageClass } from './object.js';

/** Buc tuong duy nhat giua hang DB va thuc the nghiep vu. */
export function toMedia(row: Selectable<MediaTable>): Media {
  return {
    id: row.id,
    fileName: row.file_name,
    originalName: row.original_name,
    storageDisk: row.storage_disk,
    storageClass: row.storage_class as StorageClass,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    variants: toVariants(row.variants),
    mimeType: row.mime_type,
    fileExtension: row.file_extension,
    // BIGINT ve tu `pg` duoi dang chuoi de khong mat do chinh xac.
    // File 4 GB van thua an toan trong Number (gioi han 9 PB), nen ep o day.
    fileSize: Number(row.file_size),
    width: row.width,
    height: row.height,
    checksum: row.checksum,
    title: row.title,
    altText: row.alt_text,
    caption: row.caption,
    credit: row.credit,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    purgedAt: row.purged_at,
  };
}

/**
 * `variants` la JSONB tu do. Chi nhan cap chuoi -> chuoi; bo qua moi thu khac
 * thay vi tin tuong. Du lieu cu hoac worker phien ban khac co the ghi hinh dang
 * la — khong duoc de no lot len tang tren duoi mot kieu noi doi.
 */
function toVariants(raw: unknown): MediaVariants {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}
