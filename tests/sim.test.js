import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, snapshot, applyInputFrame } from '../src/sim.js';
import { normalizeScenario } from '../src/scenario.js';
import { TUNING as T, SCORE } from '../src/tuning.js';

const DT = 1 / 60;
const quiet = (extra = {}) =>
  normalizeScenario({ random_motes: false, random_shades: false, ...extra });
const run = (g, n) => { const ev = []; for (let i = 0; i < n; i++) { step(g); ev.push(...g.events); } return ev; };
const names = (ev) => ev.map((e) => e.name);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

test('initial state follows PRD-0', () => {
  const g = createGame({ seed: 7, scenario: quiet() });
  assert.equal(g.lanterns.length, 5);
  assert.deepEqual(g.lanterns.map((l) => l.id), ['L1', 'L2', 'L3', 'L4', 'L5']);
  assert.ok(g.lanterns.every((l) => !l.lit && l.deposited === 0));
  assert.deepEqual(g.player.pos, [0, 0, 0]);
  assert.equal(g.player.flames, T.flames);
  assert.equal(g.player.carried, 0);
  assert.equal(g.state, 'playing');
  const s = snapshot(g);
  assert.equal(s.tick, 0);
  assert.equal(s.time_left_s, T.night1_duration_s);
});

test('move [0,1] with yaw 0 walks +Z at player_speed', () => {
  const g = createGame({ seed: 1, scenario: quiet() });
  g.input.move = [0, 1];
  run(g, 60);
  assert.ok(Math.abs(g.player.pos[2] - T.player_speed) < 1e-9, `z=${g.player.pos[2]}`);
  assert.ok(Math.abs(g.player.pos[0]) < 1e-12);
});

test('diagonal input is normalized: speed stays player_speed', () => {
  const g = createGame({ seed: 1, scenario: quiet() });
  g.input.move = [1, 1];
  run(g, 60);
  assert.ok(Math.abs(dist(g.player.pos, [0, 0, 0]) - T.player_speed) < 1e-9);
});

test('camera yaw rotates movement: yaw 90 turns forward into +X', () => {
  const g = createGame({ seed: 1, scenario: quiet() });
  g.input.move = [0, 1];
  g.input.cam_yaw_deg = 90;
  run(g, 60);
  assert.ok(Math.abs(g.player.pos[0] - T.player_speed) < 1e-9, `x=${g.player.pos[0]}`);
  assert.ok(Math.abs(g.player.pos[2]) < 1e-9, `z=${g.player.pos[2]}`);
});

test('player stays on the island (no fall, clamped to island_radius)', () => {
  const g = createGame({ seed: 1, scenario: quiet() });
  g.input.move = [1, 0];
  run(g, 600);
  assert.ok(dist(g.player.pos, [0, 0, 0]) <= T.island_radius + 1e-9);
  assert.equal(g.player.pos[1], 0);
});

test('jump leaves the ground and lands at Y=0', () => {
  const g = createGame({ seed: 1, scenario: quiet() });
  g.input.jump = true;
  step(g);
  g.input.jump = false;
  let peak = 0;
  for (let i = 0; i < 120; i++) { step(g); peak = Math.max(peak, g.player.pos[1]); }
  assert.ok(peak > 0.1, `peak=${peak}`);
  assert.equal(g.player.pos[1], 0);
  assert.equal(g.player.onGround, true);
});

test('mote within pickup_radius is picked up and emits mote_picked', () => {
  const g = createGame({ seed: 1, scenario: quiet({ motes: [[0.5, 0, 0]] }) });
  const ev = run(g, 1);
  assert.equal(g.player.carried, 1);
  assert.equal(g.motes.length, 0);
  assert.deepEqual(ev.find((e) => e.name === 'mote_picked').data, { carried: 1 });
});

test('mote outside pickup_radius is left alone', () => {
  const g = createGame({ seed: 1, scenario: quiet({ motes: [[T.pickup_radius + 0.5, 0, 0]] }) });
  run(g, 1);
  assert.equal(g.player.carried, 0);
  assert.equal(g.motes.length, 1);
});

test('carry_capacity limits pickups', () => {
  const motes = Array.from({ length: T.carry_capacity + 3 }, () => [0, 0, 0]);
  const g = createGame({ seed: 1, scenario: quiet({ motes }) });
  run(g, 1);
  assert.equal(g.player.carried, T.carry_capacity);
  assert.equal(g.motes.length, 3);
});

