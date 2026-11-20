// Kiểm thử Phase 3 (Ticket-03 "Đèn cạn dầu", Contract v1.2): nhiên liệu, Bóng Mực hút dầu, luật thắng mới,
// sức chứa tăng dần, điểm mới. Mỗi test ứng với một mục trong specs/phase-3/spec.md (mã AC-P3-*).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, snapshot, timeLeft } from '../src/sim.js';
import { normalizeScenario } from '../src/scenario.js';
import { TUNING as T, SCORE } from '../src/tuning.js';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const run = (g, n) => { const ev = []; for (let i = 0; i < n; i++) { step(g); ev.push(...g.events); } return ev; };
const find = (ev, name) => ev.find((e) => e.name === name);
const acts = (ev) => ev.filter((e) => e.name !== 'night_start');
// Nhiên liệu tính theo số thực để so sánh với đặc tả (sim lưu đơn vị 1/60 nội bộ).
const fuel = (l) => l.fuelU / 60;
const quiet = (extra = {}) => normalizeScenario({ random_motes: false, random_shades: false, random_drifters: false, ...extra });
const game = (night, extra = {}, seed = 1) => createGame({ seed, night, scenario: quiet(extra) });

// AC-P3-01 Số liệu v1.2
test('AC-P3-01 tuning and score match Ticket-03 section 7', () => {
  assert.equal(T.fuel_max, 100);
  assert.equal(T.fuel_decay_per_s, 1.0);
  assert.equal(T.fuel_per_mote, 10);
  assert.equal(T.relight_cost, 5);
  assert.equal(T.win_ratio, 0.6);
  assert.equal(T.drain_per_s, 5);
  assert.equal(T.low_fuel_threshold, 30);
  assert.equal(T.capacity_max, 20);
  assert.equal(T.night1_duration_s, 240);
  assert.equal(T.night2_duration_s, 270);
  assert.equal(T.night3_duration_s, 300);
  assert.equal(SCORE.per_mote, 5);
  assert.equal(SCORE.per_relight, 40);
  assert.equal(SCORE.per_drain_stun, 10);
  assert.equal(SCORE.per_lit_end, 50);
  assert.equal(SCORE.per_fuel_end, 1);
  assert.equal(SCORE.per_flame_left, 50);
  assert.equal(SCORE.per_second_left, undefined, 'bỏ thưởng thời gian');
});

// AC-P3-02 Hao hụt 1 fuel/giây khi đang sáng
test('AC-P3-02 a lit lantern burns 1 fuel per second', () => {
  const g = game(1, { lanterns: [{ id: 'L1', lit: true, fuel: 100 }] });
  run(g, 60);
  assert.equal(fuel(g.lanterns[0]), 99);
  assert.equal(snapshot(g).lanterns[0].fuel, 99);
});

// AC-P3-03 Châm dầu: used = min(đang mang, ceil((100 − fuel) / 10)), mỗi đom đóm +10 fuel
test('AC-P3-03 refuel uses min(carried, ceil((100-fuel)/10)) fireflies, +10 fuel each, +5 points each', () => {
  const g = game(1, { lanterns: [{ id: 'L1', lit: true, fuel: 50 }], player: { carried: 3 } });
  g.player.pos = [...g.lanterns[0].pos];
  g.input.interact = true;
  const ev = acts(run(g, 1));
  assert.equal(g.player.carried, 0);
  assert.deepEqual(find(ev, 'refuel').data, { lantern_id: 'L1', amount: 3, fuel: 80 });
  assert.equal(g.score, 3 * SCORE.per_mote);
});

test('AC-P3-03 refuel stops at 100 fuel (ceil of the missing part)', () => {
  const g = game(1, { lanterns: [{ id: 'L1', lit: true, fuel: 95 }], player: { carried: 10 } });
  g.player.pos = [...g.lanterns[0].pos];
  g.input.interact = true;
  const ev = acts(run(g, 1));
  assert.equal(g.player.carried, 9);
  assert.deepEqual(find(ev, 'refuel').data, { lantern_id: 'L1', amount: 1, fuel: 100 });
});

