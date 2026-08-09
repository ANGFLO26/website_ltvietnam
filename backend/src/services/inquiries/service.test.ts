import { describe, expect, it, vi } from 'vitest';
import type { Inquiry } from '../../dao/inquiries/object.js';
import type { CaptchaVerifier } from './captcha.js';
import { InquiryServiceImpl } from './service.js';

const row: Inquiry = {
  id: '11111111-1111-4111-8111-111111111111',
  inquiryType: 'quotation',
  fullName: 'Nguyen Van A',
  companyName: null,
  phone: '0900000000',
  email: null,
  message: 'Xin bao gia',
  productId: null,
  serviceId: null,
  sourceUrl: '/contact',
  locale: 'vi',
  preferredContactMethod: 'phone',
  province: null,
  privacyConsentAt: new Date('2026-08-09T10:00:00.000Z'),
  emailStatus: 'email_pending',
  idempotencyKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  handledAt: null,
  handledBy: null,
  createdAt: new Date('2026-08-09T10:00:00.000Z'),
  expiresAt: null,
};
const input = {
  inquiry_type: 'quotation' as const,
  full_name: 'Nguyen Van A',
  phone: '0900000000',
  message: 'Xin bao gia',
  source_url: '/contact',
  preferred_contact_method: 'phone' as const,
  privacy_consent: true as const,
  locale: 'vi' as const,
  captcha_token: 'dev-bypass',
  idempotencyKey: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
};

function harness(existing: Inquiry | null = null) {
  const captcha: CaptchaVerifier = { verify: vi.fn(async () => ({ success: true, score: 0.9 })) };
  const enqueueEmail = vi.fn(async () => null);
  const createIdempotent = vi.fn(async () => ({ inquiry: row, replayed: false }));
  const inquiries = {
    findByIdempotencyKey: vi.fn(async () => existing),
    createIdempotent,
    enqueueEmail,
    findById: vi.fn(async () => row),
    list: vi.fn(async () => ({
      data: [row],
      meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
    })),
    markHandled: vi.fn(async () => undefined),
  };
  const daos = {
    inquiries,
    products: { findById: vi.fn(async () => ({ id: 'p' })) },
    services: { findById: vi.fn(async () => ({ id: 's' })) },
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ inquiries })),
  };
  return {
    service: new InquiryServiceImpl(daos as never, captcha, 'inquiries@ltvietnam.com.vn'),
    captcha,
    daos,
    createIdempotent,
    enqueueEmail,
  };
}

describe('InquiryService F5', () => {
  it('commit inquiry va outbox trong cung transaction', async () => {
    const h = harness();
    const result = await h.service.submit(input);
    expect(result.request_id).toBe(row.id);
    expect(h.daos.transaction).toHaveBeenCalledOnce();
    expect(h.createIdempotent).toHaveBeenCalledOnce();
    expect(h.enqueueEmail).toHaveBeenCalledWith({
      inquiryId: row.id,
      recipient: 'inquiries@ltvietnam.com.vn',
    });
  });

  it('replay tra cung request_id va khong tieu CAPTCHA lan hai', async () => {
    const h = harness(row);
    expect(await h.service.submit(input)).toEqual({
      request_id: row.id,
      message: 'Yêu cầu đã được tiếp nhận.',
    });
    expect(h.captcha.verify).not.toHaveBeenCalled();
    expect(h.daos.transaction).not.toHaveBeenCalled();
  });

  it('CAPTCHA sai thi khong ghi database', async () => {
    const h = harness();
    vi.mocked(h.captcha.verify).mockResolvedValue({ success: false });
    await expect(h.service.submit(input)).rejects.toMatchObject({ code: 'CAPTCHA_INVALID' });
    expect(h.daos.transaction).not.toHaveBeenCalled();
  });

  it('admin detail khong tiet lo khoa idempotency hay du lieu chong spam', async () => {
    const view = await harness().service.findById(row.id);
    expect(view).not.toHaveProperty('idempotency_key');
    expect(view).not.toHaveProperty('ip_address');
    expect(view).not.toHaveProperty('captcha_score');
  });
});
