// Kiểm thử E2E trên Chrome thật qua DevTools (npm run e2e). Không nằm trong npm test vì cần trình duyệt.
// Kiểm tra: menu, màn giới thiệu, đổi phím (báo trùng), bắt đầu bằng Enter, kết thúc đêm và nhập tên,
// lưu bảng xếp hạng sau khi tải lại, không có lỗi JavaScript. Ghi ảnh chụp và kết quả vào docs/proof/phase-4/e2e/.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer, server } from '../../scripts/serve.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'docs', 'proof', 'phase-4', 'e2e');
mkdirSync(OUT, { recursive: true });
const PORT = 8790 + Math.floor(Math.random() * 100);
const DBG = 9600 + Math.floor(Math.random() * 300);
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await new Promise((r) => startServer(PORT, r));
  const profile = mkdtempSync(join(tmpdir(), 'e2e-'));
  const chrome = spawn(process.env.CHROME ?? 'google-chrome', [
    '--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`,
    '--window-size=1280,720', '--no-first-run', '--no-default-browser-check',
    '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', 'about:blank',
  ], { stdio: 'ignore' });
  const errors = [];
  let ws;
  try {
    let target;
    for (let i = 0; i < 60 && !target; i++) {
      try { target = await (await fetch(`http://127.0.0.1:${DBG}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { await sleep(250); }
    }
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    let id = 0;
    const pend = new Map();
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text);
      if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value ?? a.description).join(' '));
      if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
    };
    const send = (method, params = {}) => new Promise((r) => { id += 1; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
    const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
    const shot = async (name) => {
      const s = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(OUT, `${name}.png`), Buffer.from(s.result.data, 'base64'));
    };
    const key = async (code, keyName = code) => {
      const base = { code, key: keyName, windowsVirtualKeyCode: code === 'Enter' ? 13 : code === 'Space' ? 32 : code === 'Escape' ? 27 : 0 };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      await sleep(120);
    };
    const visible = (id) => js(`!document.getElementById('${id}').hidden`);
    const waitUntil = async (fn, ms = 8000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(150); } return false; };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/web/?test=1&seed=7` });
    await waitUntil(async () => (await js(`typeof window.__ddl`)) === 'object', 30000);
    check('menu shown at start', await visible('menu'));
    await shot('01-menu');

    // Cài đặt: đổi Nhảy sang KeyZ, thử trùng KeyE (Nạp đèn) bị từ chối.
    await js(`document.getElementById('menu-settings').click()`);
    await waitUntil(() => visible('settings'));
    check('settings opens from menu', await visible('settings'));
    await js(`[...document.querySelectorAll('#keys tbody tr')].find(tr => tr.textContent.startsWith('Nhảy')).querySelector('button').click()`);
    await sleep(100);
    await key('KeyE', 'e');
    const conflict = await js(`document.getElementById('key-msg').textContent`);
    check('duplicate key is refused with a message', /Nạp đèn/.test(conflict ?? ''), conflict);
    await js(`[...document.querySelectorAll('#keys tbody tr')].find(tr => tr.textContent.startsWith('Nhảy')).querySelector('button').click()`);
    await sleep(100);
    await key('KeyZ', 'z');
    const jumpLabel = await js(`[...document.querySelectorAll('#keys tbody tr')].find(tr => tr.textContent.startsWith('Nhảy')).querySelector('button').textContent`);
    check('free key is assigned', jumpLabel === 'Z', jumpLabel);
    await js(`document.getElementById('opt-large').click()`);
    const large = await js(`document.documentElement.classList.contains('large')`);
    check('large text toggles', large === true);
    await shot('02-settings');
    await js(`document.getElementById('settings-back').click()`);

    // Bắt đầu chiến dịch: màn giới thiệu, rồi Enter.
    await js(`document.getElementById('menu-play').click()`);
    await waitUntil(() => visible('intro'));
    check('intro screen shown before the night', await visible('intro'));
    const introTitle = await js(`document.getElementById('intro-title').textContent`);
    check('intro names the night', /Đêm 1/.test(introTitle), introTitle);
    await shot('03-intro');
    await key('Enter');
    await waitUntil(async () => !(await visible('intro')));
    check('Enter starts the night', !(await visible('intro')));
    await sleep(1500);
    await shot('04-game');
    const hud = await js(`document.getElementById('night').textContent`);
    check('HUD shows night 1', hud === '1', hud);

    // Tạm dừng bằng Esc, rồi tiếp tục.
    await key('Escape');
    await waitUntil(() => visible('pause'));
    check('Esc pauses', await visible('pause'));
    await js(`document.getElementById('resume').click()`);
    await waitUntil(async () => !(await visible('pause')));
    check('resume closes the pause screen', !(await visible('pause')));

    // Kết thúc đêm (lối kiểm thử): nhập tên và lưu.
    await js(`window.__ddl.forceEnd('lost', 'no_flames')`);
    await waitUntil(() => visible('over'));
    const entryShown = await js(`!document.getElementById('entry').hidden`);
    check('defeat asks for a name', entryShown === true);
    await shot('05-name-entry');
    await js(`document.getElementById('entry-name').focus()`);
    await send('Input.insertText', { text: 'ab' });
    await js(`document.getElementById('entry-save').click()`);
    const err1 = await js(`document.getElementById('entry-err').textContent`);
    check('name shorter than 3 is refused', /3–12/.test(err1 ?? ''), err1);
    await js(`document.getElementById('entry-name').value = ''`);
    await js(`document.getElementById('entry-name').focus()`);
    await send('Input.insertText', { text: 'Mayy_Tester' });
    await js(`document.getElementById('entry-save').click()`);
    await waitUntil(() => visible('board'));
    check('saved name opens the leaderboard', await visible('board'));
    const rows = await js(`document.querySelectorAll('#board-rows tr').length`);
    check('leaderboard has the saved entry', rows === 1, `rows=${rows}`);
    await shot('06-leaderboard');

    // Lưu qua lần tải lại trang.
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/web/?test=1&seed=7` });
    await waitUntil(async () => (await js(`typeof window.__ddl`)) === 'object', 30000); // module đã chạy xong, nút đã gắn sự kiện
    await js(`document.getElementById('menu-board').click()`);
    await sleep(200);
    const rowsAfter = await js(`document.querySelectorAll('#board-rows tr').length`);
    const savedName = await js(`document.querySelector('#board-rows tr td:nth-child(2)')?.textContent`);
    const stored = await js(`localStorage.getItem('dden.leaderboard')`);
    check('leaderboard survives a reload', rowsAfter === 1 && savedName === 'Mayy_Tester', `rows=${rowsAfter} name=${savedName} stored=${String(stored).length} bytes`);

    check('no JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  } catch (e) {
    check('e2e completed without exception', false, e.stack ?? e.message);
  } finally {
    try { ws?.close(); } catch { /* bỏ qua */ }
    chrome.kill('SIGKILL');
    server.close();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* bỏ qua */ }
  }
  const passed = results.filter((r) => r.ok).length;
  const summary = { passed, total: results.length, results, date: new Date().toISOString() };
  writeFileSync(join(OUT, 'e2e.json'), JSON.stringify(summary, null, 2) + '\n');
  process.stdout.write(results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok ? '' : ` — ${r.detail}`}`).join('\n') + `\n${passed}/${results.length} passed\n`);
  process.exit(passed === results.length ? 0 : 1);
}
main();
