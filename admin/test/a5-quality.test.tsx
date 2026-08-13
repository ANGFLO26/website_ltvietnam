import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AdminProviders, shouldRetryAdminQuery } from '@/components/providers/AdminProviders';
import { AdminApiError } from '@/lib/api/errors';
import { useUnsavedChanges } from '@/lib/use-unsaved-changes';

const root = resolve(import.meta.dirname, '..');

describe('A5 kha dung va an toan phia admin', () => {
  it('chi retry mot lan cho loi mang/5xx va khong retry loi nghiep vu', () => {
    expect(shouldRetryAdminQuery(0, new Error('network'))).toBe(true);
    expect(
      shouldRetryAdminQuery(
        0,
        new AdminApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'x' }),
      ),
    ).toBe(true);
    expect(
      shouldRetryAdminQuery(
        0,
        new AdminApiError({ status: 422, code: 'VALIDATION_ERROR', message: 'x' }),
      ),
    ).toBe(false);
    expect(shouldRetryAdminQuery(1, new Error('network'))).toBe(false);
  });

  it('thong bao offline bang live region', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(
      <AdminProviders>
        <p>Nội dung</p>
      </AdminProviders>,
    );
    const banner = await screen.findByRole('status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
    expect(banner).toHaveTextContent('Đang ngoại tuyến');
  });

  it('chan dieu huong noi bo khi form dirty va nguoi dung huy', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    function DirtyForm() {
      useUnsavedChanges(true);
      return <a href="/products">Rời form</a>;
    }
    render(<DirtyForm />);
    const allowed = fireEvent.click(screen.getByRole('link', { name: 'Rời form' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(allowed).toBe(false);
  });

  it('co card-list mobile, focus visible va reduced motion trong design system', () => {
    const css = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
    expect(css).toMatch(/@media \(max-width: 760px\)[\s\S]*\.data-table thead/);
    expect(css).toMatch(/\.data-table td::before[\s\S]*content:\s*attr\(data-label\)/);
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('bao ve moi route ngoai auth va admin header khong cho index/frame', () => {
    const middleware = readFileSync(join(root, 'src/middleware.ts'), 'utf8');
    const nextConfig = readFileSync(join(root, 'next.config.mjs'), 'utf8');
    expect(middleware).toContain(
      "const publicRoutes = new Set(['/login', '/setup', '/forgot-password', '/reset-password'])",
    );
    expect(middleware).toContain('!request.cookies.has(sessionCookie)');
    expect(nextConfig).toContain('noindex, nofollow, noarchive');
    expect(nextConfig).toContain("frame-ancestors 'none'");
    expect(nextConfig).toContain("base-uri 'self'");
  });
});
