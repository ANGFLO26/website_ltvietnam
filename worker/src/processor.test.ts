import { describe, expect, it, vi } from 'vitest';
import type { EmailMessage, EmailSender } from './email.js';
import type { ClaimedJob, InquiryMailData, OutboxRepository } from './outbox.js';
import { cleanHeader, OutboxProcessor, sanitizeEmailError } from './processor.js';

const at = new Date('2026-08-09T12:00:00.000Z');
const cfg = {
  WORKER_ID: 'test-worker',
  WORKER_BATCH_SIZE: 10,
  WORKER_PROCESSING_TIMEOUT_MS: 300_000,
  WORKER_MAX_ATTEMPTS: 5,
  SMTP_FROM: 'no-reply@ltvietnam.com.vn',
  ADMIN_SITE_URL: 'https://admin.ltvietnam.com.vn/',
};
const inquiry: InquiryMailData = {
  inquiryType: 'quotation',
  fullName: 'Nguyen Van A',
  companyName: 'Cong ty A',
  phone: '0900000000',
  email: 'a@example.com',
  message: 'Xin bao gia',
  sourceUrl: '/products/may-a',
  locale: 'vi',
};

function job(overrides: Partial<ClaimedJob> = {}): ClaimedJob {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    inquiryId: '22222222-2222-4222-8222-222222222222',
    notificationType: 'inquiry_received',
    recipient: 'sales@ltvietnam.com.vn',
    payload: {},
    attempts: 0,
    ...overrides,
  };
}

function harness(input: ClaimedJob, sendError?: unknown) {
  const sent: EmailMessage[] = [];
  const failed: Array<{ error: string; next: Date | null }> = [];
  const markedSent: ClaimedJob[] = [];
  const repo: OutboxRepository = {
    claim: vi.fn(async () => [input]),
    findInquiry: vi.fn(async () => inquiry),
    markSent: vi.fn(async (value) => {
      markedSent.push(value);
    }),
    markFailed: vi.fn(async (_value, _time, error, next) => {
      failed.push({ error, next });
    }),
    reap: vi.fn(async () => 0),
  };
  const sender: EmailSender = {
    send: vi.fn(async (message) => {
      sent.push(message);
      if (sendError) throw sendError;
    }),
  };
  const processor = new OutboxProcessor(repo, sender, cfg, vi.fn(), () => at);
  return { processor, repo, sent, failed, markedSent };
}

describe('outbox worker F5', () => {
  it('gui inquiry voi Message-ID on dinh theo outbox id', async () => {
    const h = harness(job());
    await h.processor.tick();
    expect(h.sent[0]!.messageId).toBe(
      '<inquiry-outbox-11111111-1111-4111-8111-111111111111@ltvietnam.com.vn>',
    );
    expect(h.sent[0]!.replyTo).toBe('a@example.com');
    expect(h.markedSent).toHaveLength(1);
  });

  it('tao email reset nhung khong dua token vao log', async () => {
    const input = job({
      inquiryId: null,
      notificationType: 'password_reset',
      recipient: 'admin@example.com',
      payload: { token: 'signed-secret-token' },
    });
    const logs: unknown[] = [];
    const h = harness(input);
    const processor = new OutboxProcessor(
      h.repo,
      {
        send: async (message) => {
          h.sent.push(message);
        },
      },
      cfg,
      (event, fields) => logs.push({ event, fields }),
      () => at,
    );
    await processor.tick();
    expect(h.sent[0]!.text).toContain('signed-secret-token');
    expect(h.sent[0]!.text).toContain(
      'https://admin.ltvietnam.com.vn/reset-password?token=signed-secret-token',
    );
    expect(JSON.stringify(logs)).not.toContain('signed-secret-token');
    expect(h.repo.findInquiry).not.toHaveBeenCalled();
  });

  it('loi SMTP hen retry 1 phut va last_error khong chua PII', async () => {
    const h = harness(
      job(),
      Object.assign(new Error('550 a@example.com token=rat-bi-mat'), {
        code: 'EENVELOPE',
        responseCode: 550,
        command: 'RCPT TO',
      }),
    );
    await h.processor.tick();
    expect(h.failed[0]!.next?.toISOString()).toBe('2026-08-09T12:01:00.000Z');
    expect(h.failed[0]!.error).toBe('EMAIL_SEND_FAILED:EENVELOPE:550');
    expect(h.failed[0]!.error).not.toContain('example.com');
  });

  it('het lan thu thi danh failed va khong hen lai', async () => {
    const h = harness(job({ attempts: 4 }), new Error('provider down'));
    await h.processor.tick();
    expect(h.failed[0]!.next).toBeNull();
  });

  it('loai CRLF khoi header va chi giu error code an toan', () => {
    expect(cleanHeader('A\r\nB')).toBe('A B');
    expect(sanitizeEmailError({ code: 'ETIMEDOUT', message: 'user@example.com' })).toBe(
      'EMAIL_SEND_FAILED:ETIMEDOUT',
    );
  });
});