test('interact deposits up to lantern_cost, lights the lantern and scores', () => {
  const g = createGame({ seed: 1, scenario: quiet({ lanterns: [] }) });
  g.player.carried = 4;
  g.player.pos = [...g.lanterns[0].pos];
  g.input.interact = true;
  const ev = run(g, 1);
  assert.equal(g.player.carried, 4 - T.lantern_cost);
  assert.equal(g.lanterns[0].lit, true);
  assert.equal(g.lanterns[0].deposited, T.lantern_cost);
  assert.deepEqual(names(ev), ['deposit', 'lantern_lit']);
  assert.deepEqual(ev[0].data, { lantern_id: 'L1', amount: T.lantern_cost, deposited: T.lantern_cost });
  assert.equal(g.score, T.lantern_cost * SCORE.per_mote + SCORE.per_lantern);
});

test('interact is edge-triggered: holding the button deposits once', () => {
  const g = createGame({ seed: 1, scenario: quiet({ lanterns: [] }) });
  g.player.carried = 5;
  g.player.pos = [...g.lanterns[0].pos];
  g.input.interact = true;
  run(g, 10);
  assert.equal(g.lanterns[0].deposited, T.lantern_cost);
  assert.equal(g.player.carried, 5 - T.lantern_cost);
});

test('interact far from lanterns does nothing', () => {
  const g = createGame({ seed: 1, scenario: quiet() });
  g.player.carried = 2;
  g.input.interact = true;
  const ev = run(g, 1);
  assert.equal(ev.length, 0);
  assert.equal(g.player.carried, 2);
});

test('lighting all 5 lanterns wins with all_lit and time/flame bonus', () => {
  const lanterns = [1, 2, 3, 4].map((i) => ({ id: `L${i}`, lit: true }));
  lanterns.push({ id: 'L5', pos: [6, 0, 0] });
  const g = createGame({ seed: 1, scenario: quiet({ lanterns, player: { pos: [5.5, 0, 0], carried: 3 } }) });
  g.input.interact = true;
  const ev = run(g, 1);
  assert.equal(g.state, 'won');
  const over = ev.find((e) => e.name === 'game_over');
  assert.deepEqual(over.data, { result: 'won', reason: 'all_lit' });
  const timeLeftBonus = Math.floor(T.night1_duration_s - 1 / 60) * SCORE.per_second_left;
  const flameBonus = T.flames * SCORE.per_flame_left;
  assert.equal(g.score, T.lantern_cost * SCORE.per_mote + SCORE.per_lantern + timeLeftBonus + flameBonus);
});

test('time running out ends the night as lost with reason dawn', () => {
  const g = createGame({ seed: 1, scenario: quiet({ time_left_s: 2 / 60 }) });
  const ev1 = run(g, 1);
  assert.equal(g.state, 'playing');
  assert.equal(names(ev1).length, 0);
  const ev2 = run(g, 1);
  assert.equal(g.state, 'lost');
  assert.deepEqual(ev2.find((e) => e.name === 'game_over').data, { result: 'lost', reason: 'dawn' });
});

test('shade touching the player costs 1 flame, drops carried fireflies and grants invulnerability', () => {
  const g = createGame({ seed: 1, scenario: quiet({ shades: [{ pos: [0.5, 0, 0] }], player: { carried: 4 } }) });
  const ev = run(g, 1);
  assert.equal(g.player.flames, T.flames - 1);
  assert.equal(g.player.carried, 4 - Math.floor(4 * T.hit_drop_ratio));
  assert.deepEqual(ev.find((e) => e.name === 'player_hit').data, {
    by: 'shade', flames: T.flames - 1, dropped: Math.floor(4 * T.hit_drop_ratio),
  });
  run(g, 10);
  assert.equal(g.player.flames, T.flames - 1, 'no second hit during invuln_s');
});

test('losing the last flame ends the night with reason no_flames', () => {
  const g = createGame({ seed: 1, scenario: quiet({ shades: [{ pos: [0.5, 0, 0] }], player: { flames: 1 } }) });
  const ev = run(g, 1);
  assert.equal(g.state, 'lost');
  assert.deepEqual(ev.find((e) => e.name === 'game_over').data, { result: 'lost', reason: 'no_flames' });
});

