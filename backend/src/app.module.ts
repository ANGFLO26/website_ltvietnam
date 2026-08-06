import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { assertProductionSafe, loadConfig, type AppConfig } from '@ltv/config';
import { createDaoRuntime, type DaoRuntime } from './dao/connection.js';
import { APP_CONFIG, DAO_MANAGER, LOGGER } from './shared/tokens.js';
import { createLogger, type Logger } from './shared/logging/logger.js';
import { HEALTH_SERVICE } from './services/health/interface.js';
import { HealthServiceImpl } from './services/health/service.js';
import { HealthController } from './api/public/health.controller.js';
import { AUTH_SERVICE } from './services/auth/interface.js';
import { AuthServiceImpl } from './services/auth/service.js';
import { PASSWORD_HASHER, TOKEN_SIGNER } from './services/auth/crypto.port.js';
import type { PasswordHasher, ResetTokenSigner, TokenSigner } from './services/auth/crypto.port.js';
import { Argon2Hasher } from './shared/crypto/argon2.hasher.js';
import { JwtResetSigner, JwtSessionSigner } from './shared/crypto/jwt.signer.js';
import { USER_SERVICE } from './services/users/interface.js';
import { UserServiceImpl } from './services/users/service.js';
import { SETTING_SERVICE } from './services/settings/interface.js';
import { SettingServiceImpl } from './services/settings/service.js';
import { AuthController } from './api/admin/auth.controller.js';
import { AuthGuard } from './api/admin/auth.guard.js';
import type { DaoManager } from './dao/dao-manager.js';

const RESET_SIGNER = Symbol('RESET_SIGNER');

const DAO_RUNTIME = Symbol('DAO_RUNTIME');

/**
 * Ba tang: api -> services -> dao.
 *
 * Tai nguyen dung chung (config, logger, pool, DAO manager) doc/tao DUNG MOT LAN
 * o day. Service khong duoc tu goi loadConfig() hay createPool().
 *
 * Thu tu bootstrap (plan 03 muc 1): config -> logging -> pool -> DAO -> service.
 * `settings` la DAO doc tu DB luc chay, KHONG phai bootstrap config —
 * khong tao canh Config -> Settings -> DB.
 */
@Global()
@Module({
  controllers: [HealthController, AuthController],
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => {
        const cfg = loadConfig();
        // Dung tien trinh neu cau hinh khong an toan cho production.
        // Nem loi chu khong ghi canh bao: mot dong canh bao luc khoi dong
        // se bi cuon qua trong ba giay va khong ai doc lai.
        assertProductionSafe(cfg);
        return cfg;
      },
    },
    {
      provide: LOGGER,
      useFactory: (cfg: AppConfig): Logger => createLogger(cfg.LOG_LEVEL, { app: 'backend' }),
      inject: [APP_CONFIG],
    },
    {
      provide: DAO_RUNTIME,
      useFactory: (cfg: AppConfig): Promise<DaoRuntime> => createDaoRuntime(cfg),
      inject: [APP_CONFIG],
    },
    { provide: DAO_MANAGER, useFactory: (rt: DaoRuntime) => rt.manager, inject: [DAO_RUNTIME] },
    { provide: HEALTH_SERVICE, useClass: HealthServiceImpl },

    // ── mat ma: cai dat nam o shared/crypto, service chi biet cong ──
    { provide: PASSWORD_HASHER, useClass: Argon2Hasher },
    {
      provide: TOKEN_SIGNER,
      useFactory: (cfg: AppConfig): TokenSigner => new JwtSessionSigner(cfg.JWT_SECRET),
      inject: [APP_CONFIG],
    },
    {
      provide: RESET_SIGNER,
      useFactory: (cfg: AppConfig): ResetTokenSigner => new JwtResetSigner(cfg.PASSWORD_RESET_SECRET),
      inject: [APP_CONFIG],
    },

    {
      provide: AUTH_SERVICE,
      useFactory: (
        daos: DaoManager, hasher: PasswordHasher,
        tokens: TokenSigner, reset: ResetTokenSigner, cfg: AppConfig,
      ) =>
        new AuthServiceImpl(daos, hasher, tokens, reset, {
          sessionTtlSeconds: cfg.JWT_TTL_HOURS * 3600,
          resetTtlSeconds: cfg.PASSWORD_RESET_TTL_MINUTES * 60,
          lockAfterAttempts: cfg.LOGIN_LOCK_AFTER_ATTEMPTS,
          minPasswordLength: cfg.MIN_PASSWORD_LENGTH,
        }),
      inject: [DAO_MANAGER, PASSWORD_HASHER, TOKEN_SIGNER, RESET_SIGNER, APP_CONFIG],
    },
    {
      provide: USER_SERVICE,
      useFactory: (daos: DaoManager, hasher: PasswordHasher, cfg: AppConfig) =>
        new UserServiceImpl(daos, hasher, cfg.MIN_PASSWORD_LENGTH),
      inject: [DAO_MANAGER, PASSWORD_HASHER, APP_CONFIG],
    },
    {
      provide: SETTING_SERVICE,
      useFactory: (daos: DaoManager) => new SettingServiceImpl(daos),
      inject: [DAO_MANAGER],
    },

    /**
     * Guard dang ky TOAN CUC — mac dinh MOI endpoint deu can dang nhap.
     *
     * Dang ky tung controller thi mot controller quan tri moi ma quen gan se
     * mo cong ma khong ai thay. Dang ky toan cuc thi huong sai la huong on ao:
     * endpoint cong khai quen `@Public()` chi tra 401, va nguoi ta sua ngay.
     */
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [APP_CONFIG, LOGGER, DAO_MANAGER],
})
export class AppModule implements OnApplicationShutdown {
  constructor(@Inject(DAO_RUNTIME) private readonly dao: DaoRuntime) {}
  async onApplicationShutdown(): Promise<void> {
    await this.dao.close();
  }
}
