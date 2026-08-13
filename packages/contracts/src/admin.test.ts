import { describe, expect, it } from 'vitest';
import {
  adminLoginRequestSchema,
  adminPublishCheckRequestSchema,
  type AdminDashboardView,
} from './admin.view.js';

const id = '11111111-1111-4111-8111-111111111111';

describe('admin publish-check contract', () => {
  it('requires locale for translated content', () => {
    expect(adminPublishCheckRequestSchema.safeParse({ entity: 'post', id }).success).toBe(false);
    expect(
      adminPublishCheckRequestSchema.safeParse({ entity: 'post', id, locale: 'vi' }).success,
    ).toBe(true);
  });

  it('rejects locale for single-language entities', () => {
    expect(adminPublishCheckRequestSchema.safeParse({ entity: 'product', id }).success).toBe(true);
    expect(
      adminPublishCheckRequestSchema.safeParse({ entity: 'product', id, locale: 'en' }).success,
    ).toBe(false);
  });

  it('auth request loai bo field la va chuan hoa email', () => {
    expect(
      adminLoginRequestSchema.parse({ email: '  Admin@Example.com  ', password: 'secret' }),
    ).toEqual({ email: 'Admin@Example.com', password: 'secret' });
    expect(() =>
      adminLoginRequestSchema.parse({ email: 'a@example.com', password: 'x', token: 'leak' }),
    ).toThrow();
  });

  it('dashboard contract khong co PII cua inquiry', () => {
    const dashboard: AdminDashboardView = {
      generated_at: new Date(0).toISOString(),
      content: { products: 1, services: 2, projects: 3, posts: 4, pages: 5 },
      inquiries: { unhandled: 2, last_30_days: 3, email_pending: 1, email_failed: 0 },
      recent_inquiries: [
        {
          id: '00000000-0000-4000-8000-000000000000',
          inquiry_type: 'quotation',
          email_status: 'email_sent',
          handled: false,
          created_at: new Date(0).toISOString(),
        },
      ],
    };
    expect(JSON.stringify(dashboard)).not.toMatch(/full_name|phone|message|company_name/);
  });
});
