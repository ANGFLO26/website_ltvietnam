/**
 * BANNER trang chu — co CUA SO THOI GIAN.
 *
 * `start_at`/`end_at` la thu khien banner tu bat va tu tat. Diem quan trong:
 * viec "con hieu luc hay khong" phai duoc tinh trong SQL bang `NOW()`, KHONG
 * duoc tinh o Node roi loc trong bo nho. Ly do: neu loc o Node thi phai lay
 * het banner ve, va mot banner het han van bi cache HTTP giu lai o tang tren
 * cho toi luc het TTL. Loc trong SQL thi truy van tu no da dung.
 */
export type BannerStatus = 'draft' | 'published' | 'hidden';

/**
 * LIEN KET DA HINH — `link_target_id` KHONG co khoa ngoai.
 *
 * Day la danh doi co y thuc: mot banner co the tro toi san pham, hang, bai
 * viet hay trang bat ky, va lam bay cot khoa ngoai rieng cho bay loai la
 * qua nang cho mot cai anh.
 *
 * CAI GIA phai tra: PostgreSQL khong bao dam dich con ton tai. San pham bi
 * xoa thi banner van tro toi id do, va tang tren PHAI xu ly duoc truong hop
 * giai khong ra dia chi — bo qua banner do, khong phat mot lien ket gay.
 */
export type BannerLinkType =
  | 'product' | 'product_category' | 'brand' | 'service'
  | 'project' | 'post' | 'page' | 'custom_url' | 'none';

export interface Banner {
  readonly id: string;
  readonly imageId: string;
  readonly mobileImageId: string | null;
  readonly title: string;
  readonly subtitle: string | null;
  readonly buttonLabel: string | null;
  readonly imageAlt: string | null;
  readonly linkType: BannerLinkType;
  readonly linkTargetId: string | null;
  readonly customUrl: string | null;
  readonly openNewTab: boolean;
  readonly status: BannerStatus;
  readonly displayOrder: number;
  readonly startAt: Date | null;
  readonly endAt: Date | null;
}

export interface CreateBannerInput {
  readonly imageId: string;
  readonly title: string;
  readonly mobileImageId?: string | null;
  readonly subtitle?: string | null;
  readonly buttonLabel?: string | null;
  readonly imageAlt?: string | null;
  readonly linkType?: BannerLinkType;
  readonly linkTargetId?: string | null;
  readonly customUrl?: string | null;
  readonly openNewTab?: boolean;
  readonly startAt?: Date | null;
  readonly endAt?: Date | null;
}

export type UpdateBannerInput = Partial<CreateBannerInput> & {
  readonly displayOrder?: number;
};

export interface BannerFilter {
  readonly status?: BannerStatus;
}
