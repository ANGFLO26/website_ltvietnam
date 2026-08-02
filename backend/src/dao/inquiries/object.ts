/**
 * YEU CAU LIEN HE / BAO GIA — day la LEAD, la ly do website ton tai.
 *
 * Nguyen tac bao trum ca file nay: THA GUI TRUNG EMAIL CON HON MAT MOT LEAD.
 * Moi danh doi ben duoi deu nghieng theo huong do.
 */
export type InquiryType =
  | 'quotation' | 'product_consultation' | 'technical_support'
  | 'maintenance_repair' | 'partnership' | 'general_contact';

export type EmailStatus = 'email_pending' | 'email_sent' | 'email_failed';

export type PreferredContact = 'phone' | 'email' | 'zalo' | 'any';

export interface Inquiry {
  readonly id: string;
  readonly inquiryType: InquiryType;
  readonly fullName: string;
  readonly companyName: string | null;
  /**
   * `phone` va `email` deu nullable, nhung DB co
   * `CHECK (phone IS NOT NULL OR email IS NOT NULL)`.
   *
   * Ep ca hai bat buoc se lam mat lead: nhieu khach cong nghiep chi de lai so
   * dien thoai. Ep ca hai nullable ma khong co CHECK thi luu duoc mot yeu cau
   * KHONG LIEN LAC LAI DUOC — te hon la khong nhan.
   */
  readonly phone: string | null;
  readonly email: string | null;
  readonly message: string;
  readonly productId: string | null;
  readonly serviceId: string | null;
  readonly sourceUrl: string | null;
  readonly locale: 'vi' | 'en';
  readonly preferredContactMethod: PreferredContact | null;
  readonly province: string | null;
  readonly privacyConsentAt: Date;
  readonly emailStatus: EmailStatus;
  readonly idempotencyKey: string;
  readonly handledAt: Date | null;
  readonly handledBy: string | null;
  readonly createdAt: Date;
  /** Han luu tru. `null` = khong tu xoa (ADR-003: doanh nghiep chua chot). */
  readonly expiresAt: Date | null;
}

export interface CreateInquiryInput {
  readonly inquiryType: InquiryType;
  readonly fullName: string;
  readonly message: string;
  readonly idempotencyKey: string;
  readonly privacyConsentAt: Date;
  readonly companyName?: string | null;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly productId?: string | null;
  readonly serviceId?: string | null;
  readonly sourceUrl?: string | null;
  readonly locale?: 'vi' | 'en';
  readonly preferredContactMethod?: PreferredContact | null;
  readonly province?: string | null;
  readonly requestFingerprint?: string | null;
  readonly requestFingerprintVersion?: string | null;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
  readonly captchaScore?: number | null;
}

/**
 * Ket qua cua mot lan gui yeu cau.
 *
 * `replayed` phan biet "vua tao moi" voi "da co tu truoc, tra lai ket qua cu"
 * (D19). Tang API can biet de ghi log dung, nhung PHAI tra ve cung mot
 * response cho ca hai — khach bam nut hai lan khong duoc thay loi.
 */
export interface InquiryCreateResult {
  readonly inquiry: Inquiry;
  readonly replayed: boolean;
}

export interface InquiryFilter {
  readonly inquiryType?: InquiryType;
  readonly emailStatus?: EmailStatus;
  readonly handled?: boolean;
  readonly productId?: string;
}

// ═══════════════════ HANG DOI GUI EMAIL (outbox) ═══════════════════
/**
 * `inquiry_outbox` khong co thu muc rieng: mot job khong bao gio ton tai
 * ngoai inquiry cua no, va hai bang PHAI duoc ghi trong cung mot transaction
 * (ADR-003). Tach ra thanh DAO rieng chi tao co hoi cho ai do ghi mot nua.
 *
 * VONG DOI:
 *   pending  ──lay job──>  processing  ──gui OK──>  sent
 *      ^                        │
 *      │                        └──loi con retry──> pending (+ backoff)
 *      │                        └──het retry──────> failed
 *      └── reaper dua ve khi khoa qua han
 */
export type OutboxStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface OutboxJob {
  readonly id: string;
  readonly inquiryId: string;
  readonly channel: string;
  readonly recipient: string;
  readonly status: OutboxStatus;
  readonly attempts: number;
  readonly lastAttemptAt: Date | null;
  readonly nextAttemptAt: Date;
  readonly lockedAt: Date | null;
  readonly lockedBy: string | null;
  readonly lastError: string | null;
  readonly sentAt: Date | null;
}

/**
 * Job DA DUOC MOT WORKER GIU.
 *
 * Chi `claimJobs` tra ve kieu nay. Ep thanh kieu rieng de mot ham gui email
 * khong the nhan nham mot job chua duoc giu — gui job chua giu la con duong
 * chac chan nhat den viec hai worker cung gui mot email.
 */
export interface ClaimedOutboxJob extends OutboxJob {
  readonly status: 'processing';
  readonly lockedAt: Date;
  readonly lockedBy: string;
}

export interface CreateOutboxJobInput {
  readonly inquiryId: string;
  readonly recipient: string;
  readonly channel?: string;
}
