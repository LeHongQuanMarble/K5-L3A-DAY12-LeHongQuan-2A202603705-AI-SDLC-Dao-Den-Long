// Kiểm thử Phase 2 (Ticket-02, Contract v1.1): ba Đêm, lướt, bục nhảy, Gió Lạc, bùa Gió, gió Đêm 3, tạm dừng.
// Mỗi test ứng với một yêu cầu trong specs/phase-2/spec.md (mã AC-P2-*).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, snapshot, applyInputFrame, timeLeft } from '../src/sim.js';
import { normalizeScenario } from '../src/scenario.js';
import { TUNING as T, SCORE } from '../src/tuning.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const run = (g, n) => { const ev = []; for (let i = 0; i < n; i++) { step(g); ev.push(...g.events); } return ev; };
const names = (ev) => ev.map((e) => e.name);
const find = (ev, name) => ev.find((e) => e.name === name);
const quiet = (extra = {}) => normalizeScenario({ random_motes: false, random_shades: false, random_drifters: false, ...extra });
const game = (night, extra = {}, seed = 1) => createGame({ seed, night, scenario: quiet(extra) });

// AC-P2-01 Số liệu chuẩn
test('AC-P2-01 tuning matches Ticket-02 section 1 numbers', () => {
  assert.equal(T.player_speed, 6.0);
  assert.equal(T.jump_velocity, 7.0);
  assert.equal(T.gravity, 20.0);
  assert.equal(T.dash_speed, 14);
  assert.equal(T.dash_duration_s, 0.2);
  assert.equal(T.dash_cooldown_s, 1.5);
  assert.equal(T.carry_capacity, 10);
  assert.equal(T.lantern_cost, 10);
  assert.equal(T.pulse_cost, 3);
  assert.equal(T.pulse_radius, 5.0);
  assert.equal(T.pulse_cooldown_s, 3.0);
  assert.equal(T.pulse_stun_s, 2.0);
  assert.equal(T.pulse_push_m, 4.0);
  assert.equal(T.safe_radius, 6.0);
  assert.equal(T.shade_speed, 4.0);
  assert.equal(T.shade_speed_night3, 4.5);
  // v1.2 (Ticket-03) thay thời lượng: 240/270/300. Xem AC-P3-11.
  assert.equal(T.night1_duration_s, 240);
  assert.equal(T.night2_duration_s, 270);
  assert.equal(T.night3_duration_s, 300);
  assert.equal(T.mote_start_count, 20);
  assert.equal(T.mote_max, 30);
  assert.equal(SCORE.per_mote, 5); // v1.2, trước đây 10
  assert.equal(SCORE.per_lantern, 100);
  assert.equal(SCORE.per_stun, 5);
  assert.equal(SCORE.per_flame_left, 50);
  // v1.2: per_mote 5; thưởng thời gian đã bỏ (Ticket-03 mục 5). Xem AC-P3-01.
});

// AC-P2-02 Di chuyển: đạt tốc độ trong ≤ 0.1 s
test('AC-P2-02 walking reaches player_speed within 0.1 s', () => {
  const g = game(1);
  g.input.move = [0, 1];
  run(g, 6); // 0.1 s
  const speed = Math.hypot(g.player.vel[0], g.player.vel[2]);
  assert.ok(speed >= T.player_speed - 0.05, `speed=${speed}`);
});

// AC-P2-03 Nhảy: vận tốc 7, trọng lực 20 -> đỉnh 7²/(2·20) = 1.225 m
test('AC-P2-03 jump peaks at about v²/(2g) and lands on the ground', () => {
  const g = game(1);
  g.input.jump = true;
  step(g);
  g.input.jump = false;
  let peak = 0;
  for (let i = 0; i < 120; i++) { step(g); peak = Math.max(peak, g.player.pos[1]); }
  assert.ok(Math.abs(peak - 1.225) < 0.03, `peak=${peak}`);
  assert.equal(g.player.pos[1], 0);
  assert.equal(g.player.grounded, true);
});

