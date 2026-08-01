/**
 * Structured application log (ADR-006 / A20).
 *
 * P0 KHONG tao bang audit_logs. Ghi log co cau truc ra stdout.
 * TUYET DOI khong log: mat khau, JWT, cookie, secret SMTP/CAPTCHA,
 * toan bo noi dung inquiry, noi dung file, PII day du.
 */
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

const ORDER: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

/** Khoa bi che khi ghi log, du lot vao do so suat. */
const REDACT = new Set([
  'password',
  'password_hash',
  'passwordHash',
  'token',
  'jwt',
  'cookie',
  'authorization',
  'secret',
  'smtp_password',
  'captcha_secret',
  'message',
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, depth + 1);
  }
  return out;
}

export interface Logger {
  log(level: LogLevel, msg: string, ctx?: Record<string, unknown>): void;
  info(msg: string, ctx?: Record<string, unknown>): void;
  warn(msg: string, ctx?: Record<string, unknown>): void;
  error(msg: string, ctx?: Record<string, unknown>): void;
  child(bound: Record<string, unknown>): Logger;
}

export function createLogger(
  minLevel: LogLevel = 'info',
  bound: Record<string, unknown> = {},
): Logger {
  const write = (level: LogLevel, msg: string, ctx: Record<string, unknown> = {}): void => {
    if (ORDER[level] > ORDER[minLevel]) return;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      msg,
      ...bound,
      ...(redact(ctx) as object),
    });
    if (ORDER[level] <= ORDER.warn) process.stderr.write(`${line}\n`);
    else process.stdout.write(`${line}\n`);
  };
  return {
    log: write,
    info: (m, c) => write('info', m, c),
    warn: (m, c) => write('warn', m, c),
    error: (m, c) => write('error', m, c),
    child: (extra) => createLogger(minLevel, { ...bound, ...extra }),
  };
}
