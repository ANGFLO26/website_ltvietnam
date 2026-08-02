import type { EntityStatus } from '../brands/object.js';

export type DocumentType =
  | 'catalogue' | 'brochure' | 'datasheet' | 'application_note'
  | 'company_profile' | 'manual' | 'certificate' | 'other';

/**
 * MUC DO HIEN THI cua tai lieu — ranh gioi D20.
 *
 *   public          ai cung tai duoc
 *   hidden          co URL van khong tai duoc
 *   email_required  phai de lai email (P1, chua cai dat)
 *   customer_only   phai dang nhap tai khoan khach
 *   staff_only      chi noi bo
 *
 * ADR-012: KHONG co gia tri `video` trong `document_type`. Video nhung tu
 * YouTube/Vimeo qua khoi `external_video`, khong luu tep.
 */
export type DocumentVisibility =
  | 'public' | 'hidden' | 'email_required' | 'customer_only' | 'staff_only';

export interface AppDocument {
  readonly id: string;
  readonly documentType: DocumentType;
  readonly fileId: string;
  readonly title: string;
  readonly slug: string;
  readonly description: string | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly language: 'vi' | 'en' | 'multi';
  readonly version: string | null;
  /** `YYYY-MM-DD` — xem `CalendarDate` trong `projects/object.ts`. */
  readonly publicationDate: string | null;
  readonly status: EntityStatus;
  readonly visibility: DocumentVisibility;
  readonly downloadCount: number;
  readonly publishedAt: Date | null;
  readonly firstPublishedAt: Date | null;
}

/**
 * Tai lieu TAI CONG KHAI DUOC.
 *
 * `05` PHAN IV: chi tai duoc khi `status='published'` VA `visibility='public'`.
 * HAI dieu kien, khong phai mot — day la cho de sai nhat, vi mot tai lieu
 * `published` nghe nhu la da cong khai. Ep thanh kieu de ham phuc vu tai
 * xuong khong the nhan nham mot tai lieu chua du dieu kien.
 */
export interface DownloadableDocument extends AppDocument {
  readonly status: 'published';
  readonly visibility: 'public';
}

export interface CreateDocumentInput {
  readonly documentType: DocumentType;
  readonly fileId: string;
  readonly title: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly language?: 'vi' | 'en' | 'multi';
  readonly version?: string | null;
  readonly publicationDate?: string | null;
  readonly visibility?: DocumentVisibility;
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
}

export type UpdateDocumentInput = Partial<CreateDocumentInput>;

export interface DocumentFilter {
  readonly status?: EntityStatus;
  readonly visibility?: DocumentVisibility;
  readonly documentType?: DocumentType;
  readonly language?: 'vi' | 'en' | 'multi';
  readonly search?: string;
  readonly includeDeleted?: boolean;
}

export interface DocumentLinks {
  readonly productIds?: readonly string[];
  readonly brandIds?: readonly string[];
  readonly serviceIds?: readonly string[];
  readonly postIds?: readonly string[];
}
