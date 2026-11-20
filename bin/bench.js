#!/usr/bin/env node
// Chế độ benchmark (Ticket-04 mục 1). Mở web/ trong Chrome headless (cảnh bench, xem web/main.js ?bench=1),
// thu thời gian khung hình, tính chỉ số theo công thức của ticket và ghi JSON.
//   node --expose-gc bin/bench.js --seed 42 --duration 30 --out bench.json
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir, cpus, totalmem, release, type, arch } from 'node:os';
import { join } from 'node:path';
import { server, startServer } from '../scripts/serve.js';
import { benchStats, meetsTargets } from '../src/benchstats.js';

const args = process.argv.slice(2);
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const seed = Number(val('--seed', '42'));
const duration = Number(val('--duration', '30'));
const out = val('--out', 'bench.json');
const PORT = Number(val('--port', '8765'));
const DEBUG_PORT = 9333 + (process.pid % 500);
const CHROME = process.env.CHROME ?? 'google-chrome';
const VSYNC_ON = val('--vsync', '0') === '1'; // mặc định tắt vsync theo ticket; --vsync 1 để đo tham khảo
const T0 = Date.now(); // gần đúng lúc tiến trình bắt đầu, dùng cho load_ms

if (!Number.isInteger(seed) || !(duration > 0)) {
  process.stderr.write('usage: node bin/bench.js --seed <int> --duration <s> --out <file>\n');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeoutMs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try { const v = await fn(); if (v) return v; } catch { /* chưa sẵn sàng */ }
    await sleep(250);
  }
  throw new Error('timeout');
}

// RSS đỉnh của mọi tiến trình Chrome dùng thư mục hồ sơ riêng (KB -> MB).
function chromeRssMb(profile) {
  try {
    const txt = execFileSync('ps', ['-eo', 'rss=,args='], { encoding: 'utf8' });
    let kb = 0;
    for (const line of txt.split('\n')) if (line.includes(profile)) kb += Number(line.trim().split(/\s+/)[0]) || 0;
    return kb / 1024;
  } catch { return null; }
}

async function main() {
  await new Promise((r) => startServer(PORT, r));
  const profile = mkdtempSync(join(tmpdir(), 'dden-bench-'));
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--window-size=1280,720', '--no-first-run', '--no-default-browser-check',
    ...(VSYNC_ON ? [] : ['--disable-gpu-vsync', '--disable-frame-rate-limit']), ...(process.env.BENCH_GPU === '0' ? ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] : ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-gl=angle', '--use-angle=vulkan']),
    'about:blank',
  ], { stdio: 'ignore' });

  let peak = 0;
  const sampler = setInterval(() => {
    const mb = chromeRssMb(profile);
    if (mb !== null && mb > peak) peak = mb;
  }, 250);

  try {
    const version = await waitFor(() => fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then((r) => r.json()), 20000);
    void version;
    const target = await waitFor(() => fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json()), 10000);
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    };
    const send = (method, params = {}) => new Promise((res) => {
      id += 1;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params }));
    });
    await send('Page.enable');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/web/?bench=1&seed=${seed}&duration=${duration}` });

    const evalJs = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      return r.result?.result?.value;
    };
    const result = await waitFor(async () => {
      const s = await evalJs('window.__bench && window.__bench.done ? JSON.stringify(window.__bench) : null');
      return s ? JSON.parse(s) : null;
    }, (duration + 120) * 1000);

    const stats = benchStats(result.dts);
    const load_ms = result.firstFrameEpoch - T0;
    const out_obj = {
      contract_version: '1.3',
      avg_fps: stats.avg_fps,
      p1_low_fps: stats.p1_low_fps,
      frame_ms_p95: stats.frame_ms_p95,
      frames: stats.frames,
      load_ms,
      peak_mem_mb: peak > 0 ? Math.round(peak) : null,
      vsync_off: !VSYNC_ON,
      renderer: result.renderer,
      os: `${type()} ${release()} ${arch()}; ${cpus()[0]?.model ?? 'cpu'} x${cpus().length}; RAM ${Math.round(totalmem() / 1048576)} MB`,
      targets_met: meetsTargets({ ...stats, load_ms }),
    };
    writeFileSync(out, JSON.stringify(out_obj, null, 2) + '\n');
    process.stdout.write(JSON.stringify(out_obj, null, 2) + '\n');
    ws.close();
  } finally {
    clearInterval(sampler);
    chrome.kill('SIGKILL');
    server.close();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* bỏ qua */ }
  }
}

main().then(() => process.exit(0), (e) => { process.stderr.write(`bench failed: ${e.stack ?? e.message}\n`); process.exit(1); });
