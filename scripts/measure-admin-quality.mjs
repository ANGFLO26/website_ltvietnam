#!/usr/bin/env node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const options = parseOptions(process.argv.slice(2));
const baseUrl = new URL(options.base ?? 'http://localhost:3002');
const quality = JSON.parse(
  readFileSync(resolve(ROOT, options.config ?? 'admin/admin-quality.config.json'), 'utf8'),
);
const email = options.email ?? process.env.ADMIN_SMOKE_EMAIL;
const password = options.password ?? process.env.ADMIN_SMOKE_PASSWORD;
const authCookie = email && password ? await login(baseUrl, email, password) : null;
const paths = [
  ...quality.public_metric_paths.map((path) => ({ path, authenticated: false })),
  ...(authCookie
    ? quality.authenticated_metric_paths.map((path) => ({ path, authenticated: true }))
    : []),
];
if (!authCookie) {
  process.stderr.write(
    'Canh bao: thieu ADMIN_SMOKE_EMAIL/ADMIN_SMOKE_PASSWORD; bo qua route list/editor.\n',
  );
}

const temporaryRoot = join(ROOT, '.tmp');
mkdirSync(temporaryRoot, { recursive: true });
const chromeProfile = mkdtempSync(join(temporaryRoot, 'a5-lighthouse-'));
const chrome = await launch({
  chromePath: options.chromePath,
  userDataDir: chromeProfile,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
const measurements = [];
try {
  for (const item of paths) {
    const url = new URL(item.path, baseUrl).toString();
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility'],
      formFactor: 'mobile',
      ...(item.authenticated && authCookie ? { extraHeaders: { Cookie: authCookie } } : {}),
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        disabled: false,
      },
      throttlingMethod: 'simulate',
    });
    if (!result) throw new Error(`Lighthouse khong tra ket qua cho ${url}`);
    const lcp = result.lhr.audits['largest-contentful-paint']?.numericValue;
    const cls = result.lhr.audits['cumulative-layout-shift']?.numericValue;
    const performance = result.lhr.categories.performance?.score;
    const accessibility = result.lhr.categories.accessibility?.score;
    if ([lcp, cls, performance, accessibility].some((value) => typeof value !== 'number')) {
      throw new Error(`Thieu metric Lighthouse cho ${url}`);
    }
    const failures = (result.lhr.categories.accessibility?.auditRefs ?? [])
      .map((reference) => result.lhr.audits[reference.id])
      .filter((audit) => audit && audit.score !== null && audit.score < 1)
      .map((audit) => ({
        id: audit.id,
        title: audit.title,
        nodes: (audit.details?.items ?? [])
          .map((item) => item.node?.selector ?? item.node?.snippet ?? item.selector)
          .filter((node) => typeof node === 'string'),
      }));
    measurements.push({
      path: item.path,
      authenticated: item.authenticated,
      lcp_ms: lcp,
      cls,
      performance_score: performance,
      accessibility_score: accessibility,
      accessibility_failures: failures,
    });
  }
} finally {
  try {
    await chrome.kill();
  } catch (error) {
    process.stderr.write(`Canh bao: khong dong duoc Chrome A5: ${error}\n`);
  }
  try {
    rmSync(chromeProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (error) {
    process.stderr.write(`Canh bao: chua xoa duoc profile Chrome A5: ${error}\n`);
  }
}

let failed = !authCookie;
for (const measurement of measurements) {
  const lcpOk = measurement.lcp_ms <= quality.lcp_budget_ms;
  const clsOk = measurement.cls <= quality.cls_budget;
  const accessibilityOk = measurement.accessibility_score >= quality.minimum_accessibility_score;
  failed ||= !lcpOk || !clsOk || !accessibilityOk;
  process.stdout.write(
    `  ${measurement.path}${measurement.authenticated ? ' (auth)' : ''}\n` +
      `    LCP ${measurement.lcp_ms.toFixed(0)}/${quality.lcp_budget_ms} ms ${lcpOk ? 'OK' : 'VUOT'}\n` +
      `    CLS ${measurement.cls.toFixed(3)}/${quality.cls_budget.toFixed(3)} ${clsOk ? 'OK' : 'VUOT'}\n` +
      `    Performance ${(measurement.performance_score * 100).toFixed(0)}/100\n` +
      `    Accessibility ${(measurement.accessibility_score * 100).toFixed(0)}/100 ${accessibilityOk ? 'OK' : 'VUOT'}\n`,
  );
  for (const failure of measurement.accessibility_failures) {
    process.stdout.write(`      - ${failure.id}: ${failure.title}\n`);
    for (const node of failure.nodes) process.stdout.write(`        ${node}\n`);
  }
}
if (options.output) {
  const output = resolve(ROOT, options.output);
  writeFileSync(
    output,
    `${JSON.stringify(
      {
        measured_at: new Date().toISOString(),
        base_url: baseUrl.toString(),
        budgets: {
          lcp_ms: quality.lcp_budget_ms,
          cls: quality.cls_budget,
          accessibility_score: quality.minimum_accessibility_score,
        },
        measurements,
      },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(`\nDa ghi ${output}\n`);
}
process.stdout.write(`\nA5 admin quality: ${failed ? 'KHONG DAT' : 'DAT'}\n`);
if (failed) process.exitCode = 1;

async function login(base, userEmail, userPassword) {
  const response = await fetch(new URL('/api/v1/auth/login', base), {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password: userPassword }),
  });
  if (!response.ok) throw new Error(`Dang nhap smoke that bai (${response.status}).`);
  const setCookies = response.headers.getSetCookie();
  const pairs = setCookies.map((value) => value.split(';', 1)[0]).filter(Boolean);
  if (pairs.length < 2) throw new Error('Dang nhap smoke khong nhan du cookie session/CSRF.');
  return pairs.join('; ');
}

function parseOptions(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--base') parsed.base = args[++index];
    else if (argument === '--config') parsed.config = args[++index];
    else if (argument === '--chrome-path') parsed.chromePath = args[++index];
    else if (argument === '--output') parsed.output = args[++index];
    else if (argument === '--email') parsed.email = args[++index];
    else if (argument === '--password') parsed.password = args[++index];
    else throw new Error(`Tuy chon khong hop le: ${argument}`);
  }
  return parsed;
}
