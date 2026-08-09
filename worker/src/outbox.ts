import type { createAppPool } from '@ltv/db';

export type WorkerPool = ReturnType<typeof createAppPool>;
export type NotificationType = 'inquiry_received' | 'password_reset';

export interface ClaimedJob {
  readonly id: string;
  readonly inquiryId: string | null;
  readonly notificationType: NotificationType;
  readonly recipient: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly attempts: number;
}

export interface InquiryMailData {
  readonly inquiryType: string;
  readonly fullName: string;
  readonly companyName: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly message: string;
  readonly sourceUrl: string | null;
  readonly locale: string;
}

export interface OutboxRepository {
  claim(workerId: string, batchSize: number, now: Date): Promise<ClaimedJob[]>;
  findInquiry(id: string): Promise<InquiryMailData | null>;
  markSent(job: ClaimedJob, at: Date): Promise<void>;
  markFailed(job: ClaimedJob, at: Date, error: string, nextAttemptAt: Date | null): Promise<void>;
  reap(olderThan: Date, now: Date): Promise<number>;
}

interface JobRow {
  id: string;
  inquiry_id: string | null;
  notification_type: NotificationType;
  recipient: string;
  payload: Record<string, unknown> | null;
  attempts: number;
}

export class PgOutboxRepository implements OutboxRepository {
  constructor(private readonly pool: WorkerPool) {}

  async claim(workerId: string, batchSize: number, now: Date): Promise<ClaimedJob[]> {
    const result = await this.pool.query<JobRow>(
      `
      UPDATE ltv.inquiry_outbox o
      SET status = 'processing', locked_at = $1, locked_by = $2
      FROM (
        SELECT id FROM ltv.inquiry_outbox
        WHERE status = 'pending' AND next_attempt_at <= $1
        ORDER BY next_attempt_at, created_at
        FOR UPDATE SKIP LOCKED
        LIMIT $3
      ) pick
      WHERE o.id = pick.id
      RETURNING o.id, o.inquiry_id, o.notification_type, o.recipient, o.payload, o.attempts
    `,
      [now, workerId, Math.max(1, Math.trunc(batchSize))],
    );
    return result.rows.map((row) => ({
      id: row.id,
      inquiryId: row.inquiry_id,
      notificationType: row.notification_type,
      recipient: row.recipient,
      payload: row.payload ?? {},
      attempts: row.attempts,
    }));
  }

  async findInquiry(id: string): Promise<InquiryMailData | null> {
    const result = await this.pool.query<{
      inquiry_type: string;
      full_name: string;
      company_name: string | null;
      phone: string | null;
      email: string | null;
      message: string;
      source_url: string | null;
      locale: string;
    }>(
      `
      SELECT inquiry_type, full_name, company_name, phone, email, message, source_url, locale
      FROM ltv.inquiries WHERE id = $1
    `,
      [id],
    );
    const row = result.rows[0];
    return row
      ? {
          inquiryType: row.inquiry_type,
          fullName: row.full_name,
          companyName: row.company_name,
          phone: row.phone,
          email: row.email,
          message: row.message,
          sourceUrl: row.source_url,
          locale: row.locale,
        }
      : null;
  }

  async markSent(job: ClaimedJob, at: Date): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
        UPDATE ltv.inquiry_outbox
        SET status = 'sent', sent_at = $2, locked_at = NULL, locked_by = NULL,
            last_error = NULL,
            payload = CASE WHEN notification_type = 'password_reset' THEN '{}'::jsonb ELSE payload END
        WHERE id = $1
      `,
        [job.id, at],
      );
      if (job.inquiryId) {
        await client.query(`UPDATE ltv.inquiries SET email_status = 'email_sent' WHERE id = $1`, [
          job.inquiryId,
        ]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markFailed(
    job: ClaimedJob,
    at: Date,
    error: string,
    nextAttemptAt: Date | null,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
        UPDATE ltv.inquiry_outbox
        SET attempts = attempts + 1, last_attempt_at = $2, last_error = $3,
            locked_at = NULL, locked_by = NULL,
            status = CASE WHEN $4::timestamptz IS NULL THEN 'failed' ELSE 'pending' END,
            next_attempt_at = COALESCE($4::timestamptz, next_attempt_at),
            payload = CASE
              WHEN $4::timestamptz IS NULL AND notification_type = 'password_reset'
              THEN '{}'::jsonb ELSE payload END
        WHERE id = $1
      `,
        [job.id, at, error, nextAttemptAt],
      );
      if (nextAttemptAt === null && job.inquiryId) {
        await client.query(`UPDATE ltv.inquiries SET email_status = 'email_failed' WHERE id = $1`, [
          job.inquiryId,
        ]);
      }
      await client.query('COMMIT');
    } catch (cause) {
      await client.query('ROLLBACK');
      throw cause;
    } finally {
      client.release();
    }
  }

  async reap(olderThan: Date, now: Date): Promise<number> {
    const result = await this.pool.query<{ id: string }>(
      `
      UPDATE ltv.inquiry_outbox
      SET status = 'pending', locked_at = NULL, locked_by = NULL, next_attempt_at = $2
      WHERE status = 'processing' AND locked_at IS NOT NULL AND locked_at < $1
      RETURNING id
    `,
      [olderThan, now],
    );
    return result.rowCount ?? result.rows.length;
  }
}