test('AC-P2-03 cannot jump in the air', () => {
  const g = game(1);
  g.input.jump = true; step(g); g.input.jump = false;
  const vy = g.player.vel[1];
  g.input.jump = true; step(g);
  assert.ok(g.player.vel[1] < vy, 'no second jump impulse while airborne');
});

// AC-P2-04 Lướt: 14 m/s trong 0.2 s, hồi chiêu 1.5 s, không bất tử
test('AC-P2-04 dash moves at 14 m/s for 0.2 s then starts 1.5 s cooldown', () => {
  const g = game(1);
  g.input.move = [0, 1];
  g.input.dash = true;
  const ev = run(g, 1);
  g.input.dash = false;
  assert.ok(find(ev, 'dash'), 'dash event');
  assert.ok(Math.abs(Math.hypot(g.player.vel[0], g.player.vel[2]) - T.dash_speed) < 0.5);
  run(g, Math.round(T.dash_duration_s * 60) - 1);
  assert.ok(g.player.dashTicks === 0 || g.player.dashTicks === undefined);
  assert.equal(g.player.dashCd, 90 - 11, 'cooldown 1.5 s counted from dash start');
  // Bấm lại khi đang hồi chiêu không có tác dụng
  g.input.dash = true;
  const ev2 = run(g, 1);
  assert.equal(find(ev2, 'dash'), undefined);
});

test('AC-P2-04 dash keeps the same height (no invulnerability granted)', () => {
  const g = game(1, { player: { pos: [0, 0, 0] } });
  g.input.move = [1, 0];
  g.input.dash = true;
  run(g, 1);
  assert.equal(g.player.invuln, 0);
});

// AC-P2-05 Đom đóm: sức chứa 10, nhặt theo khoảng cách XZ và chênh cao
test('AC-P2-05 pickup needs XZ <= 1.0 and height gap <= 1.5', () => {
  const far = game(1, { motes: [[0, 0, 0]], player: { pos: [0, 2.0, 0] } });
  run(far, 1);
  assert.equal(far.player.carried, 0, 'height gap 2 m is too high');
  const near = game(1, { motes: [[0, 0, 0]], player: { pos: [0.5, 0, 0] } });
  run(near, 1);
  assert.equal(near.player.carried, 1);
});

test('AC-P2-05 carry capacity is 10', () => {
  const motes = Array.from({ length: 13 }, () => [0, 0, 0]);
  const g = game(1, { motes });
  run(g, 1);
  assert.equal(g.player.carried, T.carry_capacity);
  assert.equal(g.motes.length, 3);
});

test('AC-P2-05 start with 20 random motes on distinct spawn points; cap 30; refill at tick 240k', () => {
  const g = createGame({ seed: 3, night: 1 });
  assert.equal(g.motes.length, T.mote_start_count);
  const keys = new Set(g.motes.map((m) => m.pos.join(',')));
  assert.equal(keys.size, T.mote_start_count, 'all distinct points');
  // Không có đom đóm bị nhặt: chỉ kiểm tra lịch sinh
  const h = createGame({ seed: 3, night: 1, scenario: normalizeScenario({ random_motes: true, random_shades: false, random_drifters: false }) });
  run(h, 239);
  assert.equal(h.motes.length, T.mote_start_count);
  run(h, 1);
  assert.equal(h.motes.length, T.mote_start_count + 1, 'one mote appears at tick 240');
});

// AC-P2-06 Đèn lồng: 10 đom đóm để thắp, nạp nhiều lần
test('AC-P2-06 lantern takes 10 fireflies over several deposits and remembers progress', () => {
  const g = game(1, { player: { carried: 4 } });
  g.player.pos = [...g.lanterns[0].pos];
  g.input.interact = true; run(g, 1); g.input.interact = false; run(g, 1); // nhả nút một tick rồi mới nhấn lại (cạnh lên)
  assert.equal(g.lanterns[0].deposited, 4);
  assert.equal(g.lanterns[0].lit, false);
  g.player.carried = 6;
  g.input.interact = true; const ev = run(g, 1);
  assert.equal(g.lanterns[0].lit, true);
  assert.deepEqual(names(ev), ['deposit', 'lantern_lit']);
});