// AC-P3-04 Đèn đầy dầu không được chọn
test('AC-P3-04 a full lantern is never chosen by interact', () => {
  const g = game(1, { lanterns: [{ id: 'L1', lit: true, fuel: 100 }], player: { carried: 10 } });
  g.player.pos = [...g.lanterns[0].pos];
  g.input.interact = true;
  const ev = acts(run(g, 1));
  assert.equal(ev.length, 0);
  assert.equal(g.player.carried, 10);
});

// AC-P3-05 Hết dầu: đèn tắt, deposited = 0, ever_lit = true, sự kiện lantern_out
test('AC-P3-05 fuel reaching 0 turns the lantern off and emits lantern_out', () => {
  const g = game(1, { lanterns: [{ id: 'L1', lit: true, fuel: 1 / 60 }] });
  const ev = run(g, 1);
  assert.equal(g.lanterns[0].lit, false);
  assert.equal(g.lanterns[0].deposited, 0);
  assert.equal(g.lanterns[0].everLit ?? g.lanterns[0].ever_lit, true);
  assert.deepEqual(find(ev, 'lantern_out').data, { lantern_id: 'L1' });
});

// AC-P3-06 Thắp lại: đã từng sáng cần 5, chưa từng sáng cần 10
test('AC-P3-06 a lantern that was lit before relights with 5 fireflies (+40 points)', () => {
  const g = game(1, { lanterns: [{ id: 'L1', ever_lit: true }], player: { carried: 5 } });
  g.player.pos = [...g.lanterns[0].pos];
  g.input.interact = true;
  const ev = acts(run(g, 1));
  assert.deepEqual(find(ev, 'lantern_lit').data, { lantern_id: 'L1', relight: true });
  assert.equal(g.lanterns[0].lit, true);
  assert.equal(fuel(g.lanterns[0]), 100);
  assert.equal(g.score, 5 * SCORE.per_mote + SCORE.per_relight);
  assert.equal(g.lanterns[0].relit_count ?? g.lanterns[0].relitCount, 1);
});

test('AC-P3-06 a never-lit lantern still needs 10 fireflies (+100 points)', () => {
  const g = game(1, { player: { carried: 9 } });
  g.player.pos = [...g.lanterns[0].pos];
  g.input.interact = true;
  run(g, 1);
  assert.equal(g.lanterns[0].lit, false);
  assert.equal(g.lanterns[0].deposited, 9);
});

// AC-P3-07 Sức chứa 10 + 2 × lần thắp thành công, tối đa 20
test('AC-P3-07 capacity grows by 2 per successful light (cap 20), relights count', () => {
  const g = game(1);
  assert.equal(snapshot(g).player.capacity, 10);
  g.player.successful_lights = 0;
  const h = game(1, { player: { successful_lights: 1 } });
  assert.equal(snapshot(h).player.capacity, 12);
  const k = game(1, { player: { successful_lights: 9 } });
  assert.equal(snapshot(k).player.capacity, 20);
});

test('AC-P3-07 successful lights from play raise the capacity, scenario presets do not count', () => {
  const g = game(1, { lanterns: [{ id: 'L1', lit: true }], player: { carried: 10 } });
  assert.equal(snapshot(g).player.capacity, 10, 'preset lantern does not count');
  g.player.pos = [...g.lanterns[1].pos];
  g.player.carried = 10;
  g.lanterns[1].deposited = 0;
  g.lanterns[1].pos = [...g.lanterns[1].pos];
  g.input.interact = true;
  run(g, 1);
  assert.equal(g.lanterns[1].lit, true);
  assert.equal(snapshot(g).player.capacity, 12);
});

test('AC-P3-07 pickup respects the grown capacity', () => {
  const motes = Array.from({ length: 13 }, () => [0, 0, 0]);
  const g = game(1, { motes, player: { successful_lights: 1 } });
  run(g, 1);
  assert.equal(g.player.carried, 12);
});

// AC-P3-08 Không còn thắng sớm
test('AC-P3-08 lighting every lantern does not end the night', () => {
  const lanterns = [1, 2, 3, 4, 5].map((i) => ({ id: `L${i}`, lit: true, fuel: 100 }));
  const g = game(1, { lanterns });
  const ev = run(g, 60);
  assert.equal(g.state, 'playing');
  assert.equal(find(ev, 'game_over'), undefined);
});

