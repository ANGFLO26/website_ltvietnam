import { apiErrorFromPayload, decodeDataEnvelope } from './envelope';
import { ApiPayloadError, ApiTimeoutError } from './errors';

const PUBLIC_API_BASE = '/api/v1';
const DEFAULT_TIMEOUT_MS = 10_000;

export interface BrowserRequestOptions {
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export async function apiPost<TInput, TOutput>(
  path: string,
  body: TInput,
  options: BrowserRequestOptions = {},
): Promise<TOutput> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const abortFromCaller = (): void => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${PUBLIC_API_BASE}${normalizedPath}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await readJson(response);
    if (!response.ok) throw apiErrorFromPayload(response.status, payload);
    return decodeDataEnvelope<TOutput>(payload);
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new ApiTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiPayloadError(`API returned non-JSON content (${response.status})`);
  }
}
