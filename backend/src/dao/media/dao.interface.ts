import type { Page, Paged } from '../helpers.js';
import type { CreateMediaInput, Media, MediaFilter, UpdateMediaInput } from './object.js';

/**
 * Hop dong truy cap bang `media`.
 *
 * KHONG co tham so executor trong bat ky chu ky nao — DAO lay tu `tx` cua
 * DaoManager nen transaction da gan san.
 */
export interface MediaDao {
  findById(id: string): Promise<Media | null>;

  /**
   * Lay nhieu id trong MOT truy van.
   *
   * Day la ham chan N+1 cho khoi noi dung: mot trang co 12 anh thi
   * renderer goi mot lan voi 12 id, khong phai 12 lan.
   */
  findManyByIds(ids: readonly string[]): Promise<Media[]>;

  findByStoragePath(path: string): Promise<Media | null>;

  /** Tra ve ban ghi cu neu tep trung — dung de khong luu hai lan cung mot anh. */
  findByChecksum(checksum: string): Promise<Media | null>;

  list(filter: MediaFilter, page?: Partial<Page>): Promise<Paged<Media>>;

  insert(input: CreateMediaInput): Promise<Media>;

  /** Chi sua sieu du lieu. Doi tep thi phai tao ban ghi moi (xem `object.ts`). */
  update(id: string, input: UpdateMediaInput): Promise<Media>;

  /** Ghi cac bien the do worker sinh (thumb/medium/large). */
  setVariants(id: string, variants: Readonly<Record<string, string>>): Promise<void>;

  softDelete(id: string, at: Date): Promise<void>;
  restore(id: string): Promise<void>;

  /**
   * Danh dau tep da bi xoa khoi kho luu tru.
   *
   * Vi sao KHONG xoa hang: `content_media_refs` va cac khoa ngoai van co the
   * tro toi id nay trong ban nhap cu. Giu hang lai thi truy vet duoc
   * "anh nay tung ton tai va da bi don"; xoa hang thi chi con id mo coi.
   */
  markPurged(id: string, at: Date): Promise<void>;

  /** Ung vien don dep: da xoa mem truoc `before` va chua purge. */
  findPurgeCandidates(before: Date, limit: number): Promise<Media[]>;

  /**
   * Xoa vinh vien. Nguoi goi PHAI kiem `countReferences` = 0 truoc.
   * DAO khong tu kiem vi viec do bac cau nhieu bang, thuoc tang service.
   */
  hardDelete(id: string): Promise<void>;

  /**
   * Dem so cho DANG THAM CHIEU toi tep nay, gom ca khoa ngoai truc tiep
   * va `content_media_refs` (khoi JSONB). Day chinh la lo hong A4:
   * dem thieu mot nguon la xoa nham anh dang hien tren trang.
   */
  countReferences(id: string): Promise<number>;
}
