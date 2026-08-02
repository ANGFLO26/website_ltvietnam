import type { HomepageSection, UpsertHomepageSectionInput } from './object.js';

export interface HomepageSectionDao {
  /** Moi khoi, ke ca khoi da tat — cho man hinh quan tri. */
  listAll(): Promise<HomepageSection[]>;
  /** Chi khoi dang bat, dung thu tu — cho trang chu. */
  listEnabled(): Promise<HomepageSection[]>;
  findByType(sectionType: string): Promise<HomepageSection | null>;

  upsert(input: UpsertHomepageSectionInput): Promise<HomepageSection>;
  setEnabled(sectionType: string, enabled: boolean): Promise<void>;

  /**
   * Sap xep lai toan bo trong MOT transaction.
   *
   * Nhan ca danh sach chu khong phai tung khoi mot: keo tha tren giao dien
   * sinh ra mot thu tu MOI cho tat ca, va ghi tung cai mot se de lai trang
   * chu o thu tu nua voi neu dut giua chung.
   */
  reorder(sectionTypesInOrder: readonly string[]): Promise<void>;
}