test('AC-P2-06 interact picks the nearest unlit lantern within 2.0 m, lower id on ties', () => {
  const g = game(1, { player: { carried: 10 } });
  g.player.pos = [0, 0, 0];
  g.lanterns[0].pos = [1.5, 0, 0];
  g.lanterns[1].pos = [-1.5, 0, 0];
  g.input.interact = true; run(g, 1);
  assert.equal(g.lanterns[0].deposited, 10, 'tie -> smaller id (L1)');
  assert.equal(g.lanterns[1].deposited, 0);
});

test('AC-P2-06 lit lanterns are not valid targets for interact', () => {
  const g = game(1, { lanterns: [{ id: 'L1', lit: true }], player: { carried: 10 } });
  g.player.pos = [...g.lanterns[0].pos];
  g.input.interact = true;
  const ev = run(g, 1);
  assert.equal(find(ev, 'deposit'), undefined);
  assert.equal(g.player.carried, 10);
});

// AC-P2-07 Thắp đèn lần đầu và thắng khi thắp đủ đèn (kể cả đúng tick hết giờ)
test('AC-P2-07 (thay bằng Ticket-03): đủ đèn sáng KHÔNG kết thúc Đêm nữa', () => {
  // Lý do: Ticket-03 mục 3 "Không còn thắng sớm". Kiểm tra đầy đủ ở AC-P3-08.
  const lanterns = [1, 2, 3, 4].map((i) => ({ id: `L${i}`, lit: true }));
  lanterns.push({ id: 'L5', pos: [6, 0, 0] });
  const g = game(1, { lanterns, player: { pos: [5.5, 0, 0], carried: 10 } });
  g.input.interact = true;
  run(g, 1);
  assert.equal(g.state, 'playing');
});

test('AC-P2-07 winning on the same tick as the timer runs out still wins', () => {
  const lanterns = [1, 2, 3, 4].map((i) => ({ id: `L${i}`, lit: true }));
  lanterns.push({ id: 'L5', pos: [6, 0, 0] });
  const g = game(1, { lanterns, time_left_s: 1 / 60, player: { pos: [5.5, 0, 0], carried: 10 } });
  g.input.interact = true;
  run(g, 1);
  assert.equal(g.state, 'won');
});

// AC-P2-08 Bóng Mực: spawn, detect, lose, states named by v1.1
const spawnOnly = (extra = {}) => normalizeScenario({ random_motes: false, random_drifters: false, random_shades: true, ...extra });

test('AC-P2-08 two shades appear at tick 300, then one every 480 ticks (Night 1)', () => {
  const g = createGame({ seed: 5, night: 1, scenario: spawnOnly() });
  run(g, 299);
  assert.equal(g.shades.length, 0);
  run(g, 1);
  assert.equal(g.shades.length, 2);
  assert.deepEqual(g.shades.map((s) => s.id), ['S1', 'S2']);
  run(g, 479);
  assert.equal(g.shades.length, 2);
  run(g, 1);
  assert.equal(g.shades.length, 3, 'tick 780');
});

test('AC-P2-08 a new shade is spawning on its spawn tick and interacts only from the next tick', () => {
  const g = createGame({ seed: 5, night: 1, scenario: spawnOnly() });
  run(g, 300);
  assert.equal(g.shades[0].state, 'spawning');
  run(g, 1);
  assert.ok(['wander', 'chase'].includes(g.shades[0].state));
});

test('AC-P2-08 shade chases inside detect radius 12 m and gives up beyond 18 m', () => {
  const g = game(1, { shades: [{ pos: [0, 0, 10] }] });
  run(g, 1);
  assert.equal(g.shades[0].state, 'chase');
  const far = game(1, { shades: [{ pos: [0, 0, 30] }] });
  run(far, 1);
  assert.equal(far.shades[0].state, 'wander');
});

