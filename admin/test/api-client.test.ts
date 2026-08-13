import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminBrowserRequest } from '@/lib/api/client.browser';
import { AdminApiError, AdminApiTimeoutError, fieldErrorsOf } from '@/lib/api/errors';
import { loginPathFor, safeNextPath } from '@/lib/auth/next-path';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.cookie = 'ltv_csrf=; Max-Age=0; path=/';
});

describe('A1 admin browser API client', () => {
  it('gui CSRF cho mutation JSON va xu ly 204 khong body', async () => {
    document.cookie = 'ltv_csrf=csrf-123; path=/';
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      adminBrowserRequest<void>('/admin/example', { method: 'PATCH', body: { name: 'LT' } }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.headers).toMatchObject({
      'content-type': 'application/json',
      'x-csrf-token': 'csrf-123',
    });
    expect(init.body).toBe('{"name":"LT"}');
  });

  it('giu FormData nguyen ban va khong tu dat content-type', async () => {
    document.cookie = 'ltv_csrf=csrf-form; path=/';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'media-1' } }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const body = new FormData();
    body.set('file', new Blob(['x']), 'x.txt');

    await adminBrowserRequest('/admin/media', { method: 'POST', body });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.body).toBe(body);
    expect(init.headers).not.toHaveProperty('content-type');
    expect(init.headers).toMatchObject({ 'x-csrf-token': 'csrf-form' });
  });

  it('403 CSRF khong retry va giu field details/request id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'CSRF_TOKEN_MISMATCH',
            message: 'Sai CSRF',
            details: { fields: [{ field: 'csrf', message: 'Tai lai phien' }] },
            request_id: 'req-a1',
          },
        }),
        { status: 403, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    let caught: unknown;
    try {
      await adminBrowserRequest('/admin/example', { method: 'POST', body: {}, csrf: false });
    } catch (error) {
      caught = error;
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(caught).toMatchObject({ code: 'CSRF_TOKEN_MISMATCH', requestId: 'req-a1' });
    expect(fieldErrorsOf(caught)).toEqual([{ field: 'csrf', message: 'Tai lai phien' }]);
  });

  it('timeout dung AbortController va tra loi co ten', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    const request = adminBrowserRequest('/slow', { timeoutMs: 20 });
    const assertion = expect(request).rejects.toBeInstanceOf(AdminApiTimeoutError);
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
  });

  it('giu next noi bo va chan open redirect', () => {
    expect(safeNextPath('/products?page=3')).toBe('/products?page=3');
    expect(safeNextPath('//evil.test/x')).toBe('/dashboard');
    expect(safeNextPath('https://evil.test')).toBe('/dashboard');
    expect(loginPathFor('/account/password', '?tab=security')).toBe(
      '/login?next=%2Faccount%2Fpassword%3Ftab%3Dsecurity',
    );
  });

  it('ApiError co the duoc nhan dien ro rang', () => {
    expect(
      new AdminApiError({ status: 401, code: 'AUTH_NO_SESSION', message: 'x' }),
    ).toBeInstanceOf(Error);
  });

  it('gop mutation trung dang chay va cho phep gui lai sau khi hoan tat', async () => {
    document.cookie = 'ltv_csrf=csrf-dedupe; path=/';
    let release!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 'saved-again' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const first = adminBrowserRequest<{ id: string }>('/admin/products/p1', {
      method: 'PATCH',
      body: { name: 'A' },
    });
    const duplicate = adminBrowserRequest<{ id: string }>('/admin/products/p1', {
      method: 'PATCH',
      body: { name: 'A' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release(
      new Response(JSON.stringify({ data: { id: 'saved' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(Promise.all([first, duplicate])).resolves.toEqual([
      { id: 'saved' },
      { id: 'saved' },
    ]);

    await adminBrowserRequest('/admin/products/p1', {
      method: 'PATCH',
      body: { name: 'B' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('khong gop hai PATCH co payload khac nhau', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await Promise.all([
      adminBrowserRequest('/admin/products/p2', { method: 'PATCH', body: { name: 'A' } }),
      adminBrowserRequest('/admin/products/p2', { method: 'PATCH', body: { name: 'B' } }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
