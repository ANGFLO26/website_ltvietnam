import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadConfig } from '@ltv/config';
import { AppModule } from './app.module.js';
import { requestIdMiddleware } from './common/request-id.middleware.js';

async function bootstrap(): Promise<void> {
  // Thu tu bootstrap (plan 03 muc 1): config -> logging -> pool DB -> module.
  // Khong doc `settings` tu DB o buoc nay; settings la module runtime.
  // Doc config o day CHI de lay cong va CORS truoc khi Nest khoi tao.
  // Pool DB do InfrastructureModule so huu — khong tao pool o day.
  const cfg = loadConfig();

  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();
  app.use(requestIdMiddleware);
  app.setGlobalPrefix(cfg.API_BASE_PATH, {
    exclude: ['health/live', 'health/ready'],
  });
  app.enableCors({ origin: cfg.CORS_ORIGINS, credentials: true });

  // enableShutdownHooks + OnApplicationShutdown cua InfrastructureModule
  // dam bao pool duoc dong dung mot lan, dung noi so huu no.

  await app.listen(cfg.API_PORT);
  process.stdout.write(
    `[api] listening on :${cfg.API_PORT}${cfg.API_BASE_PATH} (env=${cfg.NODE_ENV})\n`,
  );
}

bootstrap().catch((err: unknown) => {
  process.stderr.write(`[api] khong khoi dong duoc: ${(err as Error).message}\n`);
  process.exit(1);
});