// AC-P3-09 Thắng khi hết giờ: còn sống và đủ đèn sáng
test('AC-P3-09 surviving dawn with enough lit lanterns wins (dawn_survived) and scores the lit lanterns', () => {
  const lanterns = [1, 2, 3].map((i) => ({ id: `L${i}`, lit: true, fuel: 40 }));
  lanterns.push({ id: 'L4' }, { id: 'L5' });
  const g = game(1, { lanterns, time_left_s: 1 / 60 });
  const ev = run(g, 1);
  assert.equal(g.state, 'won');
  assert.deepEqual(find(ev, 'game_over').data, { result: 'won', reason: 'dawn_survived' });
  const endBonus = 3 * (SCORE.per_lit_end + 39) + 3 * SCORE.per_flame_left;
  assert.equal(g.score, endBonus);
});

// AC-P3-10 Ngưỡng theo Đêm
test('AC-P3-10 win threshold: Night 1 needs 3 of 5, Night 2 needs 4 of 6, Night 3 needs 5 of 7', () => {
  const check = (night, litCount, total, expected) => {
    const lanterns = Array.from({ length: total }, (_, i) => ({ id: `L${i + 1}`, lit: i < litCount, fuel: 50 }));
    const g = game(night, { lanterns, time_left_s: 1 / 60 });
    run(g, 1);
    assert.equal(g.state, expected, `night ${night} lit ${litCount}/${total}`);
  };
  check(1, 3, 5, 'won');
  check(1, 2, 5, 'lost');
  check(2, 4, 6, 'won');
  check(2, 3, 6, 'lost');
  check(3, 5, 7, 'won');
  check(3, 4, 7, 'lost');
});

test('AC-P3-10 dawn with too few lit lanterns loses (dawn)', () => {
  const lanterns = [{ id: 'L1', lit: true, fuel: 50 }];
  const g = game(1, { lanterns, time_left_s: 1 / 60 });
  const ev = run(g, 1);
  assert.deepEqual(find(ev, 'game_over').data, { result: 'lost', reason: 'dawn' });
});

test('AC-P3-10 losing the last flame at the final tick is no_flames even with enough light', () => {
  const lanterns = [1, 2, 3].map((i) => ({ id: `L${i}`, lit: true, fuel: 50 }));
  lanterns.push({ id: 'L4' }, { id: 'L5' });
  const g = game(1, { lanterns, time_left_s: 1 / 60, shades: [{ pos: [0.5, 0, 0] }], player: { flames: 1 } });
  const ev = run(g, 1);
  assert.deepEqual(find(ev, 'game_over').data, { result: 'lost', reason: 'no_flames' });
});

// AC-P3-11 Thời gian Đêm
test('AC-P3-11 night durations are 240 / 270 / 300 s', () => {
  assert.equal(createGame({ seed: 1, night: 1 }).timeBase, 240);
  assert.equal(createGame({ seed: 1, night: 2 }).timeBase, 270);
  assert.equal(createGame({ seed: 1, night: 3 }).timeBase, 300);
});

// AC-P3-12 Bóng Mực tìm đèn yếu khi đi lang thang
test('AC-P3-12 a wandering shade heads for the nearest lit lantern with fuel < 30 before unlit ones', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 20], lit: true, fuel: 20 }, { id: 'L2', pos: [0, 0, -20] }],
    shades: [{ id: 'T0', pos: [0, 0, -5], state: 'wander' }],
    player: { pos: [30, 0, 0] },
  });
  run(g, 60);
  assert.ok(g.shades[0].pos[2] > -5 + 3, `moved toward L1 (+z): z=${g.shades[0].pos[2]}`);
});

// AC-P3-13 Hút dầu: đứng yên, hút 5 fuel/s thêm vào hao hụt 1/s
test('AC-P3-13 a shade within 2 m drains 5 fuel per second on top of the 1/s burn', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'T0', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' }],
    player: { pos: [30, 0, 30] },
  });
  run(g, 60);
  assert.equal(fuel(g.lanterns[0]), 14, '20 − 1 − 5 after one second');
  assert.equal(g.shades[0].state, 'drain');
  assert.deepEqual(g.shades[0].pos, [1, 0, 0], 'the drainer stays still');
});

test('AC-P3-13 two shades drain together (10 fuel per second)', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [
      { id: 'T0', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' },
      { id: 'T1', pos: [0, 0, 1], state: 'drain', target_lantern_id: 'L1' },
    ],
    player: { pos: [30, 0, 30] },
  });
  run(g, 60);
  assert.equal(fuel(g.lanterns[0]), 9);
});

