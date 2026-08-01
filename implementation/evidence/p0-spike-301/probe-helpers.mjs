import { spawn } from 'node:child_process';
import { fetchRaw, waitUp, sleep } from './runner.mjs';

const resolver = spawn('node', ['resolver.mjs'], { stdio: 'ignore' });
const next = spawn('node', ['node_modules/next/dist/bin/next', 'start', '-p', '4000'],
  { stdio: 'ignore', env: { ...process.env, NODE_ENV: 'production' } });
await sleep(1000);
if (!(await waitUp(4000))) { console.log('Next khong khoi dong duoc'); process.exit(1); }

const rows = [];
for (const [name, path] of [
  ['redirect() cua App Router', '/helper/redirect-helper'],
  ['permanentRedirect() cua App Router', '/helper/permanent-helper'],
  ['middleware NextResponse.redirect(301)', '/old-product'],
]) {
  const r = await fetchRaw(4000, path);
  rows.push({ name, path, status: r.status, location: r.headers.location ?? '-', bodyLen: r.body.length,
              hasHtml: /<html|SPIKE_/i.test(r.body) });
}
console.log(JSON.stringify(rows, null, 2));
resolver.kill(); next.kill();
