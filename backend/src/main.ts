import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadConfig } from '@ltv/config';
import { AppModule } from './app.module.js';
import { requestIdMiddleware } from './shared/logging/request-id.middleware.js';
import { AppExceptionFilter } from './shared/http/exception.filter.js';
import { createSecurityHeaders } from './shared/http/security.middleware.js';
import { json } from 'express';
import { createLogger } from './shared/logging/logger.js';

async function bootstrap(): Promise<void> {
  // Doc config o day CHI de lay cong va CORS truoc khi Nest khoi tao.
  // Pool va Kysely do InfrastructureModule so huu — khong tao o day.
  const cfg = loadConfig();
  const log = createLogger(cfg.LOG_LEVEL, { app: 'backend' });

  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();

  /**
   * Tat `X-Powered-By: Express`.
   *
   * Header nay noi cho moi nguoi biet dang chay framework gi. No khong phai lo
   * hong, nhung no la thong tin mien phi cho nguoi do tim ban co lo hong da
   * biet — va no khong doi lay bat ky loi ich nao.
   */
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.use(requestIdMiddleware);
  app.use(createSecurityHeaders(cfg));

  /**
   * TRAN kich thuoc than yeu cau — dat TUONG MINH.
   *
   * `express.json()` mac dinh 100 KB, nhung mot mac dinh khong ai chon la mot
   * con so khong ai dam doi. Noi dung bien tap la JSONB nhieu block (`doc/11`)
   * nen 100 KB co the that su khong du.
   *
   * `verify` KHONG duoc dung o day: doc/06 yeu cau chan yeu cau qua lon TRUOC
   * khi no di sau vao he thong, va `limit` cua body-parser lam dung viec do —
   * no dung doc socket va nem `entity.too.large` (413) ngay, khong cho doi buffer
   * day roi moi kiem.
   */
  app.use(json({ limit: cfg.BODY_LIMIT_BYTES }));
  /**
   * KHONG bat `urlencoded`.
   *
   * API nay chi nhan JSON. Bat mot bo phan tich khong ai dung la mo them mot
   * be mat tan cong doi lay so khong. Form upload cua F7 se dung `multipart`
   * voi tran rieng (`MEDIA_MAX_UPLOAD_BYTES`), khong phai duong nay.
   */

  app.useGlobalFilters(new AppExceptionFilter());
  app.setGlobalPrefix(cfg.API_BASE_PATH, {
    exclude: [
      'health/live',
      'health/ready',
      'sitemap.xml',
      'sitemap-:locale.xml',
      'robots.txt',
      'media/*',
    ],
  });
  app.enableCors({ origin: cfg.CORS_ORIGINS, credentials: true });

  /**
   * `trust proxy` quyet dinh `req.ip` co dang tin khong, va gioi han toc do
   * dua vao `req.ip`.
   *
   * Bat khi KHONG dung sau proxy la nguy hiem hon la de tat: ke tan cong tu
   * dat `X-Forwarded-For` va co han muc vo han. Nen mac dinh `false`, va bat
   * bang `TRUST_PROXY=true` chi khi that su dat sau nginx/Caddy/CDN.
   */
  app.getHttpAdapter().getInstance().set('trust proxy', cfg.TRUST_PROXY);

  await app.listen(cfg.API_PORT);
  log.info('backend_started', {
    port: cfg.API_PORT,
    base_path: cfg.API_BASE_PATH,
    env: cfg.NODE_ENV,
  });
}

bootstrap().catch((err: unknown) => {
  process.stderr.write(`[backend] khong khoi dong duoc: ${(err as Error).message}\n`);
  process.exit(1);
});
