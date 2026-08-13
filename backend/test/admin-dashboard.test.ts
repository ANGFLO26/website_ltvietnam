import { describe, expect, it, vi } from 'vitest';
import { AdminDashboardServiceImpl } from '../src/services/admin-dashboard/service.js';

const paged = (totalItems: number) => ({
  data: [],
  meta: { page: 1, pageSize: 1, totalItems, totalPages: totalItems > 0 ? totalItems : 1 },
});

describe('A1 admin dashboard', () => {
  it('tra count that va recent inquiry da loai PII', async () => {
    const listAdmin = (n: number) => vi.fn().mockResolvedValue(paged(n));
    const daos = {
      inquiries: {
        dashboardSummary: vi.fn().mockResolvedValue({
          unhandled: 4,
          last30Days: 9,
          emailPending: 2,
          emailFailed: 1,
          recent: [
            {
              id: '00000000-0000-4000-8000-000000000001',
              inquiryType: 'quotation',
              emailStatus: 'email_failed',
              handled: false,
              createdAt: new Date('2026-08-11T01:00:00.000Z'),
            },
          ],
        }),
      },
      products: { listAdmin: listAdmin(12) },
      services: { listAdmin: listAdmin(3) },
      projects: { listAdmin: listAdmin(4) },
      posts: { listAdmin: listAdmin(5) },
      pages: { listAdmin: listAdmin(6) },
    };
    const service = new AdminDashboardServiceImpl(
      daos as never,
      () => new Date('2026-08-11T02:00:00.000Z'),
    );

    const result = await service.get();

    expect(result.content).toEqual({ products: 12, services: 3, projects: 4, posts: 5, pages: 6 });
    expect(result.inquiries).toEqual({
      unhandled: 4,
      last_30_days: 9,
      email_pending: 2,
      email_failed: 1,
    });
    expect(result.recent_inquiries[0]).toMatchObject({
      inquiry_type: 'quotation',
      email_status: 'email_failed',
      handled: false,
    });
    expect(JSON.stringify(result)).not.toMatch(/full_name|email@|phone|message|recipient|secret/);
  });
});
