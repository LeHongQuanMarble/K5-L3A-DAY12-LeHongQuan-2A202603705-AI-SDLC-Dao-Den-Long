// Quay video demo (dưới 5 phút) từ Chrome thật: chơi trực tiếp, cảnh bench, và slide bằng chứng.
// Chạy: node scripts/record-demo.mjs  -> docs/demo/demo.mp4 (cần google-chrome và ffmpeg).
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, server } from './serve.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'demo', 'demo.mp4');
const PORT = 8920;
const DBG = 9720;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frameDir = mkdtempSync(join(tmpdir(), 'demo-frames-'));
const frames = []; // { file, t }

function slidesHtml() {
  const bench = JSON.parse(readFileSync(join(ROOT, 'docs/proof/phase-4/bench.json'), 'utf8'));
  const benchOff = JSON.parse(readFileSync(join(ROOT, 'docs/proof/phase-4/bench-vsync-off.json'), 'utf8'));
  const soak = JSON.parse(readFileSync(join(ROOT, 'docs/proof/phase-4/soak.json'), 'utf8'));
  const e2e = JSON.parse(readFileSync(join(ROOT, 'docs/proof/phase-4/e2e/e2e.json'), 'utf8'));
  const tests = readFileSync(join(ROOT, 'docs/proof/phase-4/test-output.txt'), 'utf8').match(/ℹ pass (\d+)/)?.[1] ?? '?';
  const lines = [
    ['Đảo Đèn Lồng · bằng chứng', ''],
    ['Test tự động (node:test)', `${tests} test đạt`],
    ['Headless tất định (Phase 3)', 'Chạy hai lần, cùng sha256; xem docs/proof/phase-3/evidence.md'],
    ['E2E trên Chrome thật', `${e2e.passed}/${e2e.total} kiểm tra đạt (menu, cài đặt, nhập tên, tải lại)`],
    ['Bench 30 s, cảnh chuẩn (vsync bật)', `avg ${bench.avg_fps} fps · p1 ${bench.p1_low_fps} fps · p95 ${bench.frame_ms_p95} ms`],
    ['Bench vsync tắt (yêu cầu ticket)', `p1 ${benchOff.p1_low_fps} fps: chưa đạt; driver iGPU dừng định kỳ`],
    ['Soak 10 Đêm headless (--jitless)', `crash ${soak.crashes} · ${soak.results.length} kết quả · RSS ${soak.mem_start_mb} → ${soak.mem_end_mb} MB`],
    ['Ghi chú trung thực', 'Chi tiết và cách đo: docs/notes/phase-4-eval.md'],
  ];
  const body = lines.map(([a, b]) => `<div class="l"><div class="t">${a}</div><div class="v">${b}</div></div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;height:100%;background:#0e1430;color:#f5f1e6;font-family:system-ui,sans-serif;overflow:hidden}
  .wrap{padding:28px 64px}.l{margin:10px 0}.t{color:#f2c14e;font-size:30px;font-weight:700}.v{font-size:24px;margin-top:4px}
  </style></head><body><div class="wrap">${body}</div></body></html>`;
}

async function main() {
  await new Promise((r) => startServer(PORT, r));
  const profile = mkdtempSync(join(tmpdir(), 'demo-chrome-'));
  const chrome = spawn(process.env.CHROME ?? 'google-chrome', [
    '--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`,
    '--window-size=1280,720', '--no-first-run', '--no-default-browser-check',
    '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=vulkan', 'about:blank',
  ], { stdio: 'ignore' });
  let ws;
  let id = 0;
  const pend = new Map();
  let recording = true;
  let send = async () => ({});
  try {
    let target;
    for (let i = 0; i < 60 && !target; i++) {
      try { target = await (await fetch(`http://127.0.0.1:${DBG}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { await sleep(250); }
    }
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.method === 'Page.screencastFrame') {
        const file = join(frameDir, `f${String(frames.length).padStart(6, '0')}.jpg`);
        writeFileSync(file, Buffer.from(d.params.data, 'base64'));
        frames.push({ file, t: d.params.metadata.timestamp });
        if (recording) ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId: d.params.sessionId } }));
      }
      if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
    };
    send = (method, params = {}) => new Promise((r) => { id += 1; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
    const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
    const key = async (code, keyName, hold = 0) => {
      const base = { code, key: keyName };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
      await sleep(hold);
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      await sleep(150);
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1280, maxHeight: 720, everyNthFrame: 1 });

    // 1) Chơi trực tiếp: menu → giới thiệu → chơi.
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/web/?seed=7` });
    await sleep(9000);
    await js(`document.getElementById('menu-play').click()`);
    await sleep(3500);
    await key('Enter', 'Enter');
    await sleep(1500);
    await key('KeyW', 'w', 2200);
    await key('KeyD', 'd', 1200);
    await key('Space', ' ', 80);
    await sleep(900);
    await key('ShiftLeft', 'Shift', 80);
    await sleep(1000);
    await key('KeyF', 'f', 80);
    await sleep(2500);
    await key('KeyS', 's', 1500);
    await key('KeyA', 'a', 1800);
    await key('KeyE', 'e', 300);
    await sleep(2500);
    await key('Escape', 'Escape', 80);
    await sleep(3000);
    await key('Escape', 'Escape', 80);
    await sleep(2000);

    // 2) Cảnh benchmark (đúng cảnh chuẩn, 20 s đo).
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/web/?bench=1&seed=42&duration=20` });
    await sleep(26000);

    // 3) Slide bằng chứng.
    await send('Page.navigate', { url: `data:text/html;base64,${Buffer.from(slidesHtml()).toString('base64')}` });
    await sleep(12000);
    // Khung cuối: screencast chỉ gửi khi màn hình đổi, nên chụp một khung ở thời điểm kết thúc
    // để đoạn tĩnh cuối giữ đúng thời lượng.
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    const file = join(frameDir, `f${String(frames.length).padStart(6, '0')}.jpg`);
    writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
    frames.push({ file, t: Date.now() / 1000 });
  } finally {
    recording = false;
    await send('Page.stopScreencast').catch(() => {});
    try { ws?.close(); } catch { /* bỏ qua */ }
    chrome.kill('SIGKILL');
    server.close();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* bỏ qua */ }
  }

  // Ghép khung theo thời gian thực: mỗi khung giữ đến khung kế tiếp.
  if (frames.length < 2) throw new Error('không thu được khung hình nào');
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1]?.t ?? frames[i].t + 0.5;
    const d = Math.max(0.02, Math.min(60, next - frames[i].t)); // giữ đúng thời lượng đoạn tĩnh (không cắt ngắn)
    lines.push(`file '${frames[i].file}'`, `duration ${d.toFixed(3)}`);
  }
  lines.push(`file '${frames.at(-1).file}'`);
  const list = join(frameDir, 'list.txt');
  writeFileSync(list, lines.join('\n') + '\n');
  mkdirSync(dirname(OUT), { recursive: true });
  const r = spawnSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,scale=1280:720', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr.slice(-800));
  rmSync(frameDir, { recursive: true, force: true });
  const dur = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT], { encoding: 'utf8' }).stdout.trim();
  process.stdout.write(`wrote ${OUT}: ${Number(dur).toFixed(1)} s, ${(readFileSync(OUT).length / 1048576).toFixed(1)} MB\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`record failed: ${e.stack ?? e.message}\n`); process.exit(1); });
