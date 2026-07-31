import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { loadConfig } from '@ltv/config';
import { createPool } from '@ltv/db';
import { AppModule } from './app.module.js';
import { requestIdMiddleware } from './common/request-id.middleware.js';

async function bootstrap(): Promise<void> {
  // Thu tu bootstrap (plan 03 muc 1): config -> logging -> pool DB -> module.
  // Khong doc `settings` tu DB o buoc nay; settings la module runtime.
  const cfg = loadConfig();
  const pool = createPool(cfg);

  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.use(requestIdMiddleware);
  app.setGlobalPrefix(cfg.API_BASE_PATH, {
    exclude: ['health/live', 'health/ready'],
  });
  app.enableCors({ origin: cfg.CORS_ORIGINS, credentials: true });

  const shutdown = async (): Promise<void> => {
    await app.close();
    await pool.end();
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());

  await app.listen(cfg.API_PORT);
  process.stdout.write(
    `[api] listening on :${cfg.API_PORT}${cfg.API_BASE_PATH} (env=${cfg.NODE_ENV})\n`,
  );
}

bootstrap().catch((err: unknown) => {
  process.stderr.write(`[api] khong khoi dong duoc: ${(err as Error).message}\n`);
  process.exit(1);
});