test('pulse costs pulse_cost, stuns shades in range, pushes them and scores per_stun', () => {
  const g = createGame({ seed: 1, scenario: quiet({ shades: [{ id: 'SH1', pos: [2, 0, 0] }], player: { carried: 2 } }) });
  g.input.pulse = true;
  const ev = run(g, 1);
  assert.equal(g.player.carried, 2 - T.pulse_cost);
  assert.deepEqual(ev.find((e) => e.name === 'pulse').data, { stunned_ids: ['SH1'] });
  const sh = g.shades[0];
  assert.equal(sh.state, 'stunned');
  assert.ok(Math.abs(sh.pos[0] - (2 + T.pulse_push_m)) < 1e-9, `x=${sh.pos[0]}`);
  assert.equal(g.score, SCORE.per_stun);
});

test('stunned shade does not move or hit, and wakes after pulse_stun_s', () => {
  const g = createGame({ seed: 1, scenario: quiet({ shades: [{ id: 'SH1', pos: [3, 0, 0] }], player: { carried: 2 } }) });
  g.input.pulse = true;
  run(g, 1);
  g.input.pulse = false;
  const before = [...g.shades[0].pos];
  run(g, 60);
  assert.deepEqual(g.shades[0].pos, before);
  assert.equal(g.player.flames, T.flames);
  run(g, Math.ceil(T.pulse_stun_s * 60));
  assert.equal(g.shades[0].state, 'chasing');
});

test('pulse respects cooldown and needs enough light', () => {
  const g = createGame({ seed: 1, scenario: quiet({ shades: [{ pos: [2, 0, 0] }], player: { carried: 5 } }) });
  g.input.pulse = true; run(g, 1);
  g.input.pulse = false; run(g, 1);
  g.input.pulse = true; const ev = run(g, 1);
  assert.equal(g.player.carried, 5 - T.pulse_cost, 'second pulse blocked by cooldown');
  assert.equal(ev.length, 0);

  const h = createGame({ seed: 1, scenario: quiet({ shades: [{ pos: [2, 0, 0] }], player: { carried: 0 } }) });
  h.input.pulse = true; const ev2 = run(h, 1);
  assert.equal(ev2.length, 0, 'no pulse without light');
});

test('lit lantern keeps shades out of safe_radius', () => {
  const g = createGame({
    seed: 1,
    scenario: quiet({ lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], shades: [{ pos: [8, 0, 0] }], player: { pos: [-8, 0, 0] } }),
  });
  run(g, 600);
  assert.equal(g.state, 'playing');
  assert.ok(dist(g.shades[0].pos, [0, 0, 0]) > T.safe_radius, `d=${dist(g.shades[0].pos, [0, 0, 0])}`);
});

test('shades chase the player', () => {
  const g = createGame({ seed: 1, scenario: quiet({ shades: [{ pos: [0, 0, 10] }] }) });
  const d0 = dist(g.shades[0].pos, g.player.pos);
  run(g, 60);
  assert.ok(dist(g.shades[0].pos, g.player.pos) < d0 - 1);
});

test('same seed and same inputs give identical snapshots', () => {
  const trace = (seed) => {
    const g = createGame({ seed });
    const out = [];
    for (let i = 0; i < 300; i++) {
      applyInputFrame(g, { tick: i, move: [Math.sin(i / 10), 1], pulse: i === 100 });
      step(g);
      out.push(JSON.stringify(snapshot(g)));
    }
    return out.join('\n');
  };
  assert.equal(trace(42), trace(42));
  assert.notEqual(trace(42), trace(43));
});

test('applyInputFrame changes only the fields a frame contains', () => {
  const g = createGame({ seed: 1, scenario: quiet() });
  applyInputFrame(g, { tick: 0, move: [0, 1], cam_yaw_deg: 30 });
  applyInputFrame(g, { tick: 5, interact: true });
  assert.deepEqual(g.input.move, [0, 1]);
  assert.equal(g.input.cam_yaw_deg, 30);
  assert.equal(g.input.interact, true);
});

test('coordinates in snapshots have at most 3 decimals', () => {
  const g = createGame({ seed: 9 });
  run(g, 37);
  const s = JSON.stringify(snapshot(g));
  for (const m of s.matchAll(/-?\d+\.(\d+)/g)) assert.ok(m[1].length <= 3, m[0]);
});
