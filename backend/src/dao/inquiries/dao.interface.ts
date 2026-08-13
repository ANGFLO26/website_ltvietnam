import type { Page, Paged } from '../helpers.js';
import type {
  ClaimedOutboxJob,
  CreateInquiryInput,
  CreateOutboxJobInput,
  CreatePasswordResetJobInput,
  EmailStatus,
  Inquiry,
  InquiryDashboardSummary,
  InquiryCreateResult,
  InquiryFilter,
  OutboxJob,
} from './object.js';

export interface InquiryDao {
  findById(id: string): Promise<Inquiry | null>;
  findByIdempotencyKey(key: string): Promise<Inquiry | null>;
  list(filter: InquiryFilter, page?: Partial<Page>): Promise<Paged<Inquiry>>;
  dashboardSummary(limit: number): Promise<InquiryDashboardSummary>;

  /**
   * D19 — TAO YEU CAU MOT CACH NGUYEN TU.
   *
   * `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`, roi
   * neu khong co hang tra ve thi doc lai ban ghi cu.
   *
   * Vi sao KHONG "kiem truoc roi ghi": giua luc kiem va luc ghi, mot yeu cau
   * thu hai cung khoa co the chen vao. Hai tien trinh cung thay "chua co",
   * ca hai cung ghi, mot cai do vi trung khoa — va khach nhan loi 500 cho
   * mot thao tac le ra thanh cong. Chi muc UNIQUE la trong tai duy nhat, va
   * cach dung dung la de no phan xu chu khong hoi y kien no truoc.
   *
   * `replayed = true` nghia la khoa da ton tai. Nguoi goi PHAI tra ve cung
   * mot response nhu lan dau — khach bam nut hai lan khong duoc thay loi.
   */
  createIdempotent(input: CreateInquiryInput): Promise<InquiryCreateResult>;

  setEmailStatus(id: string, status: EmailStatus): Promise<void>;
  markHandled(id: string, at: Date, byUserId: string | null): Promise<void>;

  // ── hang doi gui email ──────────────────────────────────────────

  /**
   * Tao job gui email. PHAI goi trong cung transaction voi `createIdempotent`
   * (ADR-003) — commit inquiry ma khong commit job thi lead nam im mai mai.
   *
   * `UNIQUE (inquiry_id, channel, recipient)` chan job trung; ham nay bo qua
   * neu da co, de goi lai khi replay khong bi loi.
   */
  enqueueEmail(input: CreateOutboxJobInput): Promise<OutboxJob | null>;

  /** Tao job reset mat khau. Token CHI nam trong payload outbox, khong vao log. */
  enqueuePasswordReset(input: CreatePasswordResetJobInput): Promise<OutboxJob>;

  findJobsByInquiry(inquiryId: string): Promise<OutboxJob[]>;

  /**
   * LAY JOB — `FOR UPDATE SKIP LOCKED`.
   *
   * Hai worker chay cung luc se lay duoc HAI TAP RIENG BIET, khong chong
   * nhau va khong cho nhau. Day la ly do dung `SKIP LOCKED` chu khong phai
   * `FOR UPDATE` tran: `FOR UPDATE` lam worker thu hai DUNG CHO worker thu
   * nhat, bien mot hang doi song song thanh mot hang doi tuan tu.
   *
   * GIOI HAN CAN NOI RO (ADR-003): day la `at-least-once`, KHONG phai
   * `exactly-once`. SMTP nhan email roi worker chet truoc khi ghi `sent` thi
   * reaper se dua job ve `pending` va mot worker khac gui lai. Message-ID
   * sinh xac dinh tu `outbox.id` de ban nhan hai lan cua cung mot email
   * duoc trinh thu nhan dien.
   */
  claimJobs(workerId: string, batchSize: number, now: Date): Promise<ClaimedOutboxJob[]>;

  markJobSent(jobId: string, at: Date): Promise<void>;

  /**
   * Ghi that bai va hen gio thu lai.
   *
   * `lastError` PHAI da duoc sanitize truoc khi den day (ADR-003): chi ma loi
   * va thong bao ky thuat cua SMTP. Khong noi dung yeu cau, khong mat khau,
   * khong token. Cot nay se bi doc trong log va trong man hinh quan tri.
   */
  markJobFailed(
    jobId: string,
    at: Date,
    lastError: string,
    nextAttemptAt: Date | null,
  ): Promise<void>;

  /**
   * REAPER — dua job bi ket o `processing` ve `pending`.
   *
   * Job ket lai khi worker chet giua chung: no da doi trang thai nhung khong
   * bao gio ghi ket qua. Khong co reaper thi lead do nam im vinh vien va
   * khong ai biet.
   *
   * `olderThan` phai DU DAI hon thoi gian gui email lau nhat, neu khong
   * reaper se cuop job cua worker con dang song va gay gui trung khong can
   * thiet.
   */
  reapStaleJobs(olderThan: Date, now: Date): Promise<number>;

  countJobsByStatus(): Promise<Record<string, number>>;
}
