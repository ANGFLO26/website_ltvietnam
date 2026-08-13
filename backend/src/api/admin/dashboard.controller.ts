import { Controller, Get, Inject } from '@nestjs/common';
import type { AdminDashboardView } from '@ltv/contracts';
import {
  ADMIN_DASHBOARD_SERVICE,
  type AdminDashboardService,
} from '../../services/admin-dashboard/interface.js';

@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(@Inject(ADMIN_DASHBOARD_SERVICE) private readonly dashboard: AdminDashboardService) {}

  @Get()
  get(): Promise<AdminDashboardView> {
    return this.dashboard.get();
  }
}