test('AC-P3-13 a wandering shade reaching a low lantern (<= 2 m) switches to drain', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'T0', pos: [0, 0, 5], state: 'wander' }],
    player: { pos: [30, 0, 30] },
  });
  run(g, 100); // tới đèn trong ~46 tick; đèn còn sáng (20 fuel cạn sau ~200 tick)
  assert.equal(g.shades[0].state, 'drain');
});

// AC-P3-14 Sự kiện fuel_drain mỗi 60 tick khi đang hút
test('AC-P3-14 fuel_drain is emitted every 60 ticks while draining', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'T0', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' }],
    player: { pos: [30, 0, 30] },
  });
  const ev = run(g, 120).filter((e) => e.name === 'fuel_drain');
  assert.equal(ev.length, 2);
  assert.deepEqual(ev[0].data, { lantern_id: 'L1', shade_id: 'T0', fuel: 14 });
});

// AC-P3-15 Chuyển trạng thái rời drain
test('AC-P3-15 a draining shade turns chase when the player comes within 6 m', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'T0', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' }],
    player: { pos: [5, 0, 0] },
  });
  run(g, 1);
  assert.equal(g.shades[0].state, 'chase');
});

test('AC-P3-15 a draining shade turns wander when its lantern goes out', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 1 / 60 }],
    shades: [{ id: 'T0', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' }],
    player: { pos: [30, 0, 30] },
  });
  run(g, 1);
  assert.equal(g.shades[0].state, 'wander');
});

test('AC-P3-15 refuelling a draining shade\'s lantern with the player nearby turns the shade to chase', () => {
  // Mây phải trong 2 m của đèn để châm, nên Bóng Mực luôn trong 6 m của Mây: ưu tiên chase (A-P3-06).
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 25 }],
    shades: [{ id: 'T0', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' }],
    player: { pos: [0, 0, 0], carried: 1 },
  });
  g.input.interact = true;
  run(g, 1);
  g.input.interact = false;
  assert.ok(fuel(g.lanterns[0]) >= 30);
  assert.equal(g.shades[0].state, 'chase');
});

test('AC-P3-15 a draining shade turns wander when it moves more than 2 m away', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'T0', pos: [3, 0, 0], state: 'drain', target_lantern_id: 'L1' }],
    player: { pos: [30, 0, 30] },
  });
  run(g, 1);
  assert.equal(g.shades[0].state, 'wander');
});

// AC-P3-16 Vùng an toàn chỉ có khi đèn còn từ 30 fuel
test('AC-P3-16 a lit lantern with fuel below 30 has no safe zone', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'T0', pos: [4, 0, 0], state: 'chase' }],
    player: { pos: [-4, 0, 0] },
  });
  run(g, 30);
  assert.ok(dist(g.shades[0].pos, [0, 0, 0]) < 3, 'the shade walks inside 6 m of a weak lantern');
});

test('AC-P3-16 a lit lantern with fuel 30 or more keeps shades out of 6 m', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 100 }],
    shades: [{ id: 'T0', pos: [8, 0, 0], state: 'chase' }],
    player: { pos: [-8, 0, 0] },
  });
  run(g, 300);
  assert.ok(dist(g.shades[0].pos, [0, 0, 0]) >= T.safe_radius - 1e-6);
});

// AC-P3-17 Châm đèn lên từ 30 trở lên khi có Bóng Mực trong 6 m: đẩy ra
test('AC-P3-17 refuelling a weak lantern to 30+ ejects shades within 6 m', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 25 }],
    shades: [{ id: 'T0', pos: [3, 0, 0], state: 'wander' }],
    player: { pos: [0, 0, 0], carried: 1 },
  });
  g.input.interact = true;
  run(g, 1);
  g.input.interact = false;
  assert.ok(fuel(g.lanterns[0]) >= 30);
  assert.equal(g.player.flames, T.flames, 'no damage during the eject');
  run(g, T.eject_ticks);
  assert.ok(dist(g.shades[0].pos, [0, 0, 0]) >= T.safe_radius - 0.01);
});

