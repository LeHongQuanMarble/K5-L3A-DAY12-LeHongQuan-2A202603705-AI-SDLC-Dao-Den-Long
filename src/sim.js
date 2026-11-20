// Lõi mô phỏng Đêm 1. Thuần logic, không phụ thuộc hiển thị: headless và trình duyệt dùng chung.
// Hệ tọa độ: mét, Y hướng lên, đất ở Y=0. Khoảng cách tính trên mặt phẳng XZ, "trong bán kính r" nghĩa là <= r.
import { TUNING as T, SCORE } from './tuning.js';
import { createRng } from './rng.js';

export const DT = 1 / 60;

const TWO_PI = Math.PI * 2;

const r3 = (x) => {
  const v = Math.round(x * 1000) / 1000;
  return Object.is(v, -0) ? 0 : v;
};
const r3v = (v) => [r3(v[0]), r3(v[1]), r3(v[2])];
const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

function clampIsland(pos) {
  const d = Math.hypot(pos[0], pos[2]);
  if (d > T.island_radius) {
    const k = T.island_radius / d;
    pos[0] *= k;
    pos[2] *= k;
  }
}

function event(game, name, data) {
  game.events.push({ name, tick: game.tick, data });
}

function makeShade(game, pos, id) {
  if (id === undefined) id = `S${game.nextShadeNo++}`;
  return { id, pos: [...pos], state: 'chasing', stun: 0 };
}

function randomMotePos(rng) {
  const r = (T.island_radius - 0.5) * Math.sqrt(rng());
  const a = TWO_PI * rng();
  return [r * Math.cos(a), 0, r * Math.sin(a)];
}

function randomEdgePos(rng) {
  const a = TWO_PI * rng();
  return [T.island_radius * Math.cos(a), 0, T.island_radius * Math.sin(a)];
}

export function createGame({ seed = 0, scenario = null } = {}) {
  const sc = scenario ?? {};
  const rng = createRng(seed);
  const game = {
    seed,
    tick: 0,
    state: 'playing',
    timeBase: T.night1_duration_s,
    score: 0,
    rng,
    nextShadeNo: 1,
    spawnTimer: T.shade_spawn_interval_s,
    allowSpawn: sc.random_shades !== false,
    pulseCooldown: 0,
    player: { pos: [0, 0, 0], vy: 0, onGround: true, carried: 0, flames: T.flames, invuln: 0 },
    input: { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false },
    prevButtons: { jump: false, interact: false, pulse: false, dash: false },
    lanterns: [],
    motes: [],
    shades: [],
    events: [],
  };

  for (let i = 0; i < T.lantern_count_night1; i++) {
    const a = (TWO_PI * i) / T.lantern_count_night1 + 0.3;
    game.lanterns.push({
      id: `L${i + 1}`,
      pos: [T.lantern_ring_radius * Math.cos(a), 0, T.lantern_ring_radius * Math.sin(a)],
      lit: false,
      deposited: 0,
    });
  }

  if (sc.time_left_s !== undefined) game.timeBase = sc.time_left_s;

  if (sc.player) {
    if (sc.player.pos) game.player.pos = [...sc.player.pos];
    if (sc.player.carried !== undefined) game.player.carried = sc.player.carried;
    if (sc.player.flames !== undefined) game.player.flames = sc.player.flames;
  }

  for (const upd of sc.lanterns ?? []) {
    const l = game.lanterns.find((x) => x.id === upd.id);
    if (upd.pos) l.pos = [...upd.pos];
    if (upd.lit !== undefined) {
      l.lit = upd.lit;
      l.deposited = upd.lit ? T.lantern_cost : 0;
    }
  }

  if (sc.motes !== undefined) {
    game.motes = sc.motes.map((m) => [...m]);
  } else if (sc.random_motes === false) {
    game.motes = [];
  } else {
    for (let i = 0; i < T.mote_count; i++) game.motes.push(randomMotePos(rng));
  }

  if (sc.shades !== undefined) {
    game.shades = sc.shades.map((s) => makeShade(game, s.pos, s.id));
  } else if (sc.random_shades === false) {
    game.shades = [];
  } else {
    for (let i = 0; i < T.shade_start_count; i++) game.shades.push(makeShade(game, randomEdgePos(rng)));
  }

  return game;
}

