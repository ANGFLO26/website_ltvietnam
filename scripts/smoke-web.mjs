#!/usr/bin/env node
/**
 * Bo qua website dang chay tu sitemap that va kiem cac bat bien SEO W7.
 *
 *   pnpm smoke:web
 *   pnpm smoke:web -- --base http://localhost:3000
 *
 * Backend va frontend phai cung dang chay, du lieu demo da duoc seed. Script
 * dung `redirect: manual` de mot 301/302 khong bi fetch che mat.
 */

const args = process.argv.slice(2);
const BASE = new URL(valueOf('--base') ?? 'http://localhost:3000');
const NOINDEX_PATHS = ['/search', '/vi/search', '/request-success', '/vi/request-success'];
const failures = [];
let checks = 0;
let passed = 0;

function valueOf(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function check(name, condition, detail = '') {
  checks += 1;
  if (condition) {
    passed += 1;
    return true;
  }
  failures.push(`${name}${detail.length === 0 ? '' : `: ${detail}`}`);
  return false;
}

async function request(path) {
  const url = new URL(path, BASE);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { accept: 'text/html,application/xml,text/plain' },
      signal: AbortSignal.timeout(15_000),
    });
    return {
      url,
      status: response.status,
      location: response.headers.get('location'),
      contentType: response.headers.get('content-type') ?? '',
      body: await response.text(),
    };
  } catch (error) {
    check(`goi ${url.pathname}`, false, error instanceof Error ? error.message : String(error));
    return null;
  }
}

const sitemapIndex = await request('/sitemap.xml');
if (sitemapIndex === null) finish();
check('sitemap index tra 200', sitemapIndex.status === 200, String(sitemapIndex.status));
check(
  'sitemap index la XML',
  sitemapIndex.contentType.includes('xml') && sitemapIndex.body.includes('<sitemapindex'),
  sitemapIndex.contentType,
);

const childSitemaps = locs(sitemapIndex.body);
check('sitemap index co dung hai locale', childSitemaps.length === 2, childSitemaps.join(', '));

const sitemapUrls = [];
for (const sitemapUrl of childSitemaps) {
  const parsed = new URL(sitemapUrl);
  check(
    `origin sitemap ${parsed.pathname}`,
    parsed.origin === BASE.origin,
    `${parsed.origin} != ${BASE.origin}`,
  );
  const response = await request(parsed.pathname);
  if (response === null) continue;
  check(`${parsed.pathname} tra 200`, response.status === 200, String(response.status));
  check(`${parsed.pathname} la XML`, response.body.includes('<urlset'));
  sitemapUrls.push(...locs(response.body));
}

const uniqueUrls = new Set(sitemapUrls);
check('sitemap khong co URL trung', uniqueUrls.size === sitemapUrls.length);
check('sitemap co URL de bo', uniqueUrls.size > 0);

for (const rawUrl of uniqueUrls) {
  const listed = new URL(rawUrl);
  const expected = new URL(`${listed.pathname}${listed.search}`, BASE);
  const response = await request(`${listed.pathname}${listed.search}`);
  if (response === null) continue;

  const noRedirect = response.status >= 200 && response.status < 300 && response.location === null;
  const h1Count = (response.body.match(/<h1(?:\s[^>]*)?>/giu) ?? []).length;
  const canonical = canonicalFrom(response.body);
  const robots = robotsFrom(response.body);
  const indexable = robots.includes('index') && !robots.includes('noindex');
  const clean = listed.search.length === 0 && listed.hash.length === 0;
  const canonicalMatches = normalize(canonical) === normalize(expected.toString());

  check(
    `${listed.pathname}: 200 khong redirect`,
    noRedirect,
    `${response.status} ${response.location ?? ''}`,
  );
  check(`${listed.pathname}: dung mot h1`, h1Count === 1, String(h1Count));
  check(`${listed.pathname}: canonical self`, canonicalMatches, canonical);
  check(`${listed.pathname}: indexable`, indexable, robots);
  check(`${listed.pathname}: URL sach`, clean, rawUrl);

  console.log(
    `${noRedirect && h1Count === 1 && canonicalMatches && indexable && clean ? '  ok  ' : ' FAIL '} ${listed.pathname}`,
  );
}

for (const path of NOINDEX_PATHS) {
  check(
    `${path}: khong nam trong sitemap`,
    ![...uniqueUrls].some((url) => new URL(url).pathname === path),
  );
  const response = await request(path);
  if (response === null) continue;
  const robots = robotsFrom(response.body);
  check(`${path}: tra 200`, response.status === 200, String(response.status));
  check(`${path}: noindex,follow`, robots.includes('noindex') && robots.includes('follow'), robots);
}

const robots = await request('/robots.txt');
if (robots !== null) {
  check('robots.txt tra 200', robots.status === 200, String(robots.status));
  check(
    'robots.txt tro toi sitemap index',
    robots.body.includes(new URL('/sitemap.xml', BASE).toString()),
  );
}

finish();

function locs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/giu)].map((match) =>
    decodeXml(match[1] ?? ''),
  );
}

function canonicalFrom(html) {
  return tags(html, 'link').find((attributes) => token(attributes.rel, 'canonical'))?.href ?? '';
}

function robotsFrom(html) {
  return (
    tags(html, 'meta').find((attributes) => attributes.name?.toLowerCase() === 'robots')?.content ??
    ''
  ).toLowerCase();
}

function tags(html, name) {
  const pattern = new RegExp(`<${name}\\b[^>]*>`, 'giu');
  return [...html.matchAll(pattern)].map((match) => attributes(match[0]));
}

function attributes(tag) {
  const output = {};
  const pattern = /([^\s=<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gu;
  for (const match of tag.matchAll(pattern)) {
    const name = (match[1] ?? '').toLowerCase();
    output[name] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return output;
}

function token(value, expected) {
  return value?.toLowerCase().split(/\s+/u).includes(expected) ?? false;
}

function normalize(value) {
  if (value.length === 0) return '';
  const url = new URL(value, BASE);
  url.hash = '';
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/u, '');
  return url.toString();
}

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function decodeHtml(value) {
  return decodeXml(value).replaceAll('&#x2F;', '/').replaceAll('&#47;', '/');
}

function finish() {
  console.log(`\nW7 smoke-web: ${passed}/${checks} phep kiem xanh`);
  if (failures.length > 0) {
    console.error('\nLoi:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  process.exit(0);
}