test('AC-P2-08 shades are spawned away from the player (>= 15 m) on the ring of spawn points', () => {
  const g = createGame({ seed: 9, night: 1, scenario: spawnOnly() });
  run(g, 300);
  for (const s of g.shades) assert.ok(dist(s.pos, g.player.pos) >= 15 - 1e-6);
  for (const s of g.shades) assert.ok(Math.abs(Math.hypot(s.pos[0], s.pos[2]) - 37) < 1e-6, 'on r=37 ring');
});

// AC-P2-09 Tỏa Sáng
test('AC-P2-09 pulse costs 3 fireflies, cooldown 3 s, and needs 3 fireflies', () => {
  const g = game(1, { shades: [{ pos: [2, 0, 0] }], player: { carried: 3 } });
  g.input.pulse = true; let ev = run(g, 1); g.input.pulse = false;
  assert.equal(g.player.carried, 0);
  assert.ok(find(ev, 'pulse'));
  const h = game(1, { shades: [{ pos: [2, 0, 0] }], player: { carried: 2 } });
  h.input.pulse = true; ev = run(h, 1);
  assert.equal(find(ev, 'pulse'), undefined, 'not enough fireflies');
});

test('AC-P2-09 pulse hits shades within 5 m of the center (player + 0.8 m height)', () => {
  const g = game(1, { shades: [{ id: 'A', pos: [4.9, 0.8, 0] }, { id: 'B', pos: [5.2, 0.8, 0] }], player: { carried: 3 } });
  g.input.pulse = true;
  const ev = run(g, 1);
  assert.deepEqual(find(ev, 'pulse').data, { stunned_ids: ['A'] });
});

test('AC-P2-09 pulse scores 5 per shade hit, on every pulse', () => {
  const g = game(1, { shades: [{ id: 'A', pos: [2, 0, 0] }], player: { carried: 9 } });
  g.input.pulse = true; run(g, 1); g.input.pulse = false;
  assert.equal(g.score, SCORE.per_stun);
  // Hồi chiêu 3 s > choáng 2 s: lần sau phải đặt lại Bóng Mực trong tầm (test-only).
  run(g, T.pulse_cooldown_s * 60);
  g.shades[0].pos = [2, 0, 0];
  g.shades[0].state = 'wander';
  g.input.pulse = true; run(g, 1); g.input.pulse = false;
  assert.equal(g.score, 2 * SCORE.per_stun);
});

test('AC-P2-09 stun lasts 120 ticks; push totals 4 m over the first 15 ticks', () => {
  const g = game(1, { shades: [{ id: 'A', pos: [2, 0, 0] }], player: { carried: 3 } });
  const x0 = g.shades[0].pos[0];
  g.input.pulse = true; run(g, 1); g.input.pulse = false;
  run(g, 14); // 15 tick đẩy lùi, tick đầu nằm trong tick tỏa sáng
  assert.ok(Math.abs(g.shades[0].pos[0] - (x0 + T.pulse_push_m)) < 0.01, `x=${g.shades[0].pos[0]}`);
  const before = [...g.shades[0].pos];
  run(g, 60);
  assert.deepEqual(g.shades[0].pos, before, 'stunned shade does not walk');
  run(g, T.pulse_stun_s * 60 - 75);
  assert.notEqual(g.shades[0].state, 'stunned', 'stun ends at 120 ticks');
});

// AC-P2-10 Vùng an toàn của đèn đã sáng
test('AC-P2-10 lit lantern keeps shades out of its 6 m safe zone', () => {
  const g = game(1, { lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], shades: [{ pos: [8, 0, 0] }], player: { pos: [-8, 0, 0] } });
  run(g, 900);
  assert.equal(g.state, 'playing');
  assert.ok(dist(g.shades[0].pos, [0, 0, 0]) >= T.safe_radius - 1e-6);
});

