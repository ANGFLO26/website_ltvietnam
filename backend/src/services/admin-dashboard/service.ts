import type { AdminDashboardView } from '@ltv/contracts';
import type { DaoScope } from '../../dao/dao-scope.js';
import type { AdminDashboardService } from './interface.js';

export type AdminDashboardDaos = DaoScope<
  'inquiries' | 'products' | 'services' | 'projects' | 'posts' | 'pages'
>;

export class AdminDashboardServiceImpl implements AdminDashboardService {
  constructor(
    private readonly daos: AdminDashboardDaos,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async get(): Promise<AdminDashboardView> {
    const [inquiries, products, services, projects, posts, pages] = await Promise.all([
      this.daos.inquiries.dashboardSummary(6),
      this.daos.products.listAdmin({}, { page: 1, pageSize: 1 }),
      this.daos.services.listAdmin({}, { page: 1, pageSize: 1 }),
      this.daos.projects.listAdmin({}, { page: 1, pageSize: 1 }),
      this.daos.posts.listAdmin({}, { page: 1, pageSize: 1 }),
      this.daos.pages.listAdmin({}, { page: 1, pageSize: 1 }),
    ]);

    return {
      generated_at: this.now().toISOString(),
      content: {
        products: products.meta.totalItems,
        services: services.meta.totalItems,
        projects: projects.meta.totalItems,
        posts: posts.meta.totalItems,
        pages: pages.meta.totalItems,
      },
      inquiries: {
        unhandled: inquiries.unhandled,
        last_30_days: inquiries.last30Days,
        email_pending: inquiries.emailPending,
        email_failed: inquiries.emailFailed,
      },
      recent_inquiries: inquiries.recent.map((row) => ({
        id: row.id,
        inquiry_type: row.inquiryType,
        email_status: row.emailStatus,
        handled: row.handled,
        created_at: row.createdAt.toISOString(),
      })),
    };
  }
}
