import 'server-only';

import { headers } from 'next/headers';
import { getAdminServerConfig } from '@/config';
import { decodeData, decodePage, errorFromPayload, type AdminPage } from './envelope';
import { AdminApiPayloadError, AdminApiTimeoutError } from './errors';

export interface AdminServerRequest {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  readonly body?: unknown | FormData;
  readonly timeoutMs?: number;
}

export async function adminServerRequest<T>(
  path: string,
  options: AdminServerRequest = {},
): Promise<T> {
  return decodeData<T>(await request(path, options));
}

export async function adminServerPage<T>(path: string): Promise<AdminPage<T>> {
  return decodePage<T>(await request(path, {}));
}

async function request(path: string, options: AdminServerRequest): Promise<unknown> {
  const config = getAdminServerConfig();
  const timeoutMs = options.timeoutMs ?? config.apiTimeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const requestHeaders = await headers();
  const form = options.body instanceof FormData;
  const outgoing: Record<string, string> = { accept: 'application/json' };
  const cookie = requestHeaders.get('cookie');
  if (cookie) outgoing.cookie = cookie;
  if (options.body !== undefined && !form) outgoing['content-type'] = 'application/json';

  try {
    const base = config.internalApiUrl.toString().replace(/\/$/, '');
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${base}${normalized}`, {
      method: options.method ?? 'GET',
      headers: outgoing,
      cache: 'no-store',
      ...(options.body === undefined
        ? {}
        : { body: form ? options.body : JSON.stringify(options.body) }),
      signal: controller.signal,
    });
    if (response.status === 204) return { data: undefined };
    const payload = await readJson(response);
    if (!response.ok) throw errorFromPayload(response.status, payload);
    return payload;
  } catch (error) {
    if (controller.signal.aborted) throw new AdminApiTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AdminApiPayloadError(`API trả nội dung không phải JSON (${response.status}).`);
  }
}
