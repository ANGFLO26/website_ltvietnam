import type { AdminDashboardView } from '@ltv/contracts';

export const ADMIN_DASHBOARD_SERVICE = Symbol('ADMIN_DASHBOARD_SERVICE');

export interface AdminDashboardService {
  get(): Promise<AdminDashboardView>;
}
