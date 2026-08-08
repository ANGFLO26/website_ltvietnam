import {
  Inject,
  Injectable,
  SetMetadata,
  type CanActivate,
  type CustomDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppConfig } from '@ltv/config';
import type { Request } from 'express';
import { APP_CONFIG, LOGGER } from '../../shared/tokens.js';
import type { Logger } from '../../shared/logging/logger.js';
import { DomainError } from '../../shared/errors.js';
import { RATE_LIMIT_REGISTRY, type RateLimitRegistry } from './rate-limit.registry.js';

export interface RateLimitSpec {
  /** Số lần cho phép trong cửa sổ. */
  readonly limit: number;
  readonly windowMs: number;
  /**
   * Chặn theo IP, theo một trường trong thân yêu cầu, hoặc CẢ HAI.
   *
   * Cả hai là quan trọng: chỉ theo IP thì kẻ có nhiều IP (botnet, proxy quay
   * vòng) đi qua dễ dàng; chỉ theo email thì một kẻ đổi email mỗi lần cũng đi
   * qua. Hai chiều bù cho nhau, và chiều nào chạm trần trước thì chặn.
   */
  readonly byIp?: boolean;
  readonly byBodyField?: string;
  /**
   * Hạn mức RIÊNG cho chiều theo trường thân yêu cầu.
   *
   * Hai chiều cần hai con số: chặn dò mật khẩu một tài khoản cần chặt (theo
   * email), còn chặn dội tài nguyên phải rộng hơn (theo IP) để một văn phòng
   * sau NAT không khoá lẫn nhau. Bỏ trống thì dùng chung `limit`.
   */
  readonly bodyFieldLimit?: number;
}

const RATE_LIMIT = 'api:rate-limit';

export const RateLimit = (spec: RateLimitSpec): CustomDecorator =>
  SetMetadata(RATE_LIMIT, spec);

/**
 * GIỚI HẠN TỐC ĐỘ — chạy TRƯỚC khi chạm tới hàm băm.
 *
 * Đây là lớp một trong hai lớp chặn việc dội endpoint đăng nhập. Lớp hai là
 * `HashGate` bên trong `Argon2Hasher`. Cần cả hai vì chúng chặn hai thứ khác
 * nhau: lớp này chặn một nguồn gửi nhiều; `HashGate` chặn tổng tài nguyên bất
 * kể đến từ đâu.
 *
 * Vì sao là guard chứ không phải middleware: guard đọc được metadata của route,
 * nên hạn mức khai báo ngay cạnh endpoint (`@RateLimit({...})`) thay vì nằm
 * trong một bảng cấu hình xa mã nguồn.
 */
/** Request da qua guard mang theo khoa da dung, de controller xoa khi thanh cong. */
export interface RateLimitedRequest extends Request {
  rateLimitRoute?: string;
  rateLimitKeys?: string[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly cfg: AppConfig,
    @Inject(LOGGER) private readonly log: Logger,
    @Inject(RATE_LIMIT_REGISTRY) private readonly registry: RateLimitRegistry,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const spec = this.reflector.get<RateLimitSpec | undefined>(RATE_LIMIT, ctx.getHandler());
    if (!spec) return true;

    const req = ctx.switchToHttp().getRequest<RateLimitedRequest>();
    const routeKey = `${req.method} ${req.route?.path ?? req.path}`;

    // Hai chieu -> hai bo dem rieng, vi han muc khac nhau.
    const keys = this.keysOf(spec, req, routeKey);
    req.rateLimitRoute = routeKey;
    req.rateLimitKeys = keys;

    for (const key of keys) {
      const theoTruong = spec.byBodyField !== undefined && key.includes(`|${spec.byBodyField}:`);
      const han = theoTruong ? (spec.bodyFieldLimit ?? spec.limit) : spec.limit;
      const limiter = this.registry.forRoute(`${routeKey}#${han}`, han, spec.windowMs);
      const r = limiter.check(key);
      if (!r.allowed) {
        /**
         * Log CÓ khoá đã băm, KHÔNG có giá trị gốc.
         *
         * Khoá chứa IP và email — hai thứ là dữ liệu cá nhân. Ghi thẳng vào
         * log biến nhật ký vận hành thành một tập email có thật, đúng thứ mà
         * `login` cố gắng không tiết lộ ở tầng phản hồi.
         */
        this.log.warn('rate_limit_hit', {
          route: routeKey,
          retry_after_seconds: r.retryAfterSeconds,
        });
        throw new DomainError(
          'RATE_LIMITED',
          `Quá nhiều yêu cầu. Thử lại sau ${r.retryAfterSeconds} giây.`,
          'RATE_LIMITED',
          { retry_after_seconds: r.retryAfterSeconds },
        );
      }
    }
    return true;
  }

  private keysOf(spec: RateLimitSpec, req: Request, routeKey: string): string[] {
    const keys: string[] = [];

    if (spec.byIp !== false) {
      /**
       * `req.ip` chỉ đáng tin khi `trust proxy` được cấu hình ĐÚNG.
       *
       * Đứng sau proxy mà không bật `trust proxy` thì mọi yêu cầu mang IP của
       * proxy — cả hệ thống dùng CHUNG một hạn mức, và một kẻ dội làm mọi
       * người khác bị chặn. Bật `trust proxy` mà KHÔNG đứng sau proxy thì tệ
       * hơn: kẻ tấn công tự đặt `X-Forwarded-For` và có hạn mức vô hạn.
       *
       * `TRUST_PROXY` trong cấu hình quyết định, và `main.ts` áp nó vào Express.
       * Trên máy cá nhân không có proxy nên mặc định là `false`.
       */
      keys.push(`${routeKey}|ip:${req.ip ?? 'khong-ro'}`);
    }

    if (spec.byBodyField) {
      const body = req.body as Record<string, unknown> | undefined;
      const raw = body?.[spec.byBodyField];
      if (typeof raw === 'string' && raw.trim() !== '') {
        keys.push(`${routeKey}|${spec.byBodyField}:${raw.trim().toLowerCase()}`);
      }
    }
    return keys;
  }
}
