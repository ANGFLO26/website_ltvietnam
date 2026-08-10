#!/usr/bin/env node
/**
 * Xoa output co the tai tao ma khong cham vao dependency, .env hay du lieu local.
 * Dung cac duong dan co dinh de `pnpm clean` khong the mo rong pham vi ngoai y muon.
 */
import { existsSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  '.tmp',
  'backend/dist',
  'frontend/.next',
  'frontend/next-env.d.ts',
  'frontend/tsconfig.tsbuildinfo',
  'worker/dist',
  'packages/config/dist',
  'packages/contracts/dist',
  'packages/db/dist',
  'packages/testing/dist',
];

for (const target of targets) {
  const absolute = resolve(join(root, target));
  const insideRoot = relative(root, absolute);
  if (insideRoot.startsWith('..') || insideRoot === '') {
    throw new Error(`Tu choi xoa duong dan ngoai workspace: ${target}`);
  }
  if (!existsSync(absolute)) continue;
  try {
    rmSync(absolute, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Khong the xoa ${target}. Hay dung cac dev server/worker dang chay roi thu lai. ${reason}`,
    );
  }
  console.log(`  removed ${target}`);
}

console.log('Generated artifacts are clean.');
