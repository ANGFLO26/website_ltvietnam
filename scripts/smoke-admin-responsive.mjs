#!/usr/bin/env node
/* global document, window, location, HTMLElement */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const options = parseOptions(process.argv.slice(2));
const baseUrl = new URL(options.base ?? 'http://localhost:3002');
const quality = JSON.parse(
  readFileSync(resolve(ROOT, options.config ?? 'admin/admin-quality.config.json'), 'utf8'),
);
const email = options.email ?? process.env.ADMIN_SMOKE_EMAIL;
const password = options.password ?? process.env.ADMIN_SMOKE_PASSWORD;
if (!email || !password) throw new Error('Thieu ADMIN_SMOKE_EMAIL/ADMIN_SMOKE_PASSWORD.');

const temporaryRoot = join(ROOT, '.tmp');
mkdirSync(temporaryRoot, { recursive: true });
const chromeProfile = mkdtempSync(join(temporaryRoot, 'a5-responsive-'));
const chrome = await launch({
  chromePath: options.chromePath,
  userDataDir: chromeProfile,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
const results = [];
const failures = [];
const consoleErrors = [];
const failedResponses = [];

try {
  const page = await browser.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location();
      consoleErrors.push({ text: message.text(), url: location.url || null });
    }
  });
  page.on('pageerror', (error) => consoleErrors.push({ text: error.message, url: page.url() }));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResponses.push({ status: response.status(), url: response.url() });
    }
  });

  await page.goto(new URL('/dashboard', baseUrl).toString(), {
    waitUntil: 'networkidle2',
    timeout: 30_000,
  });
  const gateUrl = new URL(page.url());
  const gateOk = gateUrl.pathname === '/login' && gateUrl.searchParams.get('next') === '/dashboard';
  record('protected-route-auth-gate', gateOk);

  await page.type('input[name="email"]', email);
  await page.type('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === '/dashboard', { timeout: 30_000 });
  record('authenticated-login', true);

  if (options.diagnose) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 3000));
  } else {
    const journeys = await runJourneys(page);
    results.push(...journeys.map((journey) => ({ ...journey, ok: true })));

    for (const viewport of quality.viewports) {
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
      });
      for (const path of quality.responsive_paths) {
        await page.goto(new URL(path, baseUrl).toString(), {
          waitUntil: 'networkidle2',
          timeout: 30_000,
        });
        const state = await page.evaluate(() => {
          const tableCells = [...document.querySelectorAll('.data-table td')];
          return {
            pathname: location.pathname,
            overflow:
              Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
              window.innerWidth,
            h1: document.querySelectorAll('h1').length,
            tableCells: tableCells.length,
            labelledCells: tableCells.filter((cell) => cell.hasAttribute('data-label')).length,
          };
        });
        const cardOk =
          viewport.width > 760 ||
          state.tableCells === 0 ||
          state.tableCells === state.labelledCells;
        const ok = state.pathname !== '/login' && state.overflow <= 1 && state.h1 === 1 && cardOk;
        results.push({ viewport: viewport.name, path, ...state, cardOk, ok });
        if (!ok) {
          failures.push(
            `${viewport.name} ${path}: route=${state.pathname}, overflow=${state.overflow}, h1=${state.h1}, card=${cardOk}`,
          );
        }
      }
    }

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(new URL('/dashboard', baseUrl).toString(), {
      waitUntil: 'networkidle2',
      timeout: 30_000,
    });
    const menuTrigger = 'button[aria-label="Mở điều hướng"]';
    await page.click(menuTrigger);
    await page.waitForSelector('.mobile-drawer__panel[role="dialog"][aria-modal="true"]');
    let focusTrapped = true;
    for (let index = 0; index < 30; index += 1) {
      await page.keyboard.press('Tab');
      focusTrapped &&= await page.evaluate(
        () =>
          document.querySelector('.mobile-drawer__panel')?.contains(document.activeElement) ===
          true,
      );
    }
    await page.keyboard.press('Escape');
    await page.waitForSelector('.mobile-drawer__panel', { hidden: true });
    const focusReturned = await page.evaluate(
      (selector) => document.activeElement === document.querySelector(selector),
      menuTrigger,
    );
    record('mobile-menu-focus-trap-return', focusTrapped && focusReturned);

    await page.goto(new URL('/products/new', baseUrl).toString(), {
      waitUntil: 'networkidle2',
      timeout: 30_000,
    });
    await page.type('input[name="name"]', 'Thay đổi chưa lưu');
    let confirmSeen = false;
    page.once('dialog', async (dialog) => {
      confirmSeen = true;
      await dialog.dismiss();
    });
    await page.evaluate(() => {
      const link = [...document.querySelectorAll('a')].find(
        (item) => item.getAttribute('href') === '/products',
      );
      if (!(link instanceof HTMLElement)) throw new Error('Khong tim thay link products.');
      link.click();
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    record(
      'dirty-form-navigation-guard',
      confirmSeen && new URL(page.url()).pathname === '/products/new',
    );

    await page.deleteCookie(...(await page.cookies()));
    page.once('dialog', async (dialog) => dialog.accept());
    await page.goto(new URL('/dashboard', baseUrl).toString(), {
      waitUntil: 'networkidle2',
      timeout: 30_000,
    });
    record('session-expired-protected-gate', new URL(page.url()).pathname === '/login');
  }
  await page.close();
} finally {
  browser.disconnect();
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

if (consoleErrors.length > 0) failures.push(`${consoleErrors.length} console/page error`);
for (const result of results) {
  if ('path' in result) {
    process.stdout.write(
      `  ${result.ok ? 'ok  ' : 'FAIL'} ${result.viewport.padEnd(7)} ${result.path} (overflow ${result.overflow}px)\n`,
    );
  } else {
    process.stdout.write(`  ${result.ok ? 'ok  ' : 'FAIL'} ${result.check}\n`);
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
        results,
        console_errors: consoleErrors,
        failed_responses: failedResponses,
      },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(`\nDa ghi ${output}\n`);
}
process.stdout.write(
  `\nA5 responsive/E2E: ${results.filter((result) => result.ok).length}/${results.length} dat; console error ${consoleErrors.length}\n`,
);
for (const failure of failures) process.stderr.write(`  - ${failure}\n`);
if (failures.length > 0) process.exitCode = 1;

async function runJourneys(page) {
  const journeys = [];
  const tag = Date.now();

  await page.goto(new URL('/products/new', baseUrl).toString(), {
    waitUntil: 'networkidle2',
    timeout: 30_000,
  });
  const productName = `A5 E2E Product ${tag}`;
  await page.type('input[name="name"]', productName);
  await page.click('input[name="slug"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await page.type('input[name="slug"]', `a5-e2e-product-${tag}`);
  for (const name of ['brand_id', 'category_id']) {
    const value = await page.$eval(`select[name="${name}"]`, (select) => {
      const option = [...select.querySelectorAll('option')].find((item) => item.value !== '');
      return option?.value ?? '';
    });
    if (!value) throw new Error(`Khong co option ${name}; hay chay db:seed:demo.`);
    await page.select(`select[name="${name}"]`, value);
  }
  await page.click('form button[type="submit"]');
  await page.waitForFunction(() => /^\/products\/[0-9a-f-]{36}$/.test(location.pathname), {
    timeout: 30_000,
  });
  journeys.push({ check: 'e2e-product-create', pathname: new URL(page.url()).pathname });

  await page.goto(new URL('/content/pages/new', baseUrl).toString(), {
    waitUntil: 'networkidle2',
    timeout: 30_000,
  });
  await page.click('form button[type="submit"]');
  await page.waitForFunction(() => /^\/content\/pages\/[0-9a-f-]{36}$/.test(location.pathname), {
    timeout: 30_000,
  });
  journeys.push({ check: 'e2e-content-create', pathname: new URL(page.url()).pathname });

  await page.goto(new URL('/inquiries', baseUrl).toString(), {
    waitUntil: 'networkidle2',
    timeout: 30_000,
  });
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('a')].some((link) =>
        link.textContent?.includes('A5 E2E Inquiry'),
      ),
    { timeout: 30_000 },
  );
  const inquiryHref = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((item) =>
      item.textContent?.includes('A5 E2E Inquiry'),
    );
    if (!link || link.tagName !== 'A') throw new Error('Khong tim thay inquiry E2E.');
    return link.href;
  });
  await page.goto(inquiryHref, { waitUntil: 'networkidle2', timeout: 30_000 });
  await page.waitForFunction(() => /^\/inquiries\/[0-9a-f-]{36}$/.test(location.pathname), {
    timeout: 30_000,
  });
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Đánh dấu đã xử lý'),
    );
    if (!(button instanceof HTMLElement)) throw new Error('Khong tim thay nut xu ly inquiry.');
    button.click();
  });
  await page.waitForFunction(
    () => document.body.textContent?.includes('Đã đánh dấu yêu cầu là đã xử lý.'),
    { timeout: 30_000 },
  );
  journeys.push({ check: 'e2e-inquiry-handled', pathname: new URL(page.url()).pathname });
  return journeys;
}

function record(check, ok) {
  results.push({ check, ok });
  if (!ok) failures.push(check);
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
    else if (argument === '--diagnose-dashboard') parsed.diagnose = true;
    else throw new Error(`Tuy chon khong hop le: ${argument}`);
  }
  return parsed;
}
