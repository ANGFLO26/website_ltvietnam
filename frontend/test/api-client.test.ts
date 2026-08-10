import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiGetPage } from '@/lib/api/client.server';
import { ApiPayloadError, ApiTimeoutError } from '@/lib/api/errors';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('server API client', () => {
  it('unwraps data and pagination envelopes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ slug: 'one' }],
          meta: { page: 1, page_size: 20, total_items: 1, total_pages: 1 },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet<{ ok: boolean }>('/example')).resolves.toEqual({ ok: true });
    await expect(apiGetPage<{ slug: string }>('/example')).resolves.toMatchObject({
      data: [{ slug: 'one' }],
      meta: { total_items: 1 },
    });
  });

  it('turns backend errors into ApiError without losing request_id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Invalid input',
              request_id: 'request-123',
            },
          },
          422,
        ),
      ),
    );
    await expect(apiGet('/example')).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      requestId: 'request-123',
    });
  });

  it('rejects invalid JSON and times out stalled requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })));
    await expect(apiGet('/example')).rejects.toBeInstanceOf(ApiPayloadError);

    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: URL, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    const request = apiGet('/slow', { timeoutMs: 25 });
    const assertion = expect(request).rejects.toBeInstanceOf(ApiTimeoutError);
    await vi.advanceTimersByTimeAsync(25);
    await assertion;
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
