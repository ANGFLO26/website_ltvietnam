import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { assertProductionSafe, loadConfig, type AppConfig } from '@ltv/config';
import { createDaoRuntime, type DaoRuntime } from './dao/connection.js';
import { APP_CONFIG, DAO_MANAGER, LOGGER } from './shared/tokens.js';
import { createLogger, type Logger } from './shared/logging/logger.js';
import { HEALTH_SERVICE } from './services/health/interface.js';
import { HealthServiceImpl } from './services/health/service.js';
import { HealthController } from './api/public/health.controller.js';
import { ResolveController } from './api/public/resolve.controller.js';
import { TaxonomyController } from './api/public/taxonomy.controller.js';
import { ProductController } from './api/public/product.controller.js';
import { ContentController } from './api/public/content.controller.js';
import { SiteController } from './api/public/site.controller.js';
import { SeoController } from './api/public/seo.controller.js';
import { SITE_SERVICE } from './services/site/interface.js';
import { SiteServiceImpl } from './services/site/service.js';
import { TtlCache } from './shared/cache.js';
import { CONTENT_SERVICE, type ContentService } from './services/content/interface.js';
import { ContentServiceImpl } from './services/content/service.js';
import { PRODUCT_QUERY_SERVICE, type ProductQueryService } from './services/products/interface.js';
import { ProductQueryServiceImpl } from './services/products/service.js';
import { TAXONOMY_SERVICE, type TaxonomyService } from './services/taxonomy/interface.js';
import { TaxonomyServiceImpl } from './services/taxonomy/service.js';
import { ROUTE_RESOLVER_SERVICE } from './services/redirects/interface.js';
import { RouteResolverImpl } from './services/redirects/service.js';
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
import { RateLimitGuard } from './api/admin/rate-limit.guard.js';
import { RATE_LIMIT_REGISTRY, RateLimitRegistry } from './api/admin/rate-limit.registry.js';
import { HashGate } from './shared/crypto/hash-gate.js';
import { EnvelopeInterceptor } from './shared/http/envelope.interceptor.js';
import type { DaoManager } from './dao/dao-manager.js';
import { SEO_SERVICE } from './services/seo/interface.js';
import { SeoServiceImpl } from './services/seo/service.js';
import { InquiryController } from './api/public/inquiry.controller.js';
import { AdminInquiryController } from './api/admin/inquiry.controller.js';
import { CAPTCHA_VERIFIER, HttpCaptchaVerifier } from './services/inquiries/captcha.js';
import { INQUIRY_SERVICE } from './services/inquiries/interface.js';
import { InquiryServiceImpl } from './services/inquiries/service.js';
import { NOTIFICATION_SERVICE } from './services/notifications/interface.js';
import { NotificationServiceImpl } from './services/notifications/service.js';
import { AdminMediaController } from './api/admin/media.controller.js';
import { MediaUploadInterceptor } from './api/admin/media-upload.interceptor.js';
import { PublicMediaController } from './api/public/media.controller.js';
import { DocumentDownloadController } from './api/public/document-download.controller.js';
import {
  MEDIA_USAGE_SERVICE,
  type MediaUsageService,
} from './services/shared/media-usage.interface.js';
import { MediaUsageServiceImpl } from './services/shared/media-usage.service.js';
import { MEDIA_SERVICE } from './services/media/interface.js';
import { MediaServiceImpl } from './services/media/service.js';
import { MediaPurgeScheduler } from './services/media/purge.scheduler.js';
import { AdminTaxonomyController } from './api/admin/taxonomy.controller.js';
import { ADMIN_TAXONOMY_SERVICE } from './services/admin-taxonomy/interface.js';
import { AdminTaxonomyServiceImpl } from './services/admin-taxonomy/service.js';
import { PUBLISH_SERVICE, type PublishService } from './services/shared/publish.interface.js';
import { PublishServiceImpl } from './services/shared/publish.service.js';
import { SLUG_SERVICE, type SlugService } from './services/shared/slug.interface.js';
import { SlugServiceImpl } from './services/shared/slug.service.js';
import { AdminProductController } from './api/admin/product.controller.js';
import { ADMIN_PRODUCT_SERVICE } from './services/admin-products/interface.js';
import { AdminProductServiceImpl } from './services/admin-products/service.js';
import { AdminSystemController } from './api/admin/system.controller.js';
import { ADMIN_REDIRECT_SERVICE } from './services/admin-redirects/interface.js';
import { AdminRedirectServiceImpl } from './services/admin-redirects/service.js';
import { AdminSiteController } from './api/admin/site.controller.js';
import { ADMIN_SITE_SERVICE } from './services/admin-site/interface.js';
import { AdminSiteServiceImpl } from './services/admin-site/service.js';
import { AdminContentController } from './api/admin/content.controller.js';
import { ADMIN_CONTENT_SERVICE } from './services/admin-content/interface.js';
import { AdminContentServiceImpl } from './services/admin-content/service.js';