// Áp một frame của inputs. Frame chỉ đổi các trường nó có.
export function applyInputFrame(game, frame) {
  const inp = game.input;
  if (frame.move !== undefined) inp.move = [...frame.move];
  if (frame.cam_yaw_deg !== undefined) inp.cam_yaw_deg = frame.cam_yaw_deg;
  for (const b of ['jump', 'interact', 'pulse', 'dash']) {
    if (frame[b] !== undefined) inp[b] = frame[b];
  }
}

export function timeLeft(game) {
  return game.timeBase - game.tick / 60;
}

function endGame(game, result, reason) {
  game.state = result;
  event(game, 'game_over', { result, reason });
}

// Chạy đúng một tick (1/60 s) theo game.input hiện tại. Sau bước này game.tick tăng 1.
export function step(game) {
  if (game.state !== 'playing') return game.events;
  game.events = [];
  game.tick += 1;

  const p = game.player;
  const inp = game.input;
  const prev = game.prevButtons;
  const pressed = (b) => inp[b] && !prev[b];
  const jumpPressed = pressed('jump');
  const interactPressed = pressed('interact');
  const pulsePressed = pressed('pulse');
  game.prevButtons = { jump: inp.jump, interact: inp.interact, pulse: inp.pulse, dash: inp.dash };

  // 1. Di chuyển: chuẩn hóa vector, xoay theo camera.
  let mx = inp.move[0];
  let mz = inp.move[1];
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const yaw = (inp.cam_yaw_deg * Math.PI) / 180;
  const wx = mx * Math.cos(yaw) + mz * Math.sin(yaw);
  const wz = -mx * Math.sin(yaw) + mz * Math.cos(yaw);
  p.pos[0] += wx * T.player_speed * DT;
  p.pos[2] += wz * T.player_speed * DT;
  clampIsland(p.pos);

  // 2. Nhảy và trọng lực.
  if (jumpPressed && p.onGround) {
    p.vy = T.jump_velocity;
    p.onGround = false;
  }
  if (!p.onGround) {
    p.vy -= T.gravity * DT;
    p.pos[1] += p.vy * DT;
    if (p.pos[1] <= 0) {
      p.pos[1] = 0;
      p.vy = 0;
      p.onGround = true;
    }
  }

  // 3. Đếm thời gian hồi chiêu và bất tử.
  if (game.pulseCooldown > 0) game.pulseCooldown = Math.max(0, game.pulseCooldown - DT);
  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - DT);

  // 4. Nhặt đom đóm.
  game.motes = game.motes.filter((m) => {
    if (p.carried < T.carry_capacity && distXZ(p.pos, m) <= T.pickup_radius) {
      p.carried += 1;
      event(game, 'mote_picked', { carried: p.carried });
      return false;
    }
    return true;
  });

  // 5. Nạp đom đóm vào đèn gần nhất chưa sáng.
  if (interactPressed) {
    let target = null;
    let best = Infinity;
    for (const l of game.lanterns) {
      if (l.lit) continue;
      const d = distXZ(p.pos, l.pos);
      if (d <= T.interact_radius && d < best) { best = d; target = l; }
    }
    if (target && p.carried > 0) {
      const amount = Math.min(p.carried, T.lantern_cost - target.deposited);
      p.carried -= amount;
      target.deposited += amount;
      game.score += amount * SCORE.per_mote;
      event(game, 'deposit', { lantern_id: target.id, amount, deposited: target.deposited });
      if (target.deposited >= T.lantern_cost) {
        target.lit = true;
        game.score += SCORE.per_lantern;
        event(game, 'lantern_lit', { lantern_id: target.id });
      }
    }
  }

  // 6. Tỏa sáng: đốt đom đóm, choáng và đẩy Bóng Mực trong tầm.
  if (pulsePressed && game.pulseCooldown <= 0 && p.carried >= T.pulse_cost) {
    p.carried -= T.pulse_cost;
    game.pulseCooldown = T.pulse_cooldown_s;
    const stunned = [];
    for (const s of game.shades) {
      if (distXZ(p.pos, s.pos) > T.pulse_radius) continue;
      stunned.push(s.id);
      if (s.state !== 'stunned') game.score += SCORE.per_stun;
      s.state = 'stunned';
      s.stun = T.pulse_stun_s;
      let dx = s.pos[0] - p.pos[0];
      let dz = s.pos[2] - p.pos[2];
      const d = Math.hypot(dx, dz);
      if (d > 0) { dx /= d; dz /= d; } else { dx = 1; dz = 0; }
      s.pos[0] += dx * T.pulse_push_m;
      s.pos[2] += dz * T.pulse_push_m;
      clampIsland(s.pos);
    }
    event(game, 'pulse', { stunned_ids: stunned });
  }

  // 7. Bóng Mực mới xuất hiện theo chu kỳ.
  game.spawnTimer -= DT;
  if (game.spawnTimer <= 0) {
    game.spawnTimer = T.shade_spawn_interval_s;
    if (game.allowSpawn && game.shades.length < T.shade_max) {
      const s = makeShade(game, randomEdgePos(game.rng));
      game.shades.push(s);
      event(game, 'shade_spawned', { id: s.id });
    }
  }

  // 8. Bóng Mực di chuyển; không vào safe_radius của đèn đã sáng.
  const litLanterns = game.lanterns.filter((l) => l.lit);
  for (const s of game.shades) {
    if (s.state === 'stunned') {
      s.stun -= DT;
      if (s.stun <= 0) { s.stun = 0; s.state = 'chasing'; }
      continue;
    }
    const dx = p.pos[0] - s.pos[0];
    const dz = p.pos[2] - s.pos[2];
    const d = Math.hypot(dx, dz);
    if (d < 1e-9) continue;
    const stepLen = Math.min(T.shade_speed * DT, d);
    const nx = s.pos[0] + (dx / d) * stepLen;
    const nz = s.pos[2] + (dz / d) * stepLen;
    const blocked = litLanterns.some((l) => Math.hypot(nx - l.pos[0], nz - l.pos[2]) <= T.safe_radius);
    if (!blocked) { s.pos[0] = nx; s.pos[2] = nz; }
    clampIsland(s.pos);
  }

  // 9. Va chạm: một lần trúng mỗi tick, sau đó bất tử.
  if (p.invuln <= 0) {
    const hitter = game.shades.find((s) => s.state !== 'stunned' && distXZ(p.pos, s.pos) <= T.shade_hit_radius);
    if (hitter) {
      p.flames -= 1;
      const dropped = Math.floor(p.carried * T.hit_drop_ratio);
      p.carried -= dropped;
      p.invuln = T.invuln_s;
      event(game, 'player_hit', { by: 'shade', flames: p.flames, dropped });
    }
  }

  // 10. Kết thúc: thắng trước, rồi hết HP, rồi bình minh.
  if (game.lanterns.every((l) => l.lit)) {
    const t = Math.max(0, Math.floor(timeLeft(game)));
    game.score += t * SCORE.per_second_left + Math.max(0, p.flames) * SCORE.per_flame_left;
    endGame(game, 'won', 'all_lit');
  } else if (p.flames <= 0) {
    endGame(game, 'lost', 'no_flames');
  } else if (timeLeft(game) <= 0) {
    endGame(game, 'lost', 'dawn');
  }

  return game.events;
}

export function snapshot(game) {
  return {
    type: 'snapshot',
    tick: game.tick,
    sim_tick: game.tick,
    state: game.state,
    time_left_s: r3(timeLeft(game)),
    score: game.score,
    player: { pos: r3v(game.player.pos), flames: game.player.flames, carried: game.player.carried },
    lanterns: game.lanterns.map((l) => ({ id: l.id, pos: r3v(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: game.shades.map((s) => ({ id: s.id, pos: r3v(s.pos), state: s.state })),
    motes_active: game.motes.length,
    motes: game.motes.map(r3v),
  };
}
