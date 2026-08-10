#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const options = parseOptions(process.argv.slice(2));
const buildDir = resolve(ROOT, options.buildDir ?? 'frontend/.next');
const quality = JSON.parse(
  readFileSync(resolve(ROOT, options.config ?? 'frontend/web-quality.config.json'), 'utf8'),
);
const manifest = JSON.parse(readFileSync(join(buildDir, 'app-build-manifest.json'), 'utf8'));

const routes = Object.entries(manifest.pages)
  .filter(([entry]) => entry === '/page' || (entry.endsWith('/page') && !entry.startsWith('/_')))
  .map(([entry, files]) => measureRoute(entry, files, buildDir))
  .sort((left, right) => right.gzipBytes - left.gzipBytes);

const failures = [];
if (routes.length < quality.minimum_route_count) {
  failures.push(
    `chi tim thay ${routes.length} route build, can it nhat ${quality.minimum_route_count}`,
  );
}
for (const route of routes) {
  if (route.gzipKib > quality.javascript_budget_kib) {
    failures.push(
      `${route.route}: ${route.gzipKib.toFixed(1)} KiB > ${quality.javascript_budget_kib} KiB`,
    );
  }
}

for (const route of [...routes].sort((left, right) => left.route.localeCompare(right.route))) {
  process.stdout.write(`  ${route.gzipKib.toFixed(1).padStart(5)} KiB  ${route.route}\n`);
}
const largest = routes[0];
process.stdout.write(
  `\nW8 JS budget: ${routes.length} route, lon nhat ${largest?.route ?? '-'} ` +
    `${largest?.gzipKib.toFixed(1) ?? '0.0'}/${quality.javascript_budget_kib} KiB gzip\n`,
);

if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`  - ${failure}\n`);
  process.exitCode = 1;
}

function measureRoute(entry, files, buildDir) {
  const javascript = [...new Set(files.filter((file) => file.endsWith('.js')))];
  const gzipBytes = javascript.reduce((total, file) => {
    const path = join(buildDir, file);
    statSync(path);
    return total + gzipSync(readFileSync(path), { level: 9 }).byteLength;
  }, 0);
  return {
    route: entry === '/page' ? '/' : entry.slice(0, -'/page'.length),
    gzipBytes,
    gzipKib: gzipBytes / 1024,
  };
}

function parseOptions(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--build-dir') parsed.buildDir = args[++index];
    else if (argument === '--config') parsed.config = args[++index];
    else throw new Error(`Tuy chon khong hop le: ${argument}`);
  }
  return parsed;
}
