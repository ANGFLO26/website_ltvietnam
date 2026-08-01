import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadConfig } from '@ltv/config';
import { AppModule } from './app.module.js';
import { requestIdMiddleware } from './shared/logging/request-id.middleware.js';
import { AppExceptionFilter } from './shared/http/exception.filter.js';
import { createLogger } from './shared/logging/logger.js';

async function bootstrap(): Promise<void> {
  // Doc config o day CHI de lay cong va CORS truoc khi Nest khoi tao.
  // Pool va Kysely do InfrastructureModule so huu — khong tao o day.
  const cfg = loadConfig();
  const log = createLogger(cfg.LOG_LEVEL, { app: 'backend' });

  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new AppExceptionFilter());
  app.setGlobalPrefix(cfg.API_BASE_PATH, { exclude: ['health/live', 'health/ready'] });
  app.enableCors({ origin: cfg.CORS_ORIGINS, credentials: true });

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