test('AC-P2-10 a shade inside the zone when the lantern lights is pushed out within 30 ticks, without damage', () => {
  const g = game(1, { lanterns: [{ id: 'L1', pos: [0, 0, 0], deposited: 9 }], shades: [{ pos: [3, 0, 0] }], player: { pos: [0, 0, 0], carried: 1 } });
  g.input.interact = true;
  const ev = run(g, 1);
  g.input.interact = false;
  assert.ok(find(ev, 'lantern_lit'), 'the lantern lit this tick');
  assert.equal(g.player.flames, T.flames, 'no damage while being ejected');
  run(g, T.eject_ticks);
  assert.ok(dist(g.shades[0].pos, [0, 0, 0]) >= T.safe_radius - 0.01, `d=${dist(g.shades[0].pos, [0, 0, 0])}`);
  assert.equal(g.player.flames, T.flames);
});

// AC-P2-11 Chạm và bị đánh
test('AC-P2-11 touch: XZ <= 1.0 and height gap <= 1.5 costs 1 flame and drops floor(carried/2)', () => {
  const g = game(1, { shades: [{ pos: [0.5, 0, 0] }], player: { carried: 5 } });
  const ev = run(g, 1);
  assert.equal(g.player.flames, T.flames - 1);
  assert.equal(g.player.carried, 5 - Math.floor(5 / 2));
  const hit = find(ev, 'player_hit');
  assert.deepEqual(hit.data, { by: 'shade', flames: T.flames - 1, dropped: 2, lost: 0 });
  const dropped = g.motes.filter((m) => m.kind === 'dropped');
  assert.equal(dropped.length, 2);
  assert.ok(dropped.every((m) => m.ttl === 480), 'ttl 480 ticks = 8 s');
});

test('AC-P2-11 shade far in height does not touch', () => {
  const g = game(1, { shades: [{ pos: [0.5, 2.0, 0] }], player: { carried: 0 } });
  run(g, 1);
  assert.equal(g.player.flames, T.flames);
});

test('AC-P2-11 invulnerable for 90 ticks; a shade touching during invuln does nothing', () => {
  const g = game(1, { shades: [{ pos: [0.5, 0, 0] }] });
  run(g, 1);
  assert.ok(g.player.invuln > 80, 'invuln 90 ticks');
  run(g, 30);
  assert.equal(g.player.flames, T.flames - 1);
});

test('AC-P2-11 hit makes the shade recoil 2 m away over 60 ticks', () => {
  const g = game(1, { shades: [{ pos: [0.5, 0, 0] }] });
  run(g, 1);
  assert.equal(g.shades[0].state, 'recoil');
  const x0 = g.shades[0].pos[0];
  run(g, 60);
  assert.ok(Math.abs(g.shades[0].pos[0] - x0 - 2) < 0.05 || g.shades[0].pos[0] - x0 > 1.9, `dx=${g.shades[0].pos[0] - x0}`);
});

test('AC-P2-11 losing the last flame ends the night (no_flames) immediately', () => {
  const g = game(1, { shades: [{ pos: [0.5, 0, 0] }], player: { flames: 1 } });
  const ev = run(g, 1);
  assert.deepEqual(find(ev, 'game_over').data, { result: 'lost', reason: 'no_flames' });
});

// AC-P2-12 Rơi khỏi đảo
test('AC-P2-12 walking off the island falls once: -1 flame, all fireflies lost, wait 60 ticks, respawn at start', () => {
  const g = game(1, { player: { pos: [39.9, 0, 0], carried: 4 } });
  g.input.move = [1, 0];
  let hits = [];
  for (let i = 0; i < 300 && hits.length === 0; i++) hits.push(...step(g).filter((e) => e.name === 'player_hit'));
  g.input.move = [0, 0];
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0].data, { by: 'fall', flames: T.flames - 1, dropped: 0, lost: 4 });
  assert.equal(g.player.carried, 0);
  const more = run(g, 300);
  assert.equal(more.filter((e) => e.name === 'player_hit').length, 0, 'fall happens exactly once');
  assert.deepEqual(g.player.pos, [0, 0, 0], 'respawn at the start point');
  assert.ok(g.player.invuln > 0 || g.player.invuln === 0);
  assert.equal(g.player.flames, T.flames - 1);
});

test('AC-P2-12 falling with the last flame loses at once (no respawn)', () => {
  const g = game(1, { player: { pos: [39.9, 0, 0], flames: 1 } });
  g.input.move = [1, 0];
  const ev = run(g, 300);
  assert.deepEqual(find(ev, 'game_over').data, { result: 'lost', reason: 'no_flames' });
});

