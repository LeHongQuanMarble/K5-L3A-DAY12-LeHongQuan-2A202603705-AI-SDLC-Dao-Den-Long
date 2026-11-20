// Chạy bộ kịch bản headless bằng đúng CLI và ghi bằng chứng vào docs/proof/phase-3/.
// Mỗi lần chạy được thực hiện hai lần để kiểm tra tính tất định (sha256 phải giống nhau).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'proof', 'phase-3');
const RUNS = path.join(OUT, 'runs');
mkdirSync(RUNS, { recursive: true });

// Mỗi dòng là một lần chạy CLI thật. night: 1-3; scenario/inputs là đường dẫn tương đối tới ROOT.
const RUNS_SPEC = [
  { name: 'P3-R1-night1-full', seed: 1, night: 1, ticks: 14400, every: 3600, req: 'AC-P3-11, AC-P3-08 (không thắng sớm)' },
  { name: 'P3-R2-night2-full', seed: 7, night: 2, ticks: 16200, every: 3600, req: 'AC-P3-11' },
  { name: 'P3-R3-night3-full', seed: 7, night: 3, ticks: 18000, every: 3600, req: 'AC-P3-11, AC-P3-16' },
  { name: 'P3-R4-drain-night1', seed: 1, night: 1, scenario: 'scenarios/p3-drain-night1.json', ticks: 240, every: 60, req: 'AC-P3-13, AC-P3-14 (hút dầu)' },
  { name: 'P3-R5-refuel-night1', seed: 1, night: 1, scenario: 'scenarios/p3-refuel-night1.json', inputs: 'inputs/p3-interact-tick0.json', ticks: 120, every: 60, req: 'AC-P3-03 (châm dầu)' },
  { name: 'P3-R6-relight-night1', seed: 1, night: 1, scenario: 'scenarios/p3-relight-night1.json', inputs: 'inputs/p3-interact-tick0.json', ticks: 120, every: 60, req: 'AC-P3-06 (thắp lại 5 đom đóm)' },
  { name: 'P3-R7-pause-night1', seed: 1, night: 1, scenario: 'scenarios/quiet-dawn.json', inputs: 'inputs/p2-pause.json', ticks: 260, every: 60, req: 'AC-P2-19 (tạm dừng, còn hiệu lực)' },
  { name: 'P3-R8-wind-night3', seed: 2, night: 3, scenario: 'scenarios/p2-wind-night3.json', ticks: 2400, every: 300, req: 'AC-P2-16 (gió, còn hiệu lực)' },
  { name: 'P3-R9-determinism-seed42', seed: 42, night: 1, ticks: 3600, every: 600, req: 'AC-11 (tất định)' },
];

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function cli(args) {
  return spawnSync(process.execPath, [path.join(ROOT, 'bin', 'headless.js'), ...args], { encoding: 'utf8' });
}

const rows = [];
for (const r of RUNS_SPEC) {
  const args = ['--seed', String(r.seed), '--night', String(r.night), '--ticks', String(r.ticks), '--snapshot-every', String(r.every)];
  if (r.scenario) args.push('--scenario', path.join(ROOT, r.scenario));
  if (r.inputs) args.push('--inputs', path.join(ROOT, r.inputs));
  const a = path.join(RUNS, `${r.name}.jsonl`);
  const b = path.join(RUNS, `${r.name}.rerun.jsonl`);
  const ra = cli([...args, '--out', a]);
  const rb = cli([...args, '--out', b]);
  const bufA = readFileSync(a);
  const same = ra.status === 0 && rb.status === 0 && sha(bufA) === sha(readFileSync(b));
  rmSync(b); // bản chạy lại chỉ dùng để so sánh
  const lines = bufA.toString('utf8').trim().split('\n').map((l) => JSON.parse(l));
  const end = lines.at(-1);
  const over = lines.find((l) => l.type === 'event' && l.name === 'game_over');
  const counts = {};
  for (const l of lines) if (l.type === 'event') counts[l.name] = (counts[l.name] ?? 0) + 1;
  rows.push({
    name: r.name,
    req: r.req,
    cmd: `node bin/headless.js ${args.map((x) => (x.startsWith('/') ? path.relative(ROOT, x) : x)).join(' ')} --out ${r.name}.jsonl`,
    exit: ra.status,
    state: end.state,
    ticks: end.ticks,
    score: end.score,
    reason: over ? over.data.reason : '-',
    events: Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(', ') || '-',
    deterministic: same,
    sha: sha(bufA).slice(0, 16),
    lines: lines.length,
  });
  if (!same) {
    console.error(`NONDETERMINISTIC: ${r.name}`);
    process.exitCode = 1;
  }
}

// Kiểm tra mã lỗi: input sai định dạng phải ra exit code 2.
const bad = cli(['--seed', '1', '--ticks', '5', '--out', path.join(RUNS, 'bad.jsonl'), '--inputs', path.join(ROOT, 'scenarios', 'shade-hit.json')]);
const badInputs = path.join(RUNS, 'bad-inputs.json');
writeFileSync(badInputs, '{"frames":[{"tick":4},{"tick":2}]}\n');
const bad2 = cli(['--seed', '1', '--ticks', '5', '--out', path.join(RUNS, 'bad.jsonl'), '--inputs', badInputs]);

const md = [];
md.push('# Bằng chứng Phase 3 (sinh tự động bởi `npm run evidence`)');
md.push('');
md.push('Mỗi dòng: một lần chạy CLI headless thật, chạy hai lần và so sha256. Cột `deterministic` = `yes` nghĩa là hai lần cho byte giống nhau. Bằng chứng Phase 1 và Phase 2 nằm ở `docs/proof/phase-1/` và `docs/proof/phase-2/` (theo tag).');
md.push('');
md.push('| Run | Yêu cầu | Lệnh | Exit | State | Ticks | Điểm | Lý do kết thúc | Deterministic | sha256 (16 ký tự đầu) | Sự kiện |');
md.push('|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  md.push(`| ${r.name} | ${r.req} | \`${r.cmd}\` | ${r.exit} | ${r.state} | ${r.ticks} | ${r.score} | ${r.reason} | ${r.deterministic ? 'yes' : 'NO'} | \`${r.sha}\` | ${r.events} |`);
}
md.push('');
md.push('## Kiểm tra lỗi đầu vào (AC-10)');
md.push('');
md.push(`- Inputs thiếu/không hợp lệ (\`--inputs\` chứa scenario, thiếu \`frames\`): exit code **${bad.status}**, stderr: \`${bad.stderr.trim()}\``);
md.push(`- Inputs có tick không tăng: exit code **${bad2.status}**, stderr: \`${bad2.stderr.trim()}\``);
md.push('');
writeFileSync(path.join(OUT, 'evidence.md'), md.join('\n') + '\n');
console.log(md.join('\n'));
