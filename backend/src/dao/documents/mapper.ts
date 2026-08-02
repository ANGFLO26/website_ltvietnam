import type { Selectable } from 'kysely';
import type { DocumentsTable } from '@ltv/db';
import type { EntityStatus } from '../brands/object.js';
import type { AppDocument, DocumentType, DocumentVisibility } from './object.js';

export function toDocument(row: Selectable<DocumentsTable>): AppDocument {
  return {
    id: row.id,
    documentType: row.document_type as DocumentType,
    fileId: row.file_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    language: row.language as 'vi' | 'en' | 'multi',
    version: row.version,
    // DATE ve nguyen dang chuoi `YYYY-MM-DD`.
    publicationDate: row.publication_date,
    status: row.status as EntityStatus,
    visibility: row.visibility as DocumentVisibility,
    // BIGINT -> chuoi tu `pg`
    downloadCount: Number(row.download_count),
    publishedAt: row.published_at,
    firstPublishedAt: row.first_published_at,
  };
}
