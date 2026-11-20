// Kiểm thử Phase 4 (Ticket-04, Contract v1.3): bảng xếp hạng, cảnh bench, soak headless, CLI xuất bảng.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateName, validateEntry, addEntry, parseStore, serialize, MAX_ENTRIES } from '../src/leaderboard.js';
import { createBenchGame, step, snapshot } from '../src/sim.js';
import { runSoak, passes } from '../src/soak.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'dden-p4-'));
const entry = (o = {}) => ({ name: 'Mayy_01', score: 100, nights_won: 1, achieved_at: '2026-11-20T10:00:00+07:00', seed: 7, ...o });

// AC-P4-01 Tên 3–12 ký tự [A-Za-z0-9_]
test('AC-P4-01 names are 3-12 characters of A-Z a-z 0-9 _', () => {
  assert.ok(validateName('abc'));
  assert.ok(validateName('A_b9'.repeat(3).slice(0, 12)));
  assert.ok(!validateName('ab'));
  assert.ok(!validateName('x'.repeat(13)));
  assert.ok(!validateName('Mây'));
  assert.ok(!validateName('a b c'));
  assert.ok(!validateName(undefined));
});

// AC-P4-02 Mục lưu đủ trường; thời gian ISO 8601 có múi giờ
test('AC-P4-02 entries need name, score, nights_won, achieved_at (ISO with timezone), seed', () => {
  assert.equal(validateEntry(entry()), null);
  assert.match(validateEntry(entry({ achieved_at: '2026-11-20 10:00' })), /ISO/);
  assert.match(validateEntry(entry({ nights_won: 4 })), /nights_won/);
  assert.match(validateEntry(entry({ score: -1 })), /score/);
});

// AC-P4-03 Top 10, điểm giảm dần, bằng điểm thì ai đạt trước đứng trên
test('AC-P4-03 keeps top 10 sorted by score desc, ties by earlier achieved_at', () => {
  let list = [];
  for (let i = 0; i < 12; i++) list = addEntry(list, entry({ name: `Player${i}`, score: i * 10, achieved_at: `2026-11-20T10:0${i % 10}:00+07:00` }));
  assert.equal(list.length, MAX_ENTRIES);
  assert.equal(list[0].score, 110);
  assert.ok(list.every((e, k) => k === 0 || list[k - 1].score >= e.score));
  const tieLate = entry({ name: 'LateOne', score: 50, achieved_at: '2026-11-20T12:00:00+07:00' });
  const tieEarly = entry({ name: 'EarlyOne', score: 50, achieved_at: '2026-11-20T09:00:00+07:00' });
  const both = addEntry(addEntry([], tieLate), tieEarly);
  assert.deepEqual(both.map((e) => e.name), ['EarlyOne', 'LateOne']);
});

test('AC-P4-03 a tie is decided by the earlier time even across timezones', () => {
  const a = entry({ name: 'UtcEarly', score: 40, achieved_at: '2026-11-20T02:00:00Z' });
  const b = entry({ name: 'VnLate', score: 40, achieved_at: '2026-11-20T10:00:00+07:00' });
  // 10:00+07:00 = 03:00Z, nên UtcEarly (02:00Z) đạt trước.
  assert.deepEqual(addEntry(addEntry([], b), a).map((e) => e.name), ['UtcEarly', 'VnLate']);
});

test('AC-P4-03 addEntry does not change its input and rejects bad entries', () => {
  const base = [entry({ name: 'Keep1' })];
  const after = addEntry(base, entry({ name: 'New_2', score: 999 }));
  assert.equal(base.length, 1);
  assert.equal(after[0].name, 'New_2');
  assert.throws(() => addEntry(base, entry({ name: 'x' })), RangeError);
});

test('AC-P4-03 stored data that is corrupt yields an empty list (game never crashes)', () => {
  assert.deepEqual(parseStore('{not json'), []);
  assert.deepEqual(parseStore('{"entries":[{"name":"bad name"}]}'), []);
  const good = parseStore(serialize([entry()]));
  assert.equal(good.length, 1);
});

// AC-P4-05 Cảnh bench: 200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng, không có sự kiện làm thay đổi cảnh
test('AC-P4-05 bench scene: 200 wandering shades, 100 motes, lanterns 1-3 lit with full fuel', () => {
  const g = createBenchGame({ seed: 42 });
  const s = snapshot(g);
  assert.equal(s.shades.length, 200);
  assert.ok(s.shades.every((x) => x.state === 'wander'));
  assert.equal(s.motes.length, 100);
  assert.deepEqual(s.lanterns.slice(0, 3).map((l) => [l.lit, l.fuel]), [[true, 100], [true, 100]].concat([[true, 100]]));
  assert.ok(s.lanterns.slice(3).every((l) => !l.lit));
});