const RESET_SIGNER = Symbol('RESET_SIGNER');

/**
 * Cache dung chung cua tang API cong khai.
 *
 * La mot PROVIDER chu khong phai mot bien module: `SiteServiceImpl` va
 * `ProductQueryServiceImpl` phai nhan CUNG mot the hien, va mot bien toan cuc thi
 * khong the thay the trong bai kiem — moi bai kiem se ke thua cache cua bai truoc,
 * va thu tu chay se anh huong ket qua.
 */
const SITE_CACHE = Symbol('SITE_CACHE');

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
  controllers: [
    HealthController,
    ResolveController,
    TaxonomyController,
    ProductController,
    ContentController,
    SiteController,
    SeoController,
    PublicMediaController,
    DocumentDownloadController,
    InquiryController,
    AdminInquiryController,
    AdminMediaController,
    AdminTaxonomyController,
    AdminProductController,
    AdminSystemController,
    AdminSiteController,
    AdminContentController,
    AuthController,
  ],
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
    {
      provide: TAXONOMY_SERVICE,
      useFactory: (daos: DaoManager, cfg: AppConfig) =>
        new TaxonomyServiceImpl(daos, undefined, cfg.NEXT_PUBLIC_SITE_URL),
      inject: [DAO_MANAGER, APP_CONFIG],
    },
    {
      provide: PRODUCT_QUERY_SERVICE,
      useFactory: (daos: DaoManager, cache: TtlCache, cfg: AppConfig) =>
        new ProductQueryServiceImpl(daos, cache, cfg.NEXT_PUBLIC_SITE_URL),
      inject: [DAO_MANAGER, SITE_CACHE, APP_CONFIG],
    },
    {
      provide: CONTENT_SERVICE,
      useFactory: (daos: DaoManager, cfg: AppConfig) =>
        new ContentServiceImpl(daos, cfg.NEXT_PUBLIC_SITE_URL),
      inject: [DAO_MANAGER, APP_CONFIG],
    },
    /**
     * MOT ban cache dung chung cho `/home`, `/navigation/*` va `/products/landing`.
     *
     * Mot ban chu khong phai ba: tran so khoa (`maxKeys`) la de chan mot loi lap
     * trinh lam phinh bo nho, va ba ban cache moi cai mot tran nghia la tran that
     * la ba lan con so viet trong ma. Cac khoa da co tien to (`home:`, `nav:`,
     * `landing`) nen chung khong dam nhau.
     *
     * TTL 60s: bien tap doi `is_featured` roi tai lai trang trong vong mot phut
     * phai thay duoc thay doi. Xem `shared/cache.ts` cho hai gioi han co that cua
     * cach lam nay (mot tien trinh, khong vo hieu hoa duoc).
     */
    { provide: SITE_CACHE, useFactory: (): TtlCache => new TtlCache(60_000) },
    {
      provide: SITE_SERVICE,
      useFactory: (
        daos: DaoManager,
        tx: TaxonomyService,
        ct: ContentService,
        pr: ProductQueryService,
        cache: TtlCache,
      ) => new SiteServiceImpl(daos, tx, ct, pr, cache),
      inject: [DAO_MANAGER, TAXONOMY_SERVICE, CONTENT_SERVICE, PRODUCT_QUERY_SERVICE, SITE_CACHE],
    },
    {
      provide: ROUTE_RESOLVER_SERVICE,
      useFactory: (daos: DaoManager, log: Logger) =>
        // Chuoi va vong lap la dau hieu duong GHI da lam sai, nen chung phai
        // ON AO. `warn` de nguoi van hanh thay ma khong phai doi 500.
        new RouteResolverImpl(daos, (e, f) => log.warn(e, f)),
      inject: [DAO_MANAGER, LOGGER],
    },
    {
      provide: SEO_SERVICE,
      useFactory: (daos: DaoManager, cfg: AppConfig) =>
        new SeoServiceImpl(daos, cfg.NEXT_PUBLIC_SITE_URL),
      inject: [DAO_MANAGER, APP_CONFIG],
    },
    {
      provide: CAPTCHA_VERIFIER,
      useFactory: (cfg: AppConfig) => new HttpCaptchaVerifier(cfg),
      inject: [APP_CONFIG],
    },
    {
      provide: INQUIRY_SERVICE,
      useFactory: (daos: DaoManager, captcha: HttpCaptchaVerifier, cfg: AppConfig) =>
        new InquiryServiceImpl(daos, captcha, cfg.INQUIRY_RECIPIENT),
      inject: [DAO_MANAGER, CAPTCHA_VERIFIER, APP_CONFIG],
    },
    {
      provide: NOTIFICATION_SERVICE,
      useFactory: (daos: DaoManager) => new NotificationServiceImpl(daos),
      inject: [DAO_MANAGER],
    },
    {
      provide: MEDIA_USAGE_SERVICE,
      useFactory: (daos: DaoManager) => new MediaUsageServiceImpl(daos),
      inject: [DAO_MANAGER],
    },
    {
      provide: MEDIA_SERVICE,
      useFactory: (daos: DaoManager, usage: MediaUsageService, cfg: AppConfig, log: Logger) =>
        new MediaServiceImpl(daos, usage, cfg, {
          onAudit: (event, fields) => log.warn(event, fields),
        }),
      inject: [DAO_MANAGER, MEDIA_USAGE_SERVICE, APP_CONFIG, LOGGER],
    },
    MediaUploadInterceptor,
    MediaPurgeScheduler,
    {
      provide: PUBLISH_SERVICE,
      useFactory: (daos: DaoManager) => new PublishServiceImpl(daos),
      inject: [DAO_MANAGER],
    },
    {
      provide: SLUG_SERVICE,
      useFactory: (daos: DaoManager) => new SlugServiceImpl(daos),
      inject: [DAO_MANAGER],
    },
    {
      provide: ADMIN_TAXONOMY_SERVICE,
      useFactory: (daos: DaoManager, slugs: SlugService, publisher: PublishService, log: Logger) =>
        new AdminTaxonomyServiceImpl(daos, slugs, publisher, (event, fields) =>
          log.info(event, fields),
        ),
      inject: [DAO_MANAGER, SLUG_SERVICE, PUBLISH_SERVICE, LOGGER],
    },
    {
      provide: ADMIN_PRODUCT_SERVICE,
      useFactory: (daos: DaoManager, slugs: SlugService, publisher: PublishService, log: Logger) =>
        new AdminProductServiceImpl(daos, slugs, publisher, (event, fields) =>
          log.info(event, fields),
        ),
      inject: [DAO_MANAGER, SLUG_SERVICE, PUBLISH_SERVICE, LOGGER],
    },
    {
      provide: ADMIN_REDIRECT_SERVICE,
      useFactory: (daos: DaoManager, slugs: SlugService) =>
        new AdminRedirectServiceImpl(daos, slugs),
      inject: [DAO_MANAGER, SLUG_SERVICE],
    },
    {
      provide: ADMIN_SITE_SERVICE,
      useFactory: (daos: DaoManager, slugs: SlugService, publisher: PublishService) =>
        new AdminSiteServiceImpl(daos, slugs, publisher),
      inject: [DAO_MANAGER, SLUG_SERVICE, PUBLISH_SERVICE],
    },
    {
      provide: ADMIN_CONTENT_SERVICE,
      useFactory: (daos: DaoManager, slugs: SlugService, publisher: PublishService) =>
        new AdminContentServiceImpl(daos, slugs, publisher),
      inject: [DAO_MANAGER, SLUG_SERVICE, PUBLISH_SERVICE],
    },

    // ── mat ma: cai dat nam o shared/crypto, service chi biet cong ──
    {
      provide: PASSWORD_HASHER,
      useFactory: (cfg: AppConfig): PasswordHasher =>
        new Argon2Hasher(new HashGate(cfg.HASH_MAX_CONCURRENT, cfg.HASH_MAX_QUEUED)),
      inject: [APP_CONFIG],
    },
    {
      provide: TOKEN_SIGNER,
      useFactory: (cfg: AppConfig): TokenSigner => new JwtSessionSigner(cfg.JWT_SECRET),
      inject: [APP_CONFIG],
    },
    {
      provide: RESET_SIGNER,
      useFactory: (cfg: AppConfig): ResetTokenSigner =>
        new JwtResetSigner(cfg.PASSWORD_RESET_SECRET),
      inject: [APP_CONFIG],
    },

    {
      provide: AUTH_SERVICE,
      useFactory: (
        daos: DaoManager,
        hasher: PasswordHasher,
        tokens: TokenSigner,
        reset: ResetTokenSigner,
        cfg: AppConfig,
        log: Logger,
      ) =>
        new AuthServiceImpl(daos, hasher, tokens, reset, {
          sessionTtlSeconds: cfg.JWT_TTL_HOURS * 3600,
          resetTtlSeconds: cfg.PASSWORD_RESET_TTL_MINUTES * 60,
          lockAfterAttempts: cfg.LOGIN_LOCK_AFTER_ATTEMPTS,
          minPasswordLength: cfg.MIN_PASSWORD_LENGTH,
          // Service bao su kien ra bang mot ham; noi day la cho no gap `Logger`.
          onEvent: (event, fields) => log.warn(event, fields),
        }),
      inject: [DAO_MANAGER, PASSWORD_HASHER, TOKEN_SIGNER, RESET_SIGNER, APP_CONFIG, LOGGER],
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
    /**
     * THU TU HAI GUARD nay quan trong.
     *
     * Nest chay guard toan cuc theo dung thu tu khai bao. `RateLimitGuard`
     * phai chay TRUOC `AuthGuard`: neu nguoc lai thi `AuthGuard` da lam viec
     * (doc cookie, kiem the — mot truy van database) cho nhung yeu cau le ra
     * bi chan ngay. Voi endpoint `@Public()` nhu `login` thi con te hon: khong
     * co gi chan truoc ham bam.
     */
    { provide: RATE_LIMIT_REGISTRY, useClass: RateLimitRegistry },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: AuthGuard },

    /**
     * Vo `{ data, meta }` — dang ky TOAN CUC, cung ly do voi guard.
     *
     * Neu de moi controller tu boc thi endpoint thu 19 se quen, va cai gia la
     * mot cho frontend hong rieng le. Voi interceptor toan cuc, viet dung la
     * KHONG lam gi ca — khong co gi de quen.
     */
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
  ],
  exports: [APP_CONFIG, LOGGER, DAO_MANAGER, RATE_LIMIT_REGISTRY],
})
export class AppModule implements OnApplicationShutdown {
  constructor(@Inject(DAO_RUNTIME) private readonly dao: DaoRuntime) {}
  async onApplicationShutdown(): Promise<void> {
    await this.dao.close();
  }
}
