import { sql } from 'kysely';
import { BaseDao } from '../base.dao.js';
import { normalizePage, offsetOf, toPaged, type Page, type Paged } from '../helpers.js';
import type { InquiryDao } from './dao.interface.js';
import type {
  ClaimedOutboxJob,
  CreateInquiryInput,
  CreateOutboxJobInput,
  CreatePasswordResetJobInput,
  EmailStatus,
  Inquiry,
  InquiryCreateResult,
  InquiryDashboardSummary,
  InquiryFilter,
  OutboxJob,
} from './object.js';
import { toInquiry, toOutboxJob } from './mapper.js';

export class KyselyInquiryDao extends BaseDao implements InquiryDao {
  async findById(id: string): Promise<Inquiry | null> {
    const row = await this.db
      .selectFrom('inquiries')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? toInquiry(row) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Inquiry | null> {
    const row = await this.db
      .selectFrom('inquiries')
      .selectAll()
      .where('idempotency_key', '=', key)
      .executeTakeFirst();
    return row ? toInquiry(row) : null;
  }

  async list(filter: InquiryFilter, page?: Partial<Page>): Promise<Paged<Inquiry>> {
    const p = normalizePage(page);
    let q = this.db.selectFrom('inquiries').selectAll();
    let cq = this.db.selectFrom('inquiries').select(({ fn }) => fn.countAll<string>().as('n'));
    if (filter.inquiryType) {
      q = q.where('inquiry_type', '=', filter.inquiryType);
      cq = cq.where('inquiry_type', '=', filter.inquiryType);
    }
    if (filter.emailStatus) {
      q = q.where('email_status', '=', filter.emailStatus);
      cq = cq.where('email_status', '=', filter.emailStatus);
    }
    if (filter.productId) {
      q = q.where('product_id', '=', filter.productId);
      cq = cq.where('product_id', '=', filter.productId);
    }
    if (filter.handled !== undefined) {
      q = filter.handled
        ? q.where('handled_at', 'is not', null)
        : q.where('handled_at', 'is', null);
      cq = filter.handled
        ? cq.where('handled_at', 'is not', null)
        : cq.where('handled_at', 'is', null);
    }
    const rows = await q
      // Hộp thư vận hành ưu tiên việc chưa xử lý; trong cùng nhóm, lỗi gửi
      // email phải nổi lên trước để quản trị viên không bỏ sót yêu cầu.
      .orderBy(sql<boolean>`handled_at IS NULL`, 'desc')
      .orderBy(sql<boolean>`email_status = 'email_failed'`, 'desc')
      .orderBy('created_at', 'desc')
      .orderBy('id')
      .limit(p.pageSize)
      .offset(offsetOf(p))
      .execute();
    const total = Number((await cq.executeTakeFirstOrThrow()).n);
    return toPaged(rows.map(toInquiry), total, p);
  }

  async dashboardSummary(limit: number): Promise<InquiryDashboardSummary> {
    const take = Math.min(20, Math.max(1, Math.trunc(limit)));
    const [summary, recent] = await Promise.all([
      sql<{
        unhandled: number | string;
        last_30_days: number | string;
        email_pending: number | string;
        email_failed: number | string;
      }>`
        SELECT
          count(*) FILTER (WHERE handled_at IS NULL)::int AS unhandled,
          count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS last_30_days,
          count(*) FILTER (WHERE email_status = 'email_pending')::int AS email_pending,
          count(*) FILTER (WHERE email_status = 'email_failed')::int AS email_failed
        FROM ltv.inquiries
      `.execute(this.db),
      sql<{
        id: string;
        inquiry_type: InquiryDashboardSummary['recent'][number]['inquiryType'];
        email_status: EmailStatus;
        handled: boolean;
        created_at: Date;
      }>`
        SELECT id, inquiry_type, email_status, handled_at IS NOT NULL AS handled, created_at
        FROM ltv.inquiries
        ORDER BY (handled_at IS NULL) DESC, created_at DESC, id ASC
        LIMIT ${take}
      `.execute(this.db),
    ]);
    const counts = summary.rows[0];
    return {
      unhandled: Number(counts?.unhandled ?? 0),
      last30Days: Number(counts?.last_30_days ?? 0),
      emailPending: Number(counts?.email_pending ?? 0),
      emailFailed: Number(counts?.email_failed ?? 0),
      recent: recent.rows.map((row) => ({
        id: row.id,
        inquiryType: row.inquiry_type,
        emailStatus: row.email_status,
        handled: row.handled,
        createdAt: row.created_at,
      })),
    };
  }

  /**
   * D19. Mot cau lenh quyet dinh, khong co khoang trong giua kiem va ghi.
   */
  async createIdempotent(input: CreateInquiryInput): Promise<InquiryCreateResult> {
    const inserted = await this.db
      .insertInto('inquiries')
      .values({
        inquiry_type: input.inquiryType,
        full_name: input.fullName,
        company_name: input.companyName ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        message: input.message,
        product_id: input.productId ?? null,
        service_id: input.serviceId ?? null,
        source_url: input.sourceUrl ?? null,
        ...(input.locale !== undefined && { locale: input.locale }),
        preferred_contact_method: input.preferredContactMethod ?? null,
        province: input.province ?? null,
        privacy_consent_at: input.privacyConsentAt,
        idempotency_key: input.idempotencyKey,
        request_fingerprint: input.requestFingerprint ?? null,
        request_fingerprint_version: input.requestFingerprintVersion ?? null,
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
        // NUMERIC(3,2) — kieu ghi la chuoi.
        captcha_score:
          input.captchaScore === undefined || input.captchaScore === null
            ? null
            : String(input.captchaScore),
      })
      // Khong `doUpdateSet`: yeu cau da gui roi thi KHONG duoc sua. Lan gui
      // thu hai cung khoa la mot lan bam nut lap, khong phai mot ban sua.
      .onConflict((oc) => oc.column('idempotency_key').doNothing())
      .returningAll()
      .executeTakeFirst();

    if (inserted) return { inquiry: toInquiry(inserted), replayed: false };

    // `DO NOTHING` khong tra ve hang khi trung — doc lai ban ghi da co.
    const existing = await this.db
      .selectFrom('inquiries')
      .selectAll()
      .where('idempotency_key', '=', input.idempotencyKey)
      .executeTakeFirst();
    if (!existing) {
      // Chi xay ra neu hang bi xoa giua hai cau. Nem loi ro rang thay vi
      // tra ve mot ket qua bia dat.
      throw new Error(
        `Xung dot khoa idempotency ${input.idempotencyKey} nhung khong doc lai duoc ban ghi`,
      );
    }
    return { inquiry: toInquiry(existing), replayed: true };
  }

  async setEmailStatus(id: string, status: EmailStatus): Promise<void> {
    await this.db
      .updateTable('inquiries')
      .set({ email_status: status })
      .where('id', '=', id)
      .execute();
  }

  async markHandled(id: string, at: Date, byUserId: string | null): Promise<void> {
    await this.db
      .updateTable('inquiries')
      .set({ handled_at: at, handled_by: byUserId })
      .where('id', '=', id)
      // Nguoi xu ly dau tien la lich su; bam lai khong duoc chiem cong.
      .where('handled_at', 'is', null)
      .execute();
  }

  // ══════════════════ hang doi gui email ══════════════════

  async enqueueEmail(input: CreateOutboxJobInput): Promise<OutboxJob | null> {
    const row = await this.db
      .insertInto('inquiry_outbox')
      .values({
        inquiry_id: input.inquiryId,
        notification_type: 'inquiry_received',
        payload: {},
        recipient: input.recipient,
        ...(input.channel !== undefined && { channel: input.channel }),
      })
      .onConflict((oc) => oc.columns(['inquiry_id', 'channel', 'recipient']).doNothing())
      .returningAll()
      .executeTakeFirst();
    return row ? toOutboxJob(row) : null;
  }

  async enqueuePasswordReset(input: CreatePasswordResetJobInput): Promise<OutboxJob> {
    const row = await this.db
      .insertInto('inquiry_outbox')
      .values({
        inquiry_id: null,
        notification_type: 'password_reset',
        recipient: input.recipient,
        payload: { token: input.token },
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return toOutboxJob(row);
  }

  async findJobsByInquiry(inquiryId: string): Promise<OutboxJob[]> {
    const rows = await this.db
      .selectFrom('inquiry_outbox')
      .selectAll()
      .where('inquiry_id', '=', inquiryId)
      .orderBy('created_at')
      .execute();
    return rows.map(toOutboxJob);
  }

  /**
   * MOT cau lenh: chon va giu cung luc.
   *
   * Viet thanh hai buoc (SELECT ... FOR UPDATE SKIP LOCKED roi UPDATE) cung
   * dung, nhung phai nam trong transaction moi giu duoc khoa. Gop vao mot
   * `UPDATE ... FROM (SELECT ... FOR UPDATE SKIP LOCKED)` thi dung DU CO
   * transaction hay khong — mot cau lenh don la mot transaction ngam.
   *
   * Nho vay worker khong the vo tinh lay job ngoai transaction va de hai
   * worker giu cung mot job.
   */
  async claimJobs(workerId: string, batchSize: number, now: Date): Promise<ClaimedOutboxJob[]> {
    const limit = Math.max(1, Math.trunc(batchSize));
    const r = await sql<Record<string, unknown>>`
      UPDATE ltv.inquiry_outbox o
      SET status = 'processing', locked_at = ${now}, locked_by = ${workerId}
      FROM (
        SELECT id FROM ltv.inquiry_outbox
        WHERE status = 'pending' AND next_attempt_at <= ${now}
        ORDER BY next_attempt_at, created_at
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      ) AS pick
      WHERE o.id = pick.id
      RETURNING o.*
    `.execute(this.db);
    // Bon cot `status`, `locked_at`, `locked_by` da duoc chinh cau lenh nay
    // dat, nen thu hep kieu o day la ket luan chu khong phai loi hua suong.
    return r.rows.map((row) => toOutboxJob(row as never) as ClaimedOutboxJob);
  }

  async markJobSent(jobId: string, at: Date): Promise<void> {
    await sql`
      UPDATE ltv.inquiry_outbox
      SET status = 'sent', sent_at = ${at}, locked_at = NULL, locked_by = NULL,
          last_error = NULL,
          payload = CASE WHEN notification_type = 'password_reset' THEN '{}'::jsonb ELSE payload END
      WHERE id = ${jobId}
    `.execute(this.db);
  }

  /**
   * `nextAttemptAt = null` nghia la HET luot thu — job chuyen `failed`.
   *
   * Quyet dinh "con thu duoc nua khong" thuoc tang service (no biet cau hinh
   * so lan toi da va bang backoff). DAO chi ghi lai ket qua cua quyet dinh do.
   */
  async markJobFailed(
    jobId: string,
    at: Date,
    lastError: string,
    nextAttemptAt: Date | null,
  ): Promise<void> {
    await sql`
      UPDATE ltv.inquiry_outbox
      SET attempts        = attempts + 1,
          last_attempt_at = ${at},
          last_error      = ${lastError},
          locked_at       = NULL,
          locked_by       = NULL,
          status          = ${nextAttemptAt === null ? 'failed' : 'pending'},
          next_attempt_at = COALESCE(${nextAttemptAt}, next_attempt_at),
          payload         = CASE
            WHEN ${nextAttemptAt}::timestamptz IS NULL AND notification_type = 'password_reset'
            THEN '{}'::jsonb ELSE payload END
      WHERE id = ${jobId}
    `.execute(this.db);
  }

  async reapStaleJobs(olderThan: Date, now: Date): Promise<number> {
    const r = await sql<{ id: string }>`
      UPDATE ltv.inquiry_outbox
      SET status = 'pending', locked_at = NULL, locked_by = NULL, next_attempt_at = ${now}
      WHERE status = 'processing' AND locked_at IS NOT NULL AND locked_at < ${olderThan}
      RETURNING id
    `.execute(this.db);
    return r.rows.length;
  }

  async countJobsByStatus(): Promise<Record<string, number>> {
    const r = await sql<{ status: string; n: string }>`
      SELECT status, count(*) AS n FROM ltv.inquiry_outbox GROUP BY status
    `.execute(this.db);
    const out: Record<string, number> = {};
    for (const row of r.rows) out[row.status] = Number(row.n);
    return out;
  }
}