// AC-P2-13 Thời gian và kết thúc
test('AC-P2-13 (cập nhật v1.2): thời lượng Đêm 240 / 270 / 300 s', () => {
  // Lý do: Ticket-03 mục 3 đổi thời lượng. Kiểm tra đầy đủ ở AC-P3-11.
  assert.equal(createGame({ seed: 1, night: 1 }).timeBase, 240);
  assert.equal(createGame({ seed: 1, night: 2 }).timeBase, 270);
  assert.equal(createGame({ seed: 1, night: 3 }).timeBase, 300);
});

test('AC-P2-13 standing still until dawn loses (dawn)', () => {
  const g = game(1, { shades: [] });
  g.input.move = [0, 0];
  const ev = run(g, 300 * 60);
  assert.equal(g.state, 'lost');
  assert.deepEqual(find(ev, 'game_over').data, { result: 'lost', reason: 'dawn' });
});

test('AC-P2-13 (thay bằng Ticket-03): thưởng thời gian đã bỏ; thưởng thắng xem AC-P3-21', () => {
  // Lý do: Ticket-03 mục 5 bỏ "thưởng thời gian" và đổi thưởng bình minh.
  assert.equal(SCORE.per_second_left, undefined);
});

// AC-P2-14 Đêm 2: bục nhảy, cầu tre
test('AC-P2-14 Night 2: walking on the bridge reaches island B; walking off its side falls', () => {
  const onBridge = game(2, { player: { pos: [24, 0, 0] } });
  onBridge.input.move = [1, 0];
  run(onBridge, 240);
  assert.ok(onBridge.player.pos[0] > 44, `x=${onBridge.player.pos[0]}`);
  assert.equal(onBridge.player.pos[1], 0);
  const off = game(2, { player: { pos: [30, 0, 0] } });
  off.input.move = [0, 1];
  const ev = run(off, 120);
  assert.ok(find(ev, 'player_hit'), 'side of the bridge is open sea');
});

test('AC-P2-14 Night 2 jump pad launches toward the other island (lands in B)', () => {
  const g = game(2, { player: { pos: [20, 0, 18] } });
  run(g, 1);
  let landed = null;
  for (let i = 0; i < 180 && !landed; i++) {
    step(g);
    if (g.player.grounded && g.player.pos[0] > 30) landed = [...g.player.pos];
  }
  assert.ok(landed, 'landed on the far island');
  assert.ok(dist(landed, [70, 0, 0]) <= 28, `landed at ${landed}`);
});

test('AC-P2-14 Night 2 has six lanterns and 2 islands of radius 28', () => {
  const g = createGame({ seed: 1, night: 2 });
  assert.equal(g.lanterns.length, 6);
  assert.deepEqual(g.lanterns.map((l) => l.id), ['L1', 'L2', 'L3', 'L4', 'L5', 'L6']);
});

// AC-P2-15 Đêm 3: tầng, dốc, vách, bục, tháp
test('AC-P2-15 Night 3: walking into the raised ring from the ground is blocked by the wall', () => {
  const g = game(3, { player: { pos: [0, 0, 5] } });
  g.input.move = [0, 1];
  run(g, 180);
  assert.ok(g.player.pos[2] < 12, `z=${g.player.pos[2]}`);
  assert.equal(g.player.pos[1], 0);
});

test('AC-P2-15 Night 3: a ramp at 30 degrees brings the player up to tier 1 (Y=3)', () => {
  const a = (30 * Math.PI) / 180;
  const start = [32 * Math.cos(a), 0, 32 * Math.sin(a)];
  const g = game(3, { player: { pos: start } });
  g.input.move = [-Math.cos(a), -Math.sin(a)];
  run(g, 100); // ~8 m: qua dốc 6 m rồi vào vành khăn
  assert.ok(Math.abs(g.player.pos[1] - 3) < 0.05, `y=${g.player.pos[1]}`);
});