// AC-P3-18 Tỏa sáng trúng Bóng Mực đang hút: +15 tổng
test('AC-P3-18 a pulse on a draining shade scores 15 in total (5 + 10)', () => {
  const g = game(1, {
    lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ id: 'T0', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' }],
    player: { pos: [1, 0, 2], carried: 3 },
  });
  g.input.pulse = true;
  run(g, 1);
  g.input.pulse = false;
  assert.equal(g.score, SCORE.per_stun + SCORE.per_drain_stun);
  assert.equal(g.shades[0].state, 'stunned');
});

// AC-P3-19 Hết choáng về wander (không còn về chase)
test('AC-P3-19 a stunned shade wakes into wander, even if the player is near', () => {
  const g = game(1, { shades: [{ id: 'T0', pos: [2, 0, 0], state: 'stunned', state_ticks_left: 3 }], player: { pos: [0, 0, 0] } });
  run(g, 3);
  assert.equal(g.shades[0].state, 'wander');
});

// AC-P3-20 Điểm mới: nạp 5, lần đầu 100, lần sau 40
test('AC-P3-20 deposits score 5 per firefly and first lighting scores 100', () => {
  const g = game(1, { player: { carried: 10 } });
  g.player.pos = [...g.lanterns[0].pos];
  g.input.interact = true;
  run(g, 1);
  assert.equal(g.score, 10 * SCORE.per_mote + SCORE.per_lantern);
});

// AC-P3-21 Điểm kết thúc đêm thắng: đèn sáng +50 + floor(fuel), mỗi Ngọn Lửa +50
test('AC-P3-21 end bonus per lit lantern is 50 + floor(fuel); per flame 50', () => {
  const lanterns = [{ id: 'L1', lit: true, fuel: 42.7 }, { id: 'L2', lit: true, fuel: 60 }, { id: 'L3', lit: true, fuel: 30 }];
  lanterns.push({ id: 'L4' }, { id: 'L5' });
  const g = game(1, { lanterns, time_left_s: 1 / 60, player: { flames: 2 } });
  run(g, 1);
  assert.equal(g.state, 'won');
  // Fuel sau tick cuối đã hao 1/60: floor(42.683)=42, floor(59.983)=59, floor(29.983)=29.
  // Điểm = (50+42) + (50+59) + (50+29) + 2×50 = 380.
  assert.equal(g.score, 380);
});

// AC-P3-22 Snapshot v1.2
test('AC-P3-22 snapshot v1.2 carries fuel, ever_lit, relit_count, capacity and drain state', () => {
  const s = snapshot(createGame({ seed: 1, night: 1 }));
  for (const l of s.lanterns) {
    assert.ok('fuel' in l && 'ever_lit' in l && 'relit_count' in l, 'lantern fields');
    assert.equal(l.fuel, 0, 'an unlit lantern has fuel 0');
  }
  assert.ok('capacity' in s.player);
  const h = snapshot(game(1, { lanterns: [{ id: 'L1', lit: true, fuel: 42.37 }] }));
  assert.equal(h.lanterns[0].fuel, 42.4, 'one decimal place');
});

test('AC-P3-22 a shade can report state drain in the snapshot', () => {
  const g = game(1, { lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }], shades: [{ id: 'T0', pos: [1, 0, 0], state: 'drain', target_lantern_id: 'L1' }] });
  assert.equal(snapshot(g).shades[0].state, 'drain');
});

// AC-P3-23 Đầu vào scenario v1.2
test('AC-P3-23 a preset lit lantern without fuel starts with 100 fuel; ever_lit defaults to lit', () => {
  const g = game(1, { lanterns: [{ id: 'L1', lit: true }] });
  assert.equal(fuel(g.lanterns[0]), 100);
  assert.equal(g.lanterns[0].everLit ?? g.lanterns[0].ever_lit, true);
});

// AC-P3-24 Tất định và tốc độ Đêm đầy đủ vẫn trong 30 s
test('AC-P3-24 same seed gives identical output for a Night 3 run with draining', () => {
  const trace = () => {
    const g = createGame({ seed: 21, night: 3 });
    const out = [];
    for (let i = 0; i < 2000; i++) {
      step(g);
      out.push(JSON.stringify(snapshot(g)));
    }
    return out.join('\n');
  };
  assert.equal(trace(), trace());
});

test('AC-P3-24 timeLeft still counts simulated ticks only', () => {
  const g = game(1);
  run(g, 60);
  assert.equal(timeLeft(g), T.night1_duration_s - 1);
});
