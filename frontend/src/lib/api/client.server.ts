import { getServerConfig } from '@/config';
import { apiErrorFromPayload, decodeDataEnvelope, decodePageEnvelope } from './envelope';
import type { PagedData } from './envelope';
import { ApiPayloadError, ApiTimeoutError } from './errors';

export type ApiQueryScalar = string | number | boolean;
export type ApiQueryValue = ApiQueryScalar | readonly ApiQueryScalar[] | null | undefined;
export type ApiQuery = Readonly<Record<string, ApiQueryValue>>;

export interface ServerRequestOptions {
  readonly query?: ApiQuery;
  readonly revalidate?: number | false;
  readonly tags?: readonly string[];
  readonly timeoutMs?: number;
}

export async function apiGet<T>(path: string, options: ServerRequestOptions = {}): Promise<T> {
  return decodeDataEnvelope<T>(await request(path, options));
}

export async function apiGetPage<T>(
  path: string,
  options: ServerRequestOptions = {},
): Promise<PagedData<T>> {
  return decodePageEnvelope<T>(await request(path, options));
}

async function request(path: string, options: ServerRequestOptions): Promise<unknown> {
  const config = getServerConfig();
  const timeoutMs = options.timeoutMs ?? config.apiTimeoutMs;
  const url = buildApiUrl(config.internalApiUrl, path, options.query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
      ...(options.revalidate === false
        ? { cache: 'no-store' as const }
        : {
            next: {
              revalidate: options.revalidate ?? 60,
              ...(options.tags === undefined ? {} : { tags: [...options.tags] }),
            },
          }),
    });
    const payload = await readJson(response);
    if (!response.ok) throw apiErrorFromPayload(response.status, payload);
    return payload;
  } catch (error) {
    if (controller.signal.aborted) throw new ApiTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function buildApiUrl(base: URL, path: string, query: ApiQuery | undefined): URL {
  const normalizedBase = base.toString().replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);
  if (query === undefined) return url;

  for (const [key, raw] of Object.entries(query)) {
    if (raw === undefined || raw === null) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) url.searchParams.append(key, String(value));
  }
  return url;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiPayloadError(`API returned non-JSON content (${response.status})`);
  }
}
