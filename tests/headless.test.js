import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/headless.js', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'dden-headless-'));
const file = (name, text) => { const p = join(dir, name); writeFileSync(p, text); return p; };
const cli = (args) => spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8' });
const lines = (path) => readFileSync(path, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

test('runs N ticks, writes JSONL that starts with a snapshot and ends with end', () => {
  const out = join(dir, 'a.jsonl');
  const r = cli(['--seed', '1', '--night', '1', '--ticks', '30', '--out', out]);
  assert.equal(r.status, 0, r.stderr);
  const ls = lines(out);
  assert.equal(ls[0].type, 'snapshot');
  assert.equal(ls[0].tick, 0);
  assert.deepEqual(ls.at(-1), { type: 'end', ticks: 30, state: 'playing', score: 0 });
});

test('snapshots appear every --snapshot-every ticks, default 10', () => {
  const out = join(dir, 'b.jsonl');
  cli(['--seed', '1', '--night', '1', '--ticks', '35', '--out', out]);
  const snaps = lines(out).filter((l) => l.type === 'snapshot').map((s) => s.tick);
  assert.deepEqual(snaps, [0, 10, 20, 30]);

  const out2 = join(dir, 'c.jsonl');
  cli(['--seed', '1', '--night', '1', '--ticks', '6', '--out', out2, '--snapshot-every', '2']);
  const snaps2 = lines(out2).filter((l) => l.type === 'snapshot').map((s) => s.tick);
  assert.deepEqual(snaps2, [0, 2, 4, 6]);
});

test('same seed, scenario and inputs give byte-identical output', () => {
  const scen = join(process.cwd(), 'scenarios', 'shade-hit.json');
  const inp = join(process.cwd(), 'inputs', 'walk-and-jump.json');
  const a = join(dir, 'd1.jsonl');
  const b = join(dir, 'd2.jsonl');
  const args = ['--seed', '99', '--night', '1', '--scenario', scen, '--inputs', inp, '--ticks', '400'];
  assert.equal(cli([...args, '--out', a]).status, 0);
  assert.equal(cli([...args, '--out', b]).status, 0);
  assert.equal(readFileSync(a, 'utf8'), readFileSync(b, 'utf8'));
});

test('events use the Contract names and tick = step index + 1', () => {
  const scen = join(process.cwd(), 'scenarios', 'shade-hit.json');
  const out = join(dir, 'e.jsonl');
  cli(['--seed', '1', '--night', '1', '--scenario', scen, '--ticks', '5', '--out', out]);
  const hit = lines(out).find((l) => l.type === 'event' && l.name === 'player_hit');
  assert.ok(hit, 'player_hit event present');
  assert.equal(hit.tick, 1);
  assert.equal(hit.data.by, 'shade');
});

test('the shade-hit scenario ends the night with no_flames', () => {
  const scen = join(process.cwd(), 'scenarios', 'shade-hit.json');
  const out = join(dir, 'f.jsonl');
  const r = cli(['--seed', '1', '--night', '1', '--scenario', scen, '--ticks', '1000', '--out', out]);
  assert.equal(r.status, 0, r.stderr);
  const ls = lines(out);
  assert.deepEqual(ls.at(-1).state, 'lost');
  const over = ls.find((l) => l.type === 'event' && l.name === 'game_over');
  assert.deepEqual(over.data, { result: 'lost', reason: 'no_flames' });
});

test('coordinates are rounded to 3 decimals', () => {
  const out = join(dir, 'g.jsonl');
  cli(['--seed', '5', '--night', '1', '--ticks', '20', '--out', out]);
  for (const m of readFileSync(out, 'utf8').matchAll(/-?\d+\.(\d+)/g)) assert.ok(m[1].length <= 3, m[0]);
});

test('malformed inputs file exits with code 2', () => {
  const inp = file('bad-inputs.json', '{"frames": [{"tick": 5}, {"tick": 3}]}');
  const r = cli(['--seed', '1', '--night', '1', '--inputs', inp, '--ticks', '10', '--out', join(dir, 'h.jsonl')]);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /strictly increase/);
});

test('invalid JSON in a scenario exits with code 2', () => {
  const scen = file('broken.json', '{not json');
  const r = cli(['--seed', '1', '--night', '1', '--scenario', scen, '--ticks', '10', '--out', join(dir, 'i.jsonl')]);
  assert.equal(r.status, 2, r.stderr);
});

test('scenario with an unknown lantern id exits with code 2', () => {
  const scen = file('bad-lantern.json', '{"lanterns":[{"id":"L9","lit":true}]}');
  const r = cli(['--seed', '1', '--night', '1', '--scenario', scen, '--ticks', '10', '--out', join(dir, 'j.jsonl')]);
  assert.equal(r.status, 2, r.stderr);
});

test('missing required arguments exit non-zero with a message on stderr', () => {
  const r = cli(['--seed', '1', '--night', '1']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--ticks/);
});

test('--night other than 1, 2 or 3 is rejected (v1.1 adds nights 2 and 3)', () => {
  const r = cli(['--seed', '1', '--night', '4', '--ticks', '1', '--out', join(dir, 'k.jsonl')]);
  assert.notEqual(r.status, 0);
});

test('standing still with no shades until dawn ends the night as lost (dawn)', () => {
  const scen = join(process.cwd(), 'scenarios', 'quiet-dawn.json');
  const out = join(dir, 'l.jsonl');
  const r = cli(['--seed', '1', '--night', '1', '--scenario', scen, '--ticks', '20000', '--out', out]);
  assert.equal(r.status, 0, r.stderr);
  const ls = lines(out);
  assert.equal(ls.at(-1).ticks, 300 * 60); // v1.1: Đêm 1 dài 300 s
  assert.equal(ls.at(-1).state, 'lost');
  assert.deepEqual(ls.find((l) => l.type === 'event' && l.name === 'game_over').data, { result: 'lost', reason: 'dawn' });
});
