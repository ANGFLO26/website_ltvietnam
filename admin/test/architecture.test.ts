import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const src = join(root, 'src');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe('A1 admin architecture', () => {
  const files = sourceFiles(src);

  it('khong luu token hoac session trong web storage', () => {
    const bad = files.filter((file) =>
      /\b(?:localStorage|sessionStorage)\b/.test(readFileSync(file, 'utf8')),
    );
    expect(bad.map((file) => relative(root, file))).toEqual([]);
  });

  it('fetch chi nam trong lib/api', () => {
    const bad = files.filter((file) => {
      const code = readFileSync(file, 'utf8');
      return (
        /\bfetch\s*\(/.test(code) &&
        !relative(src, file).replaceAll('\\', '/').startsWith('lib/api/')
      );
    });
    expect(bad.map((file) => relative(root, file))).toEqual([]);
  });

  it('admin bat noindex va mutation query khong retry', () => {
    const nextConfig = readFileSync(join(root, 'next.config.mjs'), 'utf8');
    const providers = readFileSync(join(src, 'components/providers/AdminProviders.tsx'), 'utf8');
    expect(nextConfig).toContain('X-Robots-Tag');
    expect(nextConfig).toContain('noindex, nofollow, noarchive');
    expect(providers).toMatch(/mutations:\s*\{\s*retry:\s*false/);
  });

  it('khong de public media proxy nuot route Media Library', () => {
    const nextConfig = readFileSync(join(root, 'next.config.mjs'), 'utf8');
    const middleware = readFileSync(join(src, 'middleware.ts'), 'utf8');
    expect(nextConfig).not.toContain("source: '/media/:path*'");
    expect(nextConfig).toContain("source: '/media/originals/:path*'");
    expect(nextConfig).toContain("source: '/media/variants/:path*'");
    expect(nextConfig).toContain("source: '/media/public/:path*'");
    expect(middleware).not.toContain("favicon.ico|media).*)'");
    expect(middleware).toContain('media/(?:originals|variants|public)');
  });

  it('dev va start dung cong 3002', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.dev).toContain('-p 3002');
    expect(pkg.scripts.start).toContain('-p 3002');
  });
});
