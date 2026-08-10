#!/usr/bin/env node
/* global window, document, HTMLElement, HTMLAnchorElement, Node */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const options = parseOptions(process.argv.slice(2));
const baseUrl = new URL(options.base ?? 'http://localhost:3000');
const quality = JSON.parse(
  readFileSync(resolve(ROOT, options.config ?? 'frontend/web-quality.config.json'), 'utf8'),
);
const temporaryRoot = join(ROOT, '.tmp');
mkdirSync(temporaryRoot, { recursive: true });
const chromeProfile = mkdtempSync(join(temporaryRoot, 'w8-responsive-'));
const chrome = await launch({
  chromePath: options.chromePath,
  userDataDir: chromeProfile,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
const results = [];
const failures = [];

try {
  const page = await browser.newPage();
  for (const viewport of quality.viewports) {
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
    });
    for (const path of quality.metric_paths) {
      await page.goto(new URL(path, baseUrl).toString(), {
        waitUntil: 'networkidle2',
        timeout: 30_000,
      });
      const dimensions = await page.evaluate(() => ({
        windowWidth: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        h1: document.querySelectorAll('h1').length,
      }));
      const overflow = Math.max(dimensions.document, dimensions.body) - dimensions.windowWidth;
      const ok = overflow <= 1 && dimensions.h1 === 1;
      results.push({
        viewport: viewport.name,
        width: viewport.width,
        path,
        overflow,
        ...dimensions,
        ok,
      });
      if (!ok)
        failures.push(`${viewport.name} ${path}: overflow ${overflow}px, h1 ${dimensions.h1}`);
    }
  }

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(baseUrl.toString(), { waitUntil: 'networkidle2', timeout: 30_000 });
  await page.click('[data-mobile-menu-trigger]');
  await page.waitForSelector('[data-mobile-menu-panel]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-mobile-menu-panel]', { hidden: true });
  const mobileMenuOk = await page.evaluate(() => {
    const trigger = document.querySelector('[data-mobile-menu-trigger]');
    return trigger?.getAttribute('aria-expanded') === 'false' && document.activeElement === trigger;
  });
  results.push({ check: 'mobile-menu-escape-focus', ok: mobileMenuOk });
  if (!mobileMenuOk) failures.push('menu mobile khong dong va tra focus khi bam Escape');

  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  await page.goto(baseUrl.toString(), { waitUntil: 'networkidle2', timeout: 30_000 });
  const expectedHeaderFocus = await page.evaluate(() => {
    const signature = (element) => {
      const label = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
      const href = element instanceof HTMLAnchorElement ? (element.getAttribute('href') ?? '') : '';
      return `${element.tagName.toLowerCase()}|${label}|${href}`;
    };
    return [...document.querySelectorAll('header a, header button, header summary')]
      .filter(
        (element) =>
          element.getClientRects().length > 0 && element.closest('details:not([open])') === null,
      )
      .map(signature);
  });
  await page.evaluate(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null,
  );
  const visitedHeaderFocus = [];
  for (let index = 0; index < 40; index += 1) {
    await page.keyboard.press('Tab');
    const state = await page.evaluate(() => {
      const element = document.activeElement;
      const label =
        element instanceof HTMLElement
          ? (element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '')
          : '';
      const href = element instanceof HTMLAnchorElement ? (element.getAttribute('href') ?? '') : '';
      return {
        signature:
          element instanceof HTMLElement ? `${element.tagName.toLowerCase()}|${label}|${href}` : '',
        enteredMain: element instanceof Node && document.querySelector('main')?.contains(element),
      };
    });
    if (state.enteredMain) break;
    if (state.signature !== '') visitedHeaderFocus.push(state.signature);
  }
  const topLevelKeyboardOk = expectedHeaderFocus.every((signature) =>
    visitedHeaderFocus.includes(signature),
  );
  await page.evaluate(() => document.querySelector('header summary')?.focus());
  await page.keyboard.press('Enter');
  await page.waitForSelector('header details[open]');
  const expectedMegaFocus = await page.evaluate(() =>
    [...document.querySelectorAll('header details[open] a')].map((element) => {
      const label = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
      const href = element instanceof HTMLAnchorElement ? (element.getAttribute('href') ?? '') : '';
      return `${element.tagName.toLowerCase()}|${label}|${href}`;
    }),
  );
  const visitedMegaFocus = [];
  for (let index = 0; index < expectedMegaFocus.length; index += 1) {
    await page.keyboard.press('Tab');
    visitedMegaFocus.push(
      await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement)) return '';
        const label = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
        const href =
          element instanceof HTMLAnchorElement ? (element.getAttribute('href') ?? '') : '';
        return `${element.tagName.toLowerCase()}|${label}|${href}`;
      }),
    );
  }
  const megaKeyboardOk = expectedMegaFocus.every((signature) =>
    visitedMegaFocus.includes(signature),
  );
  const keyboardMenuOk = topLevelKeyboardOk && megaKeyboardOk;
  results.push({
    check: 'desktop-header-keyboard',
    expected_top_level: expectedHeaderFocus,
    visited_top_level: [...new Set(visitedHeaderFocus)],
    expected_mega_menu: expectedMegaFocus,
    visited_mega_menu: [...new Set(visitedMegaFocus)],
    ok: keyboardMenuOk,
  });
  if (!keyboardMenuOk) failures.push('khong Tab duoc qua toan bo menu desktop');

  await page.goto(
    new URL('/products/isl-optidist-2-automatic-distillation-analyzer', baseUrl).toString(),
    { waitUntil: 'networkidle2', timeout: 30_000 },
  );
  const trigger = await firstVisible(page, '[data-inquiry-trigger]');
  if (trigger === null) {
    failures.push('khong tim thay nut mo modal bao gia');
    results.push({ check: 'modal-focus-trap-return', ok: false });
  } else {
    await trigger.click();
    await page.waitForSelector('dialog[open]');
    let modalFocusOk = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      return dialog !== null && dialog.contains(document.activeElement);
    });
    for (let index = 0; index < 16; index += 1) {
      await page.keyboard.press('Tab');
      modalFocusOk &&= await page.evaluate(() => {
        const dialog = document.querySelector('dialog[open]');
        return dialog !== null && dialog.contains(document.activeElement);
      });
    }
    await page.keyboard.press('Escape');
    await page.waitForSelector('dialog[open]', { hidden: true });
    const returned = await page.evaluate(
      () => document.activeElement?.hasAttribute('data-inquiry-trigger') === true,
    );
    const modalOk = modalFocusOk && returned;
    results.push({
      check: 'modal-focus-trap-return',
      trapped: modalFocusOk,
      returned,
      ok: modalOk,
    });
    if (!modalOk) failures.push('modal khong giu focus hoac khong tra focus ve CTA');
  }
  await page.close();
} finally {
  browser.disconnect();
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

for (const result of results) {
  if ('path' in result) {
    process.stdout.write(
      `  ${result.ok ? 'ok  ' : 'FAIL'} ${result.viewport.padEnd(7)} ${result.path} ` +
        `(overflow ${result.overflow}px)\n`,
    );
  } else {
    process.stdout.write(`  ${result.ok ? 'ok  ' : 'FAIL'} ${result.check}\n`);
  }
}
if (options.output !== undefined) {
  const output = resolve(ROOT, options.output);
  writeFileSync(
    output,
    `${JSON.stringify({ measured_at: new Date().toISOString(), base_url: baseUrl, results }, null, 2)}\n`,
  );
  process.stdout.write(`\nDa ghi ${output}\n`);
}
process.stdout.write(
  `\nW8 responsive: ${results.filter((result) => result.ok).length}/${results.length} phep kiem dat\n`,
);
for (const failure of failures) process.stderr.write(`  - ${failure}\n`);
if (failures.length > 0) process.exitCode = 1;

async function firstVisible(page, selector) {
  for (const element of await page.$$(selector)) {
    const visible = await element.evaluate((node) => node.getClientRects().length > 0);
    if (visible) return element;
    await element.dispose();
  }
  return null;
}

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