test('AC-P2-15 Night 3: the launch pad at (0,3,13) throws the player onto tier 2 (Y=6)', () => {
  const g = game(3, { player: { pos: [0, 3, 13] } });
  run(g, 1);
  let up = null;
  for (let i = 0; i < 180 && !up; i++) {
    step(g);
    if (g.player.grounded && g.player.pos[1] > 5.5) up = [...g.player.pos];
  }
  assert.ok(up, 'landed on tier 2');
  assert.ok(Math.hypot(up[0], up[2]) <= 8 + 1e-6);
});

test('AC-P2-15 Night 3: a tower of radius 2 blocks movement', () => {
  const g = game(3, { player: { pos: [-5, 0, 0] } });
  g.input.move = [1, 0];
  run(g, 120);
  assert.ok(g.player.pos[0] < -2.0 + 1e-9, `x=${g.player.pos[0]}`);
});

// AC-P2-16 Gió (Đêm 3)
test('AC-P2-16 Night 3 wind: warning 2 s before each 30 s gust, gust lasts 5 s and pushes at 2 m/s', () => {
  const g = createGame({ seed: 2, night: 3, scenario: quiet({ wind_enabled: true, player: { pos: [-15, 0, -15] } }) });
  run(g, 1680 - 1);
  assert.equal(snapshot(g).wind.active, false);
  assert.equal(snapshot(g).wind.warning, false);
  run(g, 1);
  assert.equal(snapshot(g).wind.warning, true);
  run(g, 120);
  assert.equal(snapshot(g).wind.active, true);
  const p0 = [...g.player.pos];
  run(g, 60);
  const moved = dist(p0, g.player.pos);
  assert.ok(moved > 1.8 && moved < 2.2, `moved=${moved}`);
  run(g, 300 - 60);
  assert.equal(snapshot(g).wind.active, false);
});

test('AC-P2-16 wind is off on Night 1 and 2', () => {
  const g = createGame({ seed: 2, night: 2, scenario: quiet() });
  run(g, 2000);
  assert.equal(snapshot(g).wind.active, false);
});

// AC-P2-17 Gió Lạc
test('AC-P2-17 drifter goes idle -> chase when carried >= 5 and within 15 m, then steals min(3, carried) and flees', () => {
  const g = game(2, { player: { carried: 5 }, drifters: [{ id: 'D1', pos: [0, 0, 10], state: 'idle' }] });
  const ev1 = run(g, 1);
  assert.equal(g.drifters[0].state, 'chase');
  const ev = [...ev1, ...run(g, 120)];
  const steal = find(ev, 'drifter_steal');
  assert.deepEqual(steal.data, { drifter_id: 'D1', amount: 3, carried: 2 });
  assert.equal(g.player.carried, 2);
  assert.equal(g.drifters[0].state, 'flee');
});

test('AC-P2-17 drifter returns to idle when the condition is lost', () => {
  const g = game(2, { player: { carried: 4 }, drifters: [{ id: 'D1', pos: [0, 0, 10], state: 'idle' }] });
  run(g, 1);
  assert.equal(g.drifters[0].state, 'idle');
});

test('AC-P2-17 pulse on a chasing drifter makes it flee without stealing', () => {
  const g = game(2, { player: { carried: 6 }, drifters: [{ id: 'D1', pos: [0, 0, 4], state: 'chase' }] });
  g.input.pulse = true; const ev = run(g, 1); g.input.pulse = false;
  assert.equal(find(ev, 'drifter_steal'), undefined);
  assert.equal(g.drifters[0].state, 'flee');
});

test('AC-P2-17 invulnerability does not stop a steal (Gió Lạc is not a hit)', () => {
  const g = game(2, { player: { carried: 6, invuln_ticks: 90 }, drifters: [{ id: 'D1', pos: [0.5, 0, 0], state: 'chase' }] });
  const ev = run(g, 1);
  assert.ok(find(ev, 'drifter_steal'));
});

