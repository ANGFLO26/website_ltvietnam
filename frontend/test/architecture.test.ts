import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, ROUTES, type RouteDef } from '@ltv/contracts';

const FRONTEND = resolve(import.meta.dirname, '..');
const SRC = resolve(FRONTEND, 'src');
const APP = resolve(SRC, 'app');
const sourceFiles = walk(SRC).filter((file) => /\.(?:ts|tsx)$/.test(file));
const componentFiles = sourceFiles.filter(
  (file) =>
    file.endsWith('.tsx') &&
    (file.includes(`${sep}app${sep}`) || file.includes(`${sep}components${sep}`)),
);

describe('frontend architecture rules', () => {
  it('1. components do not call fetch directly', () => {
    const offenders = componentFiles.filter((file) => /\bfetch\s*\(/.test(read(file)));
    expect(relativeFiles(offenders)).toEqual([]);
  });

  it('2. App Router pages and ROUTES agree in both directions', () => {
    const pages = walk(APP).filter((file) => file.endsWith(`${sep}page.tsx`));
    const expectedPages = ROUTES.filter((route) => route.status === 'done').reduce(
      (total, route) => total + (route.localized ? 2 : 1),
      0,
    );
    expect(pages).toHaveLength(expectedPages);

    const discovered = pages.map(pageDefinition);
    const unknown = discovered.filter(
      (page) =>
        !ROUTES.some((route) => route.path === page.path && (!page.localized || route.localized)),
    );
    expect(unknown).toEqual([]);

    const routes: readonly RouteDef[] = ROUTES;
    const missingDone = routes
      .filter((route) => route.status === 'done')
      .flatMap((route) => {
        const required = [{ path: route.path, localized: false }];
        if (route.localized) required.push({ path: route.path, localized: true });
        return required.filter(
          (wanted) =>
            !discovered.some(
              (page) => page.path === wanted.path && page.localized === wanted.localized,
            ),
        );
      });
    expect(missingDone).toEqual([]);
  });

  it('3. components do not hard-code internal href or router destinations', () => {
    const pattern = /(?:href\s*=\s*["']\/|(?:push|replace)\s*\(\s*["']\/)/;
    const offenders = componentFiles.filter((file) => pattern.test(read(file)));
    expect(relativeFiles(offenders)).toEqual([]);
  });

  it('4. every page exports metadata or generateMetadata', () => {
    const pages = walk(APP).filter((file) => file.endsWith(`${sep}page.tsx`));
    const offenders = pages.filter(
      (file) =>
        !/export\s+(?:const\s+metadata|(?:async\s+)?function\s+generateMetadata)\b/.test(
          read(file),
        ),
    );
    expect(relativeFiles(offenders)).toEqual([]);
  });

  it('5. App Router redirect helpers are not used', () => {
    const offenders = sourceFiles.filter((file) => {
      const source = read(file);
      return (
        /from\s+["']next\/navigation["']/.test(source) &&
        /\b(?:redirect|permanentRedirect)\s*\(/.test(source)
      );
    });
    expect(relativeFiles(offenders)).toEqual([]);
  });

  it('6. raw img elements are not used', () => {
    const offenders = componentFiles.filter((file) => /<img\b/.test(read(file)));
    expect(relativeFiles(offenders)).toEqual([]);
  });

  it('7. only src/config.ts reads process.env', () => {
    const offenders = sourceFiles.filter(
      (file) => file !== resolve(SRC, 'config.ts') && /process\.env\b/.test(read(file)),
    );
    expect(relativeFiles(offenders)).toEqual([]);
  });

  it('8. raw HTML is restricted to the audited content block renderer', () => {
    const allowed = resolve(SRC, 'components', 'content', 'ContentBlocks.tsx');
    const offenders = sourceFiles.filter(
      (file) => file !== allowed && /dangerouslySetInnerHTML\b/.test(read(file)),
    );
    expect(relativeFiles(offenders)).toEqual([]);
  });

  it('9. components do not contain raw user-facing JSX text', () => {
    const rawText = />\s*[A-Za-zÀ-ỹ][^<{>\n]*\s*</u;
    const offenders = componentFiles.filter((file) => rawText.test(stripComments(read(file))));
    expect(relativeFiles(offenders)).toEqual([]);
  });

  it('10. API modules avoid any and double assertions', () => {
    const apiRoot = resolve(SRC, 'lib', 'api');
    const boundary = resolve(apiRoot, 'envelope.ts');
    const apiFiles = walk(apiRoot).filter((file) => file.endsWith('.ts') && file !== boundary);
    const unsafe = /(?:\bany\b|as\s+unknown\s+as)/;
    const offenders = apiFiles.filter((file) => unsafe.test(stripComments(read(file))));
    expect(relativeFiles(offenders)).toEqual([]);
  });
});

/**
 * Doan tien to ngon ngu trong cay `app/` — doc tu contracts, khong viet cung.
 *
 * Ban truoc so `rawSegments[0] === 'vi'`. Khi tieng Viet ve goc va tieng Anh
 * chuyen sang `/en`, phep so do coi `app/en/...` la trang KHONG co tien to va
 * quy no ve route `/en/...` — mot route khong ton tai — nen phep kiem hai chieu
 * bao sai o ca hai huong cung luc, va thong bao loi khong chi ra nguyen nhan.
 */
const PREFIXED_LOCALES = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

function pageDefinition(file: string): { path: string; localized: boolean } {
  const relativePath = relative(APP, file)
    .replaceAll('\\', '/')
    .replace(/\/page\.tsx$/, '');
  const rawSegments = relativePath === 'page.tsx' ? [] : relativePath.split('/');
  const first = rawSegments[0];
  const localized = PREFIXED_LOCALES.some((locale) => locale === first);
  const segments = rawSegments
    .filter((segment, index) => !(index === 0 && localized) && !/^\(.+\)$/.test(segment))
    .map((segment) => segment.replace(/^\[([^\]]+)\]$/, ':$1'));
  return { path: segments.length === 0 ? '/' : `/${segments.join('/')}`, localized };
}

function walk(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = resolve(root, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function relativeFiles(files: readonly string[]): string[] {
  return files.map((file) => relative(FRONTEND, file).replaceAll('\\', '/'));
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}
