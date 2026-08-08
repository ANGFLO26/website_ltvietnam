import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { DomainError } from '../../shared/errors.js';
import { Public } from '../admin/auth.guard.js';
import { ROUTE_RESOLVER_SERVICE, type RouteResolver } from '../../services/redirects/interface.js';
import type { ResolveResponse } from '@ltv/contracts';

/**
 * GIAI DUONG DAN cho middleware cua Next.js.
 *
 * Duong nay do middleware phia may chu goi — KHONG phai trinh duyet. No chay
 * cho MOI yeu cau khong khop tep tinh, nen no la DUONG NONG: mot truy van co
 * chi muc, khong hon.
 *
 * `@Public()` la BAT BUOC, khong phai lua chon: middleware chay truoc khi co
 * bat ky phien nao. Dieu do co nghia ai cung goi duoc endpoint nay, va cai lo
 * ra la "duong nao dang duoc chuyen huong" — gia tri thap. Nhung TREN THAT no
 * nen bi chan o tang mang (chi frontend goi duoc), va do la viec cua cau hinh
 * trien khai chu khong phai cua ma nguon. Ghi lai o day thay vi de nguoi doc
 * tu suy ra.
 *
 * KHONG gan `@RateLimit`: endpoint nay duoc goi mot lan cho MOI trang, nen han
 * muc theo IP se chan chinh frontend truoc khi chan bat ky ai khac.
 */
const truyVan = z.object({
  path: z.string().min(1, 'Thieu tham so path').max(2048),
});

@Controller('resolve')
export class ResolveController {
  constructor(@Inject(ROUTE_RESOLVER_SERVICE) private readonly resolver: RouteResolver) {}

  @Public()
  @Get()
  async resolve(@Query() query: unknown): Promise<ResolveResponse> {
    const r = truyVan.safeParse(query);
    if (!r.success) {
      throw new DomainError('VALIDATION_FAILED', 'Tham so khong hop le', 'VALIDATION_FAILED', {
        fields: r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const ra = await this.resolver.resolve(r.data.path);
    return ra.kind === 'redirect'
      ? { kind: 'redirect', status: ra.status, target: ra.target }
      : { kind: 'content' };
  }
}