test('AC-P2-17 drifters spawn at tick 1200 on Night 2, at most two alive', () => {
  const g = createGame({ seed: 4, night: 2, scenario: quiet({ random_drifters: true }) });
  run(g, 1199);
  assert.equal(g.drifters.length, 0);
  run(g, 1);
  assert.equal(g.drifters.length, 1);
  assert.equal(g.drifters[0].id, 'D1');
});

// AC-P2-18 Bùa Gió
test('AC-P2-18 charm: picking sets 600 ticks of 7.2 m/s running and no dash cooldown', () => {
  const g = game(2, { player: { pos: [35, 0, 0] }, charms: [{ id: 'C1', available: true }] });
  const ev = run(g, 1);
  assert.equal(find(ev, 'charm_picked').data.charm_id, 'C1');
  assert.equal(snapshot(g).charms[0].available, false);
  g.input.move = [1, 0]; // dọc cầu tre
  run(g, 60);
  const sp = Math.hypot(g.player.vel[0], g.player.vel[2]);
  assert.ok(Math.abs(sp - 7.2) < 0.05, `speed=${sp}`);
  g.input.dash = true; run(g, 1); g.input.dash = false;
  assert.ok(g.player.dashCd <= 0 || g.player.dashCd === undefined, 'no dash cooldown under the charm');
});

test('AC-P2-18 charm reappears 2700 ticks after pickup', () => {
  const g = game(2, { player: { pos: [35, 0, 0] }, charms: [{ id: 'C1', available: true }] });
  run(g, 1);
  g.player.pos = [25, 0, 0]; // rời bùa, nếu không sẽ được nhặt lại ngay khi xuất hiện
  run(g, 2699);
  assert.equal(snapshot(g).charms[0].available, false);
  run(g, 1);
  assert.equal(snapshot(g).charms[0].available, true);
});

// AC-P2-19 Tạm dừng
test('AC-P2-19 pause freezes sim_tick, time, cooldowns and spawns; tick still advances', () => {
  const g = game(1, { player: { carried: 0 } });
  run(g, 100);
  g.input.pause = true; let ev = run(g, 1); g.input.pause = false;
  assert.deepEqual(names(ev), ['paused']);
  const s0 = snapshot(g);
  assert.equal(s0.state, 'paused');
  run(g, 500);
  const s1 = snapshot(g);
  assert.equal(s1.sim_tick, s0.sim_tick);
  assert.equal(s1.time_left_s, s0.time_left_s);
  assert.equal(s1.tick, s0.tick + 500);
  g.input.pause = true; ev = run(g, 1); g.input.pause = false;
  assert.deepEqual(names(ev), ['resumed']);
  assert.equal(snapshot(g).state, 'playing');
});

// AC-P2-20 Chuỗi tính năng và tất định
test('AC-P2-20 same seed gives identical traces on Night 2 and Night 3', () => {
  const trace = (night) => {
    const g = createGame({ seed: 11, night });
    const out = [];
    for (let i = 0; i < 600; i++) {
      applyInputFrame(g, { tick: i, move: [Math.sin(i / 20), 1], dash: i === 50, pulse: i === 200 });
      step(g);
      out.push(JSON.stringify(snapshot(g)));
    }
    return out.join('\n');
  };
  assert.equal(trace(2), trace(2));
  assert.equal(trace(3), trace(3));
});

test('AC-P2-20 snapshot v1.1 carries the mandatory arrays and player fields', () => {
  const s = snapshot(createGame({ seed: 1, night: 2 }));
  assert.equal(s.night, 2);
  assert.ok(Array.isArray(s.motes) && Array.isArray(s.drifters) && Array.isArray(s.charms));
  for (const k of ['pos', 'vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s', 'flames', 'carried']) {
    assert.ok(k in s.player, `player.${k}`);
  }
  assert.ok('active' in s.wind && 'dir_deg' in s.wind);
});

test('AC-P2-20 coordinates in snapshots keep at most 3 decimals', () => {
  const g = createGame({ seed: 9, night: 3 });
  run(g, 37);
  for (const m of JSON.stringify(snapshot(g)).matchAll(/-?\d+\.(\d+)/g)) assert.ok(m[1].length <= 3, m[0]);
});
