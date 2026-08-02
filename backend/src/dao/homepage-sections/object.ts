/**
 * KHOI TREN TRANG CHU — 13 khoi, bat/tat va sap xep duoc.
 *
 * `section_type` la UNIQUE va la khoa nghiep vu: ma nguon render tro toi
 * `hero`, `featured_products`, `brand_wall`... Doi thu tu hay tat mot khoi la
 * viec cua bien tap; them mot LOAI khoi moi la viec cua lap trinh, vi phai
 * co ma render tuong ung.
 *
 * `settings` la JSONB tu do, va hinh dang cua no KHAC NHAU theo tung loai
 * khoi (`featured_products` co `limit`, `hero` co `autoplay_ms`). DAO khong
 * hieu cac hinh dang do va khong nen hieu — tang service so huu tung loai
 * khoi se tu kiem bang zod truoc khi ghi.
 */
export interface HomepageSection {
  readonly id: string;
  readonly sectionType: string;
  readonly isEnabled: boolean;
  readonly displayOrder: number;
  readonly settings: Readonly<Record<string, unknown>>;
}

export interface UpsertHomepageSectionInput {
  readonly sectionType: string;
  readonly isEnabled?: boolean;
  readonly displayOrder?: number;
  readonly settings?: Readonly<Record<string, unknown>>;
}
