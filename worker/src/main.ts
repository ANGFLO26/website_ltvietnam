/**
 * Worker outbox — khung P0.
 *
 * Vong doi day du (D6 / plan 01 muc C.7) duoc hien thuc o P7:
 *   claim job -> commit attempt `started` -> goi provider NGOAI transaction
 *   -> MOT result transaction ghi attempt + outbox + inquiry
 * P0 chi dung tien trinh, heartbeat va tat may an toan.
 */
import { loadConfig } from '@ltv/config';
import { createPool } from '@ltv/db';

const cfg = loadConfig();
const pool = createPool(cfg);

let running = true;
let inFlight = 0;

const log = (msg: string, extra: Record<string, unknown> = {}): void => {
  process.stdout.write(
    `${JSON.stringify({ ts: new Date().toISOString(), worker_id: cfg.WORKER_ID, msg, ...extra })}\n`,
  );
};

/** Heartbeat de reaper biet worker nay con song (D6). */
async function heartbeat(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    log('heartbeat', { in_flight: inFlight });
  } catch (err) {
    log('heartbeat_failed', { error: (err as Error).message });
  }
}

/** Mot vong xu ly. P7 se thay bang claim + gui + reconcile that. */
async function tick(): Promise<void> {
  if (!running) return;
  inFlight++;
  try {
    // P7: SELECT ... WHERE status='pending' AND next_attempt_at <= NOW()
    //     ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT :batch
    log('tick_noop', { batch_size: cfg.WORKER_BATCH_SIZE });
  } finally {
    inFlight--;
  }
}

/** Tat may co trat tu: ngung nhan viec moi, cho viec dang chay xong (drain). */
async function shutdown(signal: string): Promise<void> {
  log('shutdown_start', { signal });
  running = false;
  const deadline = Date.now() + 30_000;
  while (inFlight > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
  await pool.end();
  log('shutdown_complete', { drained: inFlight === 0 });
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

log('worker_start', { poll_ms: cfg.WORKER_POLL_INTERVAL_MS });
setInterval(() => void tick(), cfg.WORKER_POLL_INTERVAL_MS);
setInterval(() => void heartbeat(), cfg.WORKER_HEARTBEAT_INTERVAL_MS);
