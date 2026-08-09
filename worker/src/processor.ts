import type { WorkerConfig } from '@ltv/config';
import type { EmailMessage, EmailSender } from './email.js';
import type { ClaimedJob, InquiryMailData, OutboxRepository } from './outbox.js';

const BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 6 * 60 * 60_000] as const;

export interface WorkerLog {
  (event: string, fields?: Readonly<Record<string, unknown>>): void;
}

export class OutboxProcessor {
  constructor(
    private readonly repository: OutboxRepository,
    private readonly sender: EmailSender,
    private readonly cfg: Pick<
      WorkerConfig,
      | 'WORKER_ID'
      | 'WORKER_BATCH_SIZE'
      | 'WORKER_PROCESSING_TIMEOUT_MS'
      | 'WORKER_MAX_ATTEMPTS'
      | 'SMTP_FROM'
      | 'NEXT_PUBLIC_SITE_URL'
    >,
    private readonly log: WorkerLog,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async tick(): Promise<number> {
    const now = this.now();
    const olderThan = new Date(now.getTime() - this.cfg.WORKER_PROCESSING_TIMEOUT_MS);
    const reaped = await this.repository.reap(olderThan, now);
    if (reaped > 0) this.log('outbox_reaped', { count: reaped });

    const jobs = await this.repository.claim(this.cfg.WORKER_ID, this.cfg.WORKER_BATCH_SIZE, now);
    await Promise.all(jobs.map((job) => this.process(job)));
    return jobs.length;
  }

  private async process(job: ClaimedJob): Promise<void> {
    const messageId = `<inquiry-outbox-${job.id}@ltvietnam.com.vn>`;
    try {
      const message = await this.messageFor(job, messageId);
      // NGOAI transaction: claim da commit; chi ghi ket qua sau khi provider tra loi.
      await this.sender.send(message);
      await this.repository.markSent(job, this.now());
      this.log('outbox_sent', { outbox_id: job.id, message_id: messageId });
    } catch (error) {
      const at = this.now();
      const attempt = job.attempts + 1;
      const exhausted = attempt >= this.cfg.WORKER_MAX_ATTEMPTS;
      const delay = BACKOFF_MS[Math.min(job.attempts, BACKOFF_MS.length - 1)]!;
      const next = exhausted ? null : new Date(at.getTime() + delay);
      await this.repository.markFailed(job, at, sanitizeEmailError(error), next);
      this.log(exhausted ? 'outbox_failed' : 'outbox_retry_scheduled', {
        outbox_id: job.id,
        attempt,
        ...(next && { next_attempt_at: next.toISOString() }),
      });
    }
  }

  private async messageFor(job: ClaimedJob, messageId: string): Promise<EmailMessage> {
    if (job.notificationType === 'password_reset') {
      const token = job.payload.token;
      if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
        throw new Error('password_reset_payload_invalid');
      }
      const resetUrl = new URL('/admin/reset-password', this.cfg.NEXT_PUBLIC_SITE_URL);
      resetUrl.searchParams.set('token', token);
      return {
        jobId: job.id,
        messageId,
        to: cleanHeader(job.recipient),
        from: cleanHeader(this.cfg.SMTP_FROM),
        subject: 'Đặt lại mật khẩu quản trị LT Vietnam',
        text: `Mở liên kết sau để đặt lại mật khẩu. Liên kết chỉ dùng một lần:\n\n${resetUrl.toString()}\n`,
      };
    }

    if (!job.inquiryId) throw new Error('inquiry_job_without_inquiry');
    const inquiry = await this.repository.findInquiry(job.inquiryId);
    if (!inquiry) throw new Error('inquiry_not_found');
    return inquiryMessage(job, inquiry, messageId, this.cfg.SMTP_FROM);
  }
}

function inquiryMessage(
  job: ClaimedJob,
  inquiry: InquiryMailData,
  messageId: string,
  from: string,
): EmailMessage {
  const lines = [
    `Loại yêu cầu: ${inquiry.inquiryType}`,
    `Họ tên: ${inquiry.fullName}`,
    `Công ty: ${inquiry.companyName ?? '-'}`,
    `Điện thoại: ${inquiry.phone ?? '-'}`,
    `Email: ${inquiry.email ?? '-'}`,
    `Ngôn ngữ: ${inquiry.locale}`,
    `Nguồn: ${inquiry.sourceUrl ?? '-'}`,
    '',
    inquiry.message,
  ];
  return {
    jobId: job.id,
    messageId,
    to: cleanHeader(job.recipient),
    from: cleanHeader(from),
    ...(inquiry.email && { replyTo: cleanHeader(inquiry.email) }),
    subject: cleanHeader(`[Website] ${inquiry.inquiryType} — ${inquiry.fullName}`),
    text: lines.join('\n'),
  };
}

/** Chan CR/LF injection o moi gia tri di vao SMTP header. */
export function cleanHeader(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 320);
}

/** Chi giu ma loi ky thuat; tuyet doi khong luu message co email/token/noi dung. */
export function sanitizeEmailError(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'EMAIL_SEND_FAILED';
  const row = error as { code?: unknown; responseCode?: unknown; command?: unknown };
  const code = safeCode(row.code);
  const responseCode = typeof row.responseCode === 'number' ? String(row.responseCode) : '';
  const command = safeCode(row.command);
  return ['EMAIL_SEND_FAILED', code, responseCode, command].filter(Boolean).join(':').slice(0, 255);
}

function safeCode(value: unknown): string {
  return typeof value === 'string' && /^[A-Z0-9_-]{1,40}$/i.test(value) ? value : '';
}
