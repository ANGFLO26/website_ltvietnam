import type { ContentFieldRef, ContentMediaRef } from './object.js';

export interface ContentMediaRefDao {
  /**
   * Dong bo tham chieu cho MOT o chua khoi.
   *
   * Thay ca tap (ADR-008): xoa het tham chieu cu cua o do roi ghi lai. Goi
   * NGAY SAU khi ghi khoi, trong CUNG transaction — neu tach ra thi giua hai
   * thao tac se co khoanh khac chi muc noi doi, va mot lenh don dep chay
   * dung luc do se xoa nham anh dang dung.
   */
  replaceForField(field: ContentFieldRef, mediaIds: readonly string[]): Promise<void>;

  /** Don khi thuc the bi xoa vinh vien. */
  deleteForEntity(entityType: string, entityId: string): Promise<void>;

  findByMedia(mediaId: string): Promise<ContentMediaRef[]>;
  countByMedia(mediaId: string): Promise<number>;

  /**
   * Tham chieu MO COI: tro toi thuc the khong con ton tai.
   *
   * Chung xuat hien khi mot duong xoa quen goi `deleteForEntity`. Ham nay la
   * cach PHAT HIEN cho bo sot do — chay dinh ky va bao. Khong tu don, vi
   * mot tham chieu mo coi lam anh khong xoa duoc (an toan), con don nham thi
   * lam anh dang dung bi xoa (khong an toan).
   */
  findOrphans(limit: number): Promise<ContentMediaRef[]>;
}
