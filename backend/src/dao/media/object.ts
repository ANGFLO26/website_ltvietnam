/**
 * Thuc the nghiep vu `Media`.
 *
 * D20 — RANH GIOI KHONG GIAN TEN. `storageClass` quyet dinh tep nam o
 * `public-media/` hay `protected-documents/`, va do la thu duy nhat chan
 * mot ban ve ky thuat noi bo bi phat cong khai. Vi the no la kieu lien hop
 * chu khong phai `string`: go sai mot chu la loi bien dich.
 */
export type StorageClass = 'public' | 'protected' | 'temp' | 'quarantine';

/**
 * Cac kich thuoc dan xuat do worker sinh ra.
 * Khoa la ten bien the (`thumb`, `medium`, `large`), gia tri la duong dan
 * TUONG DOI trong cung storage disk — khong bao gio la URL tuyet doi,
 * vi doi CDN thi moi hang trong bang se sai.
 */
export type MediaVariants = Readonly<Record<string, string>>;

export interface Media {
  readonly id: string;
  readonly fileName: string;
  readonly originalName: string;
  readonly storageDisk: string;
  readonly storageClass: StorageClass;
  readonly storagePath: string;
  readonly publicUrl: string | null;
  readonly variants: MediaVariants;
  readonly mimeType: string;
  readonly fileExtension: string;
  readonly fileSize: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly checksum: string | null;
  readonly title: string | null;
  readonly altText: string | null;
  readonly caption: string | null;
  readonly credit: string | null;
  readonly uploadedBy: string | null;
  readonly createdAt: Date;
  readonly deletedAt: Date | null;
  readonly purgedAt: Date | null;
}

/**
 * Anh dung duoc trong noi dung cong khai.
 *
 * Hai rang buoc thanh KIEU thay vi kiem lai luc chay:
 *  - `storageClass: 'public'` — tep bao ve khong duoc nhung vao trang cong khai
 *  - `altText: string` — A11y, va la dieu kien publish trong `05` PHAN IV
 */
export interface PublicImage extends Media {
  readonly storageClass: 'public';
  readonly publicUrl: string;
  readonly altText: string;
  readonly width: number;
  readonly height: number;
}

export interface CreateMediaInput {
  readonly fileName: string;
  readonly originalName: string;
  readonly storageDisk?: string;
  readonly storageClass: StorageClass;
  readonly storagePath: string;
  readonly publicUrl?: string | null;
  readonly variants?: MediaVariants;
  readonly mimeType: string;
  readonly fileExtension: string;
  readonly fileSize: number;
  readonly width?: number | null;
  readonly height?: number | null;
  readonly checksum?: string | null;
  readonly title?: string | null;
  readonly altText?: string | null;
  readonly caption?: string | null;
  readonly credit?: string | null;
  readonly uploadedBy?: string | null;
}

/**
 * Chi SIEU DU LIEU sua duoc sau khi tai len.
 *
 * `storagePath`, `checksum`, `fileSize`, `mimeType` KHONG co trong kieu nay:
 * doi chung nghia la tep khac, ma tep khac thi phai la ban ghi khac. Neu cho
 * sua thi `content_media_refs` van tro toi id cu trong khi noi dung da doi —
 * dung cai bay A4 ma D20 dat ra de tranh.
 */
export interface UpdateMediaInput {
  readonly title?: string | null;
  readonly altText?: string | null;
  readonly caption?: string | null;
  readonly credit?: string | null;
}

export interface MediaFilter {
  /** Loc theo ho MIME: `image`, `application`, `video`. */
  readonly mimeGroup?: string;
  readonly storageClass?: StorageClass;
  readonly uploadedBy?: string;
  /** Tim theo ten tep goc / tieu de / alt. */
  readonly search?: string;
  readonly includeDeleted?: boolean;
}
