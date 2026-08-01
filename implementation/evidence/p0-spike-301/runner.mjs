import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { createServer } from 'node:http';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Goi HTTP tho, KHONG tu dong theo redirect, do thoi diem nhan header. */
function fetchRaw(port, path, { host = '127.0.0.1', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const req = request({ host, port, path, method: 'GET', headers }, (res) => {
      const tHeaders = Date.now();
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          msToHeaders: tHeaders - t0,
          msTotal: Date.now() - t0,
        }),
      );
    });
    req.on('error', (e) => resolve({ status: 0, headers: {}, body: '', error: e.code ?? e.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ status: 0, headers: {}, body: '', error: 'CLIENT_TIMEOUT' }); });
    req.end();
  });
}

/** Reverse proxy toi thieu, dong vai Nginx. Khong tu doi status. */
function startProxy(fromPort, toPort) {
  const srv = createServer((cReq, cRes) => {
    const p = request(
      { host: '127.0.0.1', port: toPort, path: cReq.url, method: cReq.method,
        headers: { ...cReq.headers, 'x-forwarded-proto': 'https', 'x-forwarded-host': 'www.ltvietnam.com.vn' } },
      (pRes) => { cRes.writeHead(pRes.statusCode, pRes.headers); pRes.pipe(cRes); },
    );
    p.on('error', () => { cRes.writeHead(502); cRes.end(); });
    cReq.pipe(p);
  });
  return new Promise((res) => srv.listen(fromPort, () => res(srv)));
}

const ctl = (mode) => fetchRaw(4001, `/__control?mode=${mode}`);

async function waitUp(port, path = '/', tries = 60) {
  for (let i = 0; i < tries; i++) {
    const r = await fetchRaw(port, path);
    if (r.status > 0) return true;
    await sleep(500);
  }
  return false;
}

export { fetchRaw, startProxy, ctl, waitUp, sleep, spawn };
