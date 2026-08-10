#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { taoBoTiem } from './lib/inject-harness.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { tiem, ketLuan } = taoBoTiem({ goc: ROOT, cwd: 'frontend' });
const TEST = 'test/w8-quality.test.tsx';

tiem({
  ten: 'menu mobile dong bang Escape',
  tep: 'frontend/src/components/layout/MobileMenu.tsx',
  tim: "if (event.key !== 'Escape') return;",
  thay: "if (event.key !== 'F2') return;",
  test: TEST,
  phepKiem: 'closes the mobile menu with Escape and returns focus',
});

tiem({
  ten: 'menu mobile cong bo aria-expanded',
  tep: 'frontend/src/components/layout/MobileMenu.tsx',
  tim: 'aria-expanded={open}',
  thay: 'aria-expanded={false}',
  test: TEST,
  phepKiem: 'closes the mobile menu with Escape and returns focus',
});

tiem({
  ten: 'modal tra focus ve nut mo',
  tep: 'frontend/src/components/inquiry/InquiryLauncher.tsx',
  tim: 'requestAnimationFrame(() => triggerRef.current?.focus());',
  thay: 'requestAnimationFrame(() => undefined);',
  test: TEST,
  phepKiem: 'returns focus after the inquiry modal closes',
});

tiem({
  ten: 'modal giu vong Tab ben trong',
  tep: 'frontend/src/components/inquiry/InquiryModal.tsx',
  tim: "if (event.key !== 'Tab') return;",
  thay: "if (event.key !== 'F2') return;",
  test: TEST,
  phepKiem: 'traps Tab focus inside the inquiry modal',
});

tiem({
  ten: 'focus ring du tuong phan',
  tep: 'frontend/src/app/globals.css',
  tim: '--focus-ring: #b45309;',
  thay: '--focus-ring: #f59e0b;',
  test: TEST,
  phepKiem: 'keeps focus contrast and reduced-motion safeguards',
});

tiem({
  ten: 'ton trong reduced motion',
  tep: 'frontend/src/app/globals.css',
  tim: '@media (prefers-reduced-motion: reduce)',
  thay: '@media (prefers-reduced-motion: no-preference)',
  test: TEST,
  phepKiem: 'keeps focus contrast and reduced-motion safeguards',
});

tiem({
  ten: 'anh co AVIF va WebP',
  tep: 'frontend/next.config.mjs',
  tim: "formats: ['image/avif', 'image/webp'],",
  thay: "formats: ['image/webp'],",
  test: TEST,
  phepKiem: 'keeps Next image optimization enabled with AVIF and WebP',
});

tiem({
  ten: 'ngan sach JS khong bi noi rong',
  tep: 'frontend/web-quality.config.json',
  tim: '"javascript_budget_kib": 150,',
  thay: '"javascript_budget_kib": 151,',
  test: TEST,
  phepKiem: 'keeps measurable W8 quality budgets and four required viewports',
});

process.exitCode = ketLuan('W8 frontend');
