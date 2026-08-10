#!/usr/bin/env node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const options = parseOptions(process.argv.slice(2));
const baseUrl = new URL(options.base ?? 'http://localhost:3000');
const quality = JSON.parse(
  readFileSync(resolve(ROOT, options.config ?? 'frontend/web-quality.config.json'), 'utf8'),
);
const temporaryRoot = join(ROOT, '.tmp');
mkdirSync(temporaryRoot, { recursive: true });
const chromeProfile = mkdtempSync(join(temporaryRoot, 'w8-lighthouse-'));

const chrome = await launch({
  chromePath: options.chromePath,
  userDataDir: chromeProfile,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

const measurements = [];
try {
  for (const path of quality.metric_paths) {
    const url = new URL(path, baseUrl).toString();
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility'],
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        disabled: false,
      },
      throttlingMethod: 'simulate',
    });
    if (result === undefined) throw new Error(`Lighthouse khong tra ket qua cho ${url}`);
    const lcp = result.lhr.audits['largest-contentful-paint']?.numericValue;
    const cls = result.lhr.audits['cumulative-layout-shift']?.numericValue;
    const score = result.lhr.categories.performance?.score;
    const accessibilityScore = result.lhr.categories.accessibility?.score;
    const accessibilityFailures = (result.lhr.categories.accessibility?.auditRefs ?? [])
      .map((reference) => result.lhr.audits[reference.id])
      .filter((audit) => audit !== undefined && audit.score !== null && audit.score < 1)
      .map((audit) => ({
        id: audit.id,
        title: audit.title,
        score: audit.score,
        nodes: (audit.details?.items ?? [])
          .map((item) => item.node?.selector ?? item.node?.snippet ?? item.selector)
          .filter((node) => typeof node === 'string'),
      }));
    if (
      typeof lcp !== 'number' ||
      typeof cls !== 'number' ||
      typeof score !== 'number' ||
      typeof accessibilityScore !== 'number'
    ) {
      throw new Error(`Thieu metric Lighthouse cho ${url}`);
    }
    measurements.push({
      path,
      lcp_ms: lcp,
      cls,
      performance_score: score,
      accessibility_score: accessibilityScore,
      accessibility_failures: accessibilityFailures,
    });
  }
} finally {
  try {
    await chrome.kill();
  } catch (error) {
    process.stderr.write(`Canh bao: Chrome da dung nhung profile tam chua xoa duoc: ${error}\n`);
  }
  try {
    rmSync(chromeProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch (error) {
    process.stderr.write(`Canh bao: chua xoa duoc profile Chrome W8: ${error}\n`);
  }
}

let failed = false;
for (const measurement of measurements) {
  const lcpOk = measurement.lcp_ms <= quality.lcp_budget_ms;
  const clsOk = measurement.cls <= quality.cls_budget;
  const accessibilityOk = measurement.accessibility_score >= quality.minimum_accessibility_score;
  failed ||= !lcpOk || !clsOk || !accessibilityOk;
  process.stdout.write(
    `  ${measurement.path}\n` +
      `    LCP ${measurement.lcp_ms.toFixed(0)}/${quality.lcp_budget_ms} ms ` +
      `${lcpOk ? 'OK' : 'VUOT'}\n` +
      `    CLS ${measurement.cls.toFixed(3)}/${quality.cls_budget.toFixed(3)} ` +
      `${clsOk ? 'OK' : 'VUOT'}\n` +
      `    Performance ${(measurement.performance_score * 100).toFixed(0)}/100\n` +
      `    Accessibility ${(measurement.accessibility_score * 100).toFixed(0)}/100 ` +
      `${accessibilityOk ? 'OK' : 'VUOT'}\n` +
      measurement.accessibility_failures
        .map(
          (failure) =>
            `      - ${failure.id}: ${failure.title}\n` +
            failure.nodes.map((node) => `        ${node}\n`).join(''),
        )
        .join(''),
  );
}

const report = {
  measured_at: new Date().toISOString(),
  base_url: baseUrl.toString(),
  budgets: {
    lcp_ms: quality.lcp_budget_ms,
    cls: quality.cls_budget,
    accessibility_score: quality.minimum_accessibility_score,
  },
  measurements,
};
if (options.output !== undefined) {
  const output = resolve(ROOT, options.output);
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`\nDa ghi ${output}\n`);
}
process.stdout.write(`\nW8 web vitals: ${failed ? 'KHONG DAT' : 'DAT'}\n`);
if (failed) process.exitCode = 1;

function parseOptions(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--base') parsed.base = args[++index];
    else if (argument === '--config') parsed.config = args[++index];
    else if (argument === '--chrome-path') parsed.chromePath = args[++index];
    else if (argument === '--output') parsed.output = args[++index];
    else throw new Error(`Tuy chon khong hop le: ${argument}`);
  }
  return parsed;
}
