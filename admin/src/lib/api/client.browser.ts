'use client';

import { ADMIN_CSRF_COOKIE, ADMIN_CSRF_HEADER } from '@/config';
import { decodeData, decodePage, errorFromPayload, type AdminPage } from './envelope';
import { AdminApiPayloadError, AdminApiTimeoutError } from './errors';
import { loginPathFor } from '@/lib/auth/next-path';

const API_BASE = '/api/v1';
const DEFAULT_TIMEOUT_MS = 10_000;
const pendingMutations = new Map<string, Promise<unknown>>();
export const ADMIN_SESSION_EXPIRED_EVENT = 'ltv:admin-session-expired';

export interface AdminBrowserRequest {
  readonly method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  readonly body?: unknown | FormData;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly csrf?: boolean;
  readonly redirectOnUnauthorized?: boolean;
}

export async function adminBrowserRequest<T>(
  path: string,
  options: AdminBrowserRequest = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const mutationKey =
    !isSafeMethod(method) && !(options.body instanceof FormData)
      ? `${method}:${normalizePath(path)}:${bodyFingerprint(options.body)}`
      : null;
  if (mutationKey) {
    const pending = pendingMutations.get(mutationKey);
    if (pending) return pending as Promise<T>;
    const request = performBrowserRequest<T>(path, options, method);
    pendingMutations.set(mutationKey, request);
    try {
      return await request;
    } finally {
      if (pendingMutations.get(mutationKey) === request) pendingMutations.delete(mutationKey);
    }
  }
  return performBrowserRequest<T>(path, options, method);
}

async function performBrowserRequest<T>(
  path: string,
  options: AdminBrowserRequest,
  method: NonNullable<AdminBrowserRequest['method']>,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const abortFromCaller = (): void => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const form = options.body instanceof FormData;
    const headers: Record<string, string> = { accept: 'application/json', ...options.headers };
    if (options.body !== undefined && !form) headers['content-type'] = 'application/json';
    if (options.csrf !== false && !isSafeMethod(method)) {
      const csrf = cookieValue(ADMIN_CSRF_COOKIE);
      if (csrf) headers[ADMIN_CSRF_HEADER] = csrf;
    }

    const response = await fetch(`${API_BASE}${normalizePath(path)}`, {
      method,
      headers,
      credentials: 'same-origin',
      ...(options.body === undefined
        ? {}
        : { body: form ? options.body : JSON.stringify(options.body) }),
      signal: controller.signal,
    });

    if (response.status === 204) return undefined as T;
    const payload = await readJson(response);
    if (!response.ok) {
      const error = errorFromPayload(response.status, payload);
      if (response.status === 401 && options.redirectOnUnauthorized !== false) redirectToLogin();
      throw error;
    }
    return decodeData<T>(payload);
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) {
      throw new AdminApiTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export async function adminBrowserPage<T>(path: string): Promise<AdminPage<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${normalizePath(path)}`, {
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
      signal: controller.signal,
    });
    const payload = await readJson(response);
    if (!response.ok) {
      const error = errorFromPayload(response.status, payload);
      if (response.status === 401) redirectToLogin();
      throw error;
    }
    return decodePage<T>(payload);
  } catch (error) {
    if (controller.signal.aborted) throw new AdminApiTimeoutError(DEFAULT_TIMEOUT_MS);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function cookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const item of document.cookie.split(';')) {
    const [rawName, ...rest] = item.split('=');
    if (rawName?.trim() === name) return decodeURIComponent(rest.join('=').trim());
  }
  return null;
}

function redirectToLogin(): void {
  if (typeof window === 'undefined' || window.location.pathname === '/login') return;
  window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
  window.location.assign(loginPathFor(window.location.pathname, window.location.search));
}

function isSafeMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function bodyFingerprint(body: unknown): string {
  const serialized = JSON.stringify(body ?? null);
  let hash = 2_166_136_261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${serialized.length}:${hash >>> 0}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AdminApiPayloadError(`API trả nội dung không phải JSON (${response.status}).`);
  }
}
