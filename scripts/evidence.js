// Chạy bộ kịch bản headless bằng đúng CLI và ghi bằng chứng vào docs/proof/phase-1/.
// Mỗi lần chạy được thực hiện hai lần để kiểm tra tính tất định (sha256 phải giống nhau).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'proof', 'phase-1');
const RUNS = path.join(OUT, 'runs');
mkdirSync(RUNS, { recursive: true });

const RUNS_SPEC = [
  { name: 'R1-shade-hit', seed: 1, scenario: 'scenarios/shade-hit.json', ticks: 1000, every: 60, req: 'AC-6, AC-8' },
  { name: 'R2-win-by-deposit', seed: 1, scenario: 'scenarios/win-by-deposit.json', inputs: 'inputs/deposit-win.json', ticks: 600, every: 60, req: 'AC-4, AC-8' },
  { name: 'R3-pulse-stun', seed: 1, scenario: 'scenarios/pulse-stun.json', inputs: 'inputs/pulse-once.json', ticks: 300, every: 60, req: 'AC-5' },
  { name: 'R4-walk-and-jump', seed: 7, inputs: 'inputs/walk-and-jump.json', ticks: 600, every: 60, req: 'AC-1, AC-2, AC-3' },
  { name: 'R5-dawn', seed: 42, scenario: 'scenarios/quiet-dawn.json', ticks: 20000, every: 3600, req: 'AC-8' },
  { name: 'R6-random-seed-42', seed: 42, ticks: 3600, every: 600, req: 'AC-11' },
];

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function cli(args) {
  return spawnSync(process.execPath, [path.join(ROOT, 'bin', 'headless.js'), ...args], { encoding: 'utf8' });
}

const rows = [];
for (const r of RUNS_SPEC) {
  const args = ['--seed', String(r.seed), '--night', '1', '--ticks', String(r.ticks), '--snapshot-every', String(r.every)];
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
md.push('# Bằng chứng Phase 1 (sinh tự động bởi `npm run evidence`)');
md.push('');
md.push('Mỗi dòng: một lần chạy CLI headless thật, chạy hai lần và so sha256. Cột `deterministic` = `yes` nghĩa là hai lần cho byte giống nhau.');
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