test('AC-P4-05 bench: over a full night no events fire, the player stays put, the night does not end', () => {
  const g = createBenchGame({ seed: 42 });
  const before = [...g.player.pos];
  const events = [];
  for (let i = 0; i < 14400 + 120; i++) { step(g); events.push(...g.events); }
  assert.equal(events.length, 0);
  assert.deepEqual(g.player.pos, before);
  assert.equal(g.state, 'playing');
  assert.ok(g.shades.every((s) => s.state === 'wander' || s.state === 'chase' || s.state === 'drain'));
});

// AC-P4-06 Soak headless: không crash, đúng số Đêm và kết quả
test('AC-P4-06 soak of 3 nights runs without crashes and reports one result per night', () => {
  const r = runSoak({ seed: 7, nights: 3 });
  assert.equal(r.nights, 3);
  assert.equal(r.crashes, 0);
  assert.equal(r.results.length, 3);
  assert.ok(r.results.every((x) => ['won', 'lost', 'timeout'].includes(x)));
  assert.equal(typeof passes(r), 'boolean');
});

// AC-P4-04 Xuất bảng xếp hạng qua CLI
test('AC-P4-04 --export-leaderboard writes {"entries": [...]} in the stored order', () => {
  const store = join(dir, 'store.json');
  writeFileSync(store, serialize([entry({ name: 'Low_01', score: 10 }), entry({ name: 'Top_01', score: 500 })]));
  const out = join(dir, 'out.json');
  const r = spawnSync(process.execPath, [join(ROOT, 'bin', 'game.js'), '--export-leaderboard', out], {
    encoding: 'utf8', env: { ...process.env, DDL_LEADERBOARD: store },
  });
  assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(readFileSync(out, 'utf8'));
  assert.deepEqual(Object.keys(data), ['entries']);
  assert.deepEqual(data.entries.map((e) => e.name), ['Top_01', 'Low_01']);
});

test('AC-P4-04 export with no store writes an empty list', () => {
  const out = join(dir, 'empty.json');
  const r = spawnSync(process.execPath, [join(ROOT, 'bin', 'game.js'), '--export-leaderboard', out], {
    encoding: 'utf8', env: { ...process.env, DDL_LEADERBOARD: join(dir, 'missing.json') },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(readFileSync(out, 'utf8')), { entries: [] });
});

// AC-P4-07 Contract v1.3
test('AC-P4-07 contract v1.3 declares bench_cmd and soak_cmd', () => {
  const c = JSON.parse(readFileSync(join(ROOT, 'game.contract.json'), 'utf8'));
  assert.equal(c.contract_version, '1.3');
  assert.equal(typeof c.bench_cmd, 'string');
  assert.equal(typeof c.soak_cmd, 'string');
});

// AC-P4-08 Đổi phím: phát hiện trùng, khôi phục mặc định, dữ liệu hỏng không làm hỏng game
import { ACTIONS, DEFAULT_KEYS, assignKey, conflictOf, parseSettings, serializeSettings, DEFAULT_SETTINGS } from '../src/settings.js';

test('AC-P4-08 every action of ticket section 4 is rebindable', () => {
  assert.deepEqual(ACTIONS.map((a) => a.id).sort(), ['back', 'dash', 'forward', 'interact', 'jump', 'left', 'pause', 'pulse', 'right']);
  assert.deepEqual(Object.keys(DEFAULT_KEYS).sort(), ACTIONS.map((a) => a.id).sort());
});

test('AC-P4-08 assigning a key used by another action is refused and reports the conflict', () => {
  const r = assignKey(DEFAULT_KEYS, 'jump', 'KeyE');
  assert.equal(r.ok, false);
  assert.match(r.error, /Nạp đèn/);
  assert.equal(r.keys, DEFAULT_KEYS, 'keys unchanged');
  assert.equal(conflictOf(DEFAULT_KEYS, 'KeyE', 'jump'), 'interact');
});

test('AC-P4-08 assigning a free key works and keeps the others', () => {
  const r = assignKey(DEFAULT_KEYS, 'jump', 'KeyZ');
  assert.equal(r.ok, true);
  assert.equal(r.keys.jump, 'KeyZ');
  assert.equal(r.keys.interact, 'KeyE');
});

test('AC-P4-08 settings round-trip through JSON and bad data falls back to defaults', () => {
  const s = { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_KEYS, jump: 'KeyZ' }, largeText: true };
  assert.deepEqual(parseSettings(serializeSettings(s)), s);
  assert.deepEqual(parseSettings('{not json'), DEFAULT_SETTINGS);
  const dup = parseSettings(JSON.stringify({ keys: { jump: 'KeyE' } }));
  assert.deepEqual(dup.keys, DEFAULT_KEYS, 'duplicate keys in storage -> defaults');
});
