import { assertWorkerProductionSafe, loadWorkerConfig } from '@ltv/config';
import { createAppPool } from '@ltv/db';
import { createEmailSender } from './email.js';
import { PgOutboxRepository } from './outbox.js';
import { OutboxProcessor } from './processor.js';

const cfg = loadWorkerConfig();
assertWorkerProductionSafe(cfg);
const pool = createAppPool(cfg);
const repository = new PgOutboxRepository(pool);
const sender = createEmailSender(cfg);

let running = true;
let ticking = false;

const log = (msg: string, extra: Readonly<Record<string, unknown>> = {}): void => {
  process.stdout.write(
    `${JSON.stringify({ ts: new Date().toISOString(), worker_id: cfg.WORKER_ID, msg, ...extra })}\n`,
  );
};

const processor = new OutboxProcessor(repository, sender, cfg, log);

async function heartbeat(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    log('heartbeat', { in_flight: ticking ? 1 : 0 });
  } catch {
    // Khong ghi message goc: driver co the kem DSN/host/credential.
    log('heartbeat_failed');
  }
}

async function tick(): Promise<void> {
  if (!running || ticking) return;
  ticking = true;
  try {
    const count = await processor.tick();
    if (count > 0) log('outbox_batch_complete', { count });
  } catch {
    log('outbox_tick_failed');
  } finally {
    ticking = false;
  }
}

const pollTimer = setInterval(() => void tick(), cfg.WORKER_POLL_INTERVAL_MS);
const heartbeatTimer = setInterval(() => void heartbeat(), cfg.WORKER_HEARTBEAT_INTERVAL_MS);

async function shutdown(signal: string): Promise<void> {
  if (!running) return;
  log('shutdown_start', { signal });
  running = false;
  clearInterval(pollTimer);
  clearInterval(heartbeatTimer);
  const deadline = Date.now() + 30_000;
  while (ticking && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100));
  await pool.end();
  log('shutdown_complete', { drained: !ticking });
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

log('worker_start', { poll_ms: cfg.WORKER_POLL_INTERVAL_MS, transport: cfg.EMAIL_TRANSPORT });
void tick();
