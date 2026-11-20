// Lõi mô phỏng Đảo Đèn Lồng (Test Contract v1.1, Phase 2). Thuần logic: headless và trình duyệt dùng chung.
// Hệ tọa độ: mét, Y hướng lên, mặt đất ở Y=0 (hoặc cao hơn nếu đứng trên tầng/cầu).
// Khoảng cách XZ, "trong bán kính r" nghĩa là <= r. Mọi timer nội bộ tính bằng tick (1/60 s).
import { TUNING as T, SCORE } from './tuning.js';
import { createRng } from './rng.js';
import { worldOf, topY, blockedBySolid } from './world.js';

export const DT = 1 / 60;
const tk = (s) => Math.round(s * 60);

const r3 = (x) => {
  const v = Math.round(x * 1000) / 1000;
  return Object.is(v, -0) ? 0 : v;
};
const r3v = (v) => [r3(v[0]), r3(v[1]), r3(v[2])];
const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const norm2 = (x, z, fx = 1, fz = 0) => {
  const d = Math.hypot(x, z);
  return d > 1e-9 ? [x / d, z / d] : [fx, fz];
};
const approach = (v, target, maxDelta) => {
  if (v < target) return Math.min(target, v + maxDelta);
  return Math.max(target, v - maxDelta);
};

const STEP = T.step_up;
const INVULN = tk(T.invuln_s);
const FALL_WAIT = tk(T.fall_wait_s);
const DASH_TICKS = tk(T.dash_duration_s);
const DASH_CD = tk(T.dash_cooldown_s);
const PULSE_CD = tk(T.pulse_cooldown_s);
const STUN = tk(T.pulse_stun_s);
const PUSH_TICKS = tk(T.pulse_push_s);
const RECOIL = tk(T.shade_recoil_s);
const MOTE_SPAWN = tk(T.mote_spawn_interval_s);
const DROP_TTL = tk(T.mote_drop_ttl_s);
const DRIFTER_DROP_TTL = tk(T.drifter_drop_ttl_s);
const FLEE = tk(T.drifter_flee_s);
const DRIFTER_SPAWN = tk(T.drifter_spawn_s);
const CHARM_TICKS = tk(T.charm_duration_s);
const CHARM_RESPAWN = tk(T.charm_respawn_s);
const SHADE_FIRST = tk(T.shade_spawn_first_s);
const WIND_PERIOD = tk(T.wind_period_s);
const WIND_WARN = tk(T.wind_warn_s);
const WIND_DUR = tk(T.wind_duration_s);
const FALL_FLOOR = T.fall_floor_y;

function event(game, name, data) {
  game.events.push({ name, tick: game.tick, data });
}

function timeLeft(game) {
  return game.timeBase - game.simTick / 60;
}

function endGame(game, result, reason) {
  game.state = result;
  event(game, 'game_over', { result, reason });
}

// ---------- Khởi tạo ----------

function makeShade(game, id, pos, state) {
  if (id === undefined) id = `S${game.nextShadeNo++}`;
  return { id, pos: [...pos], state, stun: 0, push: 0, pushDir: [1, 0], recoil: 0, recoilDir: [1, 0], eject: 0, ejectCenter: [0, 0] };
}

function makeMote(game, pos, kind) {
  const id = `M${game.nextMoteNo++}`;
  return { id, pos: [...pos], kind, ttl: kind === 'dropped' ? DROP_TTL : null };
}

export function createGame({ seed = 0, night = 1, scenario = null } = {}) {
  const sc = scenario ?? {};
  const world = worldOf(night);
  const rng = createRng(seed);
  const start = world.start; // điểm hồi sinh luôn là điểm xuất phát của Đêm
  const g = {
    seed,
    night,
    world,
    rng,
    tick: 0,
    simTick: 0,
    paused: false,
    state: 'playing',
    timeBase: sc.time_left_s !== undefined ? sc.time_left_s : world.duration_s,
    score: 0,
    start,
    nextShadeNo: 1,
    nextMoteNo: 1,
    nextDrifterNo: 1,
    allowShadeSpawn: sc.random_shades !== false,
    allowMoteSpawn: sc.random_motes !== false,
    allowDrifterSpawn: night >= 2 && sc.random_drifters !== false,
    windEnabled: sc.wind_enabled !== undefined ? sc.wind_enabled : world.windEnabled,
    wind: { warning: false, active: false, dir: 0 },
    player: {
      pos: [...start],
      vel: [0, 0, 0],
      grounded: true,
      launched: false,
      carried: 0,
      flames: T.flames,
      invuln: 0,
      dashTicks: 0,
      dashCd: 0,
      dashVel: [0, 0],
      pulseCd: 0,
      charmTicks: 0,
      respawn: 0,
      facing: [0, 1],
    },
    input: { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false },
    prevButtons: { jump: false, interact: false, pulse: false, dash: false, pause: false },
    lanterns: [],
    motes: [],
    shades: [],
    drifters: [],
    charms: [],
    events: [],
    edge: { jump: false, interact: false, pulse: false, dash: false },
    pendingNightStart: true,
  };

  // Mây đứng tại xuất phát (hoặc vị trí scenario đặt), trên mặt đất nếu scenario không ghi y.
  if (sc.player?.pos) g.player.pos = [...sc.player.pos];
  if (!sc.player?.pos || sc.player.pos[1] === 0) {
    g.player.pos[1] = topY(world, g.player.pos[0], g.player.pos[2], g.player.pos[1] + STEP) ?? 0;
  }
  {
    const top = topY(world, g.player.pos[0], g.player.pos[2], g.player.pos[1] + 1e-6);
    g.player.grounded = top !== null && Math.abs(top - g.player.pos[1]) < 1e-6;
  }
  if (sc.player) {
    if (sc.player.carried !== undefined) g.player.carried = sc.player.carried;
    if (sc.player.flames !== undefined) g.player.flames = sc.player.flames;
    if (sc.player.invuln_ticks !== undefined) g.player.invuln = sc.player.invuln_ticks;
    if (sc.player.dash_cd_ticks !== undefined) g.player.dashCd = sc.player.dash_cd_ticks;
    if (sc.player.pulse_cd_ticks !== undefined) g.player.pulseCd = sc.player.pulse_cd_ticks;
    if (sc.player.charm_ticks !== undefined) g.player.charmTicks = sc.player.charm_ticks;
  }

  // Đèn lồng: vị trí mặc định theo đêm, scenario có thể ghi đè.
  g.lanterns = world.lanterns.map((l) => ({ id: l.id, pos: [...l.pos], lit: false, deposited: 0 }));
  for (const upd of sc.lanterns ?? []) {
    const l = g.lanterns.find((x) => x.id === upd.id);
    if (!l) throw new RangeError(`lantern ${upd.id} does not exist on night ${night}`);
    if (upd.pos) l.pos = [...upd.pos];
    if (upd.lit !== undefined) {
      l.lit = upd.lit;
      l.deposited = upd.lit ? (upd.deposited ?? T.lantern_cost) : 0;
    }
    if (upd.deposited !== undefined && !l.lit) l.deposited = upd.deposited;
  }

  // Đom đóm.
  if (sc.motes !== undefined) {
    g.motes = sc.motes.map((m) => makeMote(g, [m[0], topY(world, m[0], m[2]) ?? m[1], m[2]], 'random'));
  } else if (sc.random_motes === false) {
    g.motes = [];
  } else {
    const pts = [...world.motePoints];
    for (let i = 0; i < T.mote_start_count && pts.length; i++) {
      const k = Math.floor(rng() * pts.length);
      const [x, , z] = pts.splice(k, 1)[0];
      g.motes.push(makeMote(g, [x, topY(world, x, z) ?? 0, z], 'random'));
    }
  }

  // Bóng Mực.
  if (sc.shades !== undefined) {
    g.shades = sc.shades.map((s) => {
      const st = s.state ?? 'wander';
      const sh = makeShade(g, s.id, s.pos, st);
      if (st === 'stunned') sh.stun = s.state_ticks_left ?? STUN;
      return sh;
    });
  }

  // Gió Lạc.
  if (sc.drifters !== undefined) {
    g.drifters = sc.drifters.map((d) => makeDrifter(g, d.id, d.pos, d.state ?? 'idle', d.stolen ?? 0));
  }

  // Bùa Gió.
  g.charms = world.charms.map((c) => ({ id: c.id, pos: [...c.pos], available: true, respawn: 0 }));
  for (const upd of sc.charms ?? []) {
    const c = g.charms.find((x) => x.id === upd.id);
    if (!c) throw new RangeError(`charm ${upd.id} does not exist on night ${night}`);
    c.available = upd.available ?? c.available;
    c.respawn = upd.respawn_ticks ?? 0;
  }

  return g;
}

function makeDrifter(game, id, pos, state, stolen) {
  if (id === undefined) id = `D${game.nextDrifterNo++}`;
  return { id, pos: [...pos], anchor: [...pos], angle: 0, state, stolen, flee: state === 'flee' ? FLEE : 0 };
}

// Áp một frame của inputs. Frame chỉ đổi các trường nó có.
export function applyInputFrame(game, frame) {
  const inp = game.input;
  if (frame.move !== undefined) inp.move = [...frame.move];
  if (frame.cam_yaw_deg !== undefined) inp.cam_yaw_deg = frame.cam_yaw_deg;
  for (const b of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
    if (frame[b] !== undefined) inp[b] = frame[b];
  }
}

// ---------- Từng bước của một tick ----------

// Khoảng cách/điều kiện vào được: mặt có thể đứng tại (x, z) với độ cao y hiện tại.
function standable(game, x, z, y) {
  const w = game.world;
  if (blockedBySolid(w, x, z)) return false;
  const top = topY(w, x, z, Infinity);
  return top === null || top <= y + STEP;
}

function dropMotes(game, n, cx, cy, cz, ttl, kind = 'dropped') {
  for (let i = 0; i < n; i++) {
    const a = 2 * Math.PI * game.rng();
    const r = T.drop_min_r + (T.drop_max_r - T.drop_min_r) * game.rng();
    const x = cx + r * Math.cos(a);
    const z = cz + r * Math.sin(a);
    const m = makeMote(game, [x, topY(game.world, x, z) ?? cy, z], kind);
    m.ttl = ttl;
    game.motes.push(m);
  }
}

// Được phép đặt chân tại (x, z)? Đứng trên đất: không leo bậc cao hơn STEP và không vào cột.
function canEnter(game, x, z) {
  const p = game.player;
  if (blockedBySolid(game.world, x, z)) return false;
  return p.grounded ? standable(game, x, z, p.pos[1]) : true;
}

function playerMove(game) {
  const p = game.player;
  const inp = game.input;
  const w = game.world;
  const pressed = (b) => game.edge[b];

  // Hướng di chuyển trên mặt phẳng, xoay theo camera.
  let mx = inp.move[0];
  let mz = inp.move[1];
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const yaw = (inp.cam_yaw_deg * Math.PI) / 180;
  const wx = mx * Math.cos(yaw) + mz * Math.sin(yaw);
  const wz = -mx * Math.sin(yaw) + mz * Math.cos(yaw);
  if (Math.hypot(wx, wz) > 1e-9) p.facing = [wx / Math.hypot(wx, wz), wz / Math.hypot(wx, wz)];

  // Nhảy: chỉ khi chạm đất.
  if (pressed('jump') && p.grounded && !p.launched) {
    p.vel[1] = T.jump_velocity;
    p.grounded = false;
  }

  // Lướt: 14 m/s trong 0.2 s, hồi chiêu 1.5 s (bỏ qua khi có Bùa Gió).
  if (pressed('dash') && p.dashTicks === 0 && p.dashCd === 0) {
    const [dx, dz] = Math.hypot(wx, wz) > 1e-9 ? [wx, wz] : p.facing;
    const n = norm2(dx, dz);
    p.dashVel = [n[0] * T.dash_speed, n[1] * T.dash_speed];
    p.dashTicks = DASH_TICKS;
    if (p.charmTicks === 0) p.dashCd = DASH_CD;
    event(game, 'dash', {});
  }

  // Vận tốc ngang.
  const speed = p.charmTicks > 0 ? T.charm_speed : T.player_speed;
  if (p.dashTicks > 0) {
    p.vel[0] = p.dashVel[0];
    p.vel[2] = p.dashVel[1];
    p.dashTicks -= 1;
  } else if (!p.launched) {
    const accel = p.grounded ? speed / T.player_accel_s : T.air_accel;
    p.vel[0] = approach(p.vel[0], wx * speed, accel * DT);
    p.vel[2] = approach(p.vel[2], wz * speed, accel * DT);
  }

  // Gió (Đêm 3): đẩy Mây thêm.
  const windX = game.wind.active ? Math.cos((game.wind.dir * Math.PI) / 180) * T.wind_push : 0;
  const windZ = game.wind.active ? Math.sin((game.wind.dir * Math.PI) / 180) * T.wind_push : 0;

  // Di chuyển từng trục, bị chặn bởi tường, cột và bậc cao hơn STEP.
  const nx = p.pos[0] + (p.vel[0] + windX) * DT;
  if (canEnter(game, nx, p.pos[2])) p.pos[0] = nx;
  else p.vel[0] = 0;
  const nz = p.pos[2] + (p.vel[2] + windZ) * DT;
  if (canEnter(game, p.pos[0], nz)) p.pos[2] = nz;
  else p.vel[2] = 0;

  // Độ cao: đi bộ thì bám mặt đất; trên không thì trọng lực và hạ cánh.
  if (p.grounded) {
    const g = topY(w, p.pos[0], p.pos[2], p.pos[1] + STEP);
    if (g === null || p.pos[1] - g > STEP) {
      p.grounded = false;
      p.vel[1] = 0;
    } else {
      p.pos[1] = g;
    }
  }
  if (!p.grounded) {
    const prevY = p.pos[1];
    const vOld = p.vel[1];
    p.vel[1] -= T.gravity * DT;
    const newY = prevY + ((vOld + p.vel[1]) / 2) * DT; // hình thang: đúng với gia tốc hằng
    let landed = false;
    if (p.vel[1] <= 0) {
      const c = topY(w, p.pos[0], p.pos[2], prevY + 0.05);
      if (c !== null && newY <= c) {
        p.pos[1] = c;
        p.vel[1] = 0;
        p.grounded = true;
        p.launched = false;
        landed = true;
      }
    }
    if (!landed) p.pos[1] = newY;
  }

  // Bục nhảy: đứng trên bục thì được bắn lên.
  if (p.grounded && !p.launched) {
    for (const pad of w.pads) {
      if (Math.hypot(p.pos[0] - pad.x, p.pos[2] - pad.z) <= T.pad_radius && Math.abs(p.pos[1] - pad.y) < 0.01) {
        const dir = pad.target
          ? norm2(pad.target.x - pad.x, pad.target.z - pad.z)
          : norm2(pad.dir.x, pad.dir.z);
        p.vel = [dir[0] * pad.speed, pad.up, dir[1] * pad.speed];
        p.grounded = false;
        p.launched = true;
        break;
      }
    }
  }
}

function playerLifecycle(game) {
  const p = game.player;
  if (p.respawn > 0) {
    p.respawn -= 1;
    if (p.respawn === 0) {
      p.pos = [...game.start];
      p.pos[1] = topY(game.world, game.start[0], game.start[2], Infinity) ?? 0;
      p.vel = [0, 0, 0];
      p.grounded = true;
      p.launched = false;
      p.invuln = INVULN;
    }
  }
  if (p.invuln > 0) p.invuln -= 1;
  if (p.pulseCd > 0) p.pulseCd -= 1;
  if (p.dashCd > 0) p.dashCd -= 1;
  if (p.charmTicks > 0) p.charmTicks -= 1;
  for (const c of game.charms) {
    if (!c.available && c.respawn > 0) {
      c.respawn -= 1;
      if (c.respawn === 0) c.available = true;
    }
  }
  game.motes = game.motes.filter((m) => {
    if (m.ttl === null) return true;
    m.ttl -= 1;
    return m.ttl > 0;
  });
  game.drifters = game.drifters.filter((d) => {
    if (d.state !== 'flee') return true;
    d.flee -= 1;
    return d.flee > 0;
  });
}

function windStep(game) {
  if (!game.windEnabled) {
    game.wind = { warning: false, active: false, dir: game.wind.dir };
    return;
  }
  const t = game.simTick % WIND_PERIOD;
  const k = Math.floor(game.simTick / WIND_PERIOD);
  if (game.simTick > 0 && t === WIND_PERIOD - WIND_WARN) {
    game.wind.dir = game.rng() * 360; // hướng cơn gió kế tiếp, cố định trong thời gian báo trước
  }
  game.wind.warning = k >= 0 && game.simTick > 0 && t >= WIND_PERIOD - WIND_WARN;
  game.wind.active = game.simTick >= WIND_PERIOD && t < WIND_DUR;
}

function pickUp(game) {
  const p = game.player;
  if (p.respawn > 0) return;
  game.motes = game.motes.filter((m) => {
    if (p.carried < T.carry_capacity && distXZ(p.pos, m.pos) <= T.pickup_radius && Math.abs(p.pos[1] - m.pos[1]) <= T.pickup_height) {
      p.carried += 1;
      event(game, 'mote_picked', { carried: p.carried });
      return false;
    }
    return true;
  });
  for (const c of game.charms) {
    if (c.available && distXZ(p.pos, c.pos) <= T.pickup_radius && Math.abs(p.pos[1] - c.pos[1]) <= T.pickup_height) {
      c.available = false;
      c.respawn = CHARM_RESPAWN;
      p.charmTicks = CHARM_TICKS;
      event(game, 'charm_picked', { charm_id: c.id, charm_ticks: CHARM_TICKS });
    }
  }
}

function interactStep(game) {
  const p = game.player;
  if (!game.edge.interact || p.respawn > 0) return [];
  let target = null;
  let best = Infinity;
  for (const l of game.lanterns) {
    if (l.lit) continue;
    const d = distXZ(p.pos, l.pos);
    if (d <= T.interact_radius && d < best) { best = d; target = l; }
  }
  const lit = [];
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
      lit.push(target);
    }
  }
  return lit;
}

function safeZoneStep(game, justLit) {
  // Bóng Mực trong vùng an toàn của đèn vừa thắp bị đẩy ra mép trong tối đa 30 tick, không gây sát thương.
  for (const l of justLit) {
    for (const s of game.shades) {
      if (distXZ(s.pos, l.pos) < T.safe_radius) {
        s.eject = T.eject_ticks;
        s.ejectCenter = [l.pos[0], l.pos[2]];
      }
    }
  }
}

function inSafeZone(game, x, z) {
  return game.lanterns.some((l) => l.lit && Math.hypot(x - l.pos[0], z - l.pos[2]) < T.safe_radius);
}

function pulseStep(game) {
  const p = game.player;
  if (!game.edge.pulse || p.pulseCd > 0 || p.carried < T.pulse_cost || p.respawn > 0) return;
  p.carried -= T.pulse_cost;
  p.pulseCd = PULSE_CD;
  const origin = [p.pos[0], p.pos[1] + T.pulse_origin_m, p.pos[2]];
  const stunned = [];
  for (const s of game.shades) {
    if (dist3(origin, s.pos) > T.pulse_radius) continue;
    stunned.push(s.id);
    game.score += SCORE.per_stun;
    s.state = 'stunned';
    s.stun = STUN;
    s.push = PUSH_TICKS;
    s.pushDir = norm2(s.pos[0] - origin[0], s.pos[2] - origin[2]);
  }
  event(game, 'pulse', { stunned_ids: stunned });
  for (const d of game.drifters) {
    if (dist3(origin, d.pos) > T.pulse_radius) continue;
    if (d.state === 'flee' && d.stolen > 0) {
      dropMotes(game, d.stolen, d.pos[0], d.pos[1], d.pos[2], DRIFTER_DROP_TTL);
      event(game, 'drifter_drop', { drifter_id: d.id, amount: d.stolen });
      d.stolen = 0;
    } else if (d.state !== 'flee') {
      d.state = 'flee';
      d.flee = FLEE;
    }
  }
}

function spawnShadeNearPlayer(game) {
  const p = game.player;
  const free = game.world.shadePoints.filter((pt) =>
    distXZ(pt, p.pos) >= 15 && !game.shades.some((s) => distXZ(s.pos, pt) < 1.0));
  if (free.length === 0) return;
  const pt = free[Math.floor(game.rng() * free.length)];
  const s = makeShade(game, undefined, [pt[0], topY(game.world, pt[0], pt[2]) ?? 0, pt[2]], 'spawning');
  game.shades.push(s);
  event(game, 'shade_spawned', { id: s.id });
}

function shadesStep(game) {
  const p = game.player;
  const w = game.world;
  for (const s of game.shades) {
    const dPlayer = distXZ(s.pos, p.pos);
    if (s.state === 'spawning') {
      s.state = dPlayer <= T.shade_detect_m ? 'chase' : 'wander';
    }
    if (s.state === 'stunned') {
      if (s.push > 0) {
        const step = T.pulse_push_m / PUSH_TICKS;
        const x = s.pos[0] + s.pushDir[0] * step;
        const z = s.pos[2] + s.pushDir[1] * step;
        if (!inSafeZone(game, x, z) && topY(w, x, z) !== null && !blockedBySolid(w, x, z)) {
          s.pos[0] = x; s.pos[2] = z;
        } else {
          s.push = 0;
        }
        s.push = Math.max(0, s.push - 1);
      }
      s.stun -= 1;
      if (s.stun <= 0) {
        s.stun = 0;
        s.state = distXZ(s.pos, p.pos) <= T.shade_detect_m ? 'chase' : 'wander';
      }
      continue;
    }
    if (s.state === 'recoil') {
      const step = T.shade_recoil_m / RECOIL;
      const x = s.pos[0] + s.recoilDir[0] * step;
      const z = s.pos[2] + s.recoilDir[1] * step;
      if (!inSafeZone(game, x, z) && topY(w, x, z) !== null && !blockedBySolid(w, x, z)) {
        s.pos[0] = x; s.pos[2] = z;
      }
      s.recoil -= 1;
      if (s.recoil <= 0) s.state = dPlayer <= T.shade_detect_m ? 'chase' : 'wander';
      continue;
    }
    if (s.eject > 0) {
      // Bị đẩy ra mép vùng an toàn: đi thẳng ra ngoài đều trong số tick còn lại.
      const dx = s.pos[0] - s.ejectCenter[0];
      const dz = s.pos[2] - s.ejectCenter[1];
      const d = Math.hypot(dx, dz);
      if (d < T.safe_radius) {
        const k = (T.safe_radius - d) / s.eject;
        const [ux, uz] = norm2(dx, dz, 1, 0);
        s.pos[0] += ux * k;
        s.pos[2] += uz * k;
      }
      s.eject -= 1;
      continue;
    }
    // Wander: đi về đèn tắt gần nhất; chase: đuổi Mây.
    if (s.state === 'wander' && dPlayer <= T.shade_detect_m) s.state = 'chase';
    if (s.state === 'chase' && dPlayer > T.shade_lose_m) s.state = 'wander';
    let tx;
    let tz;
    if (s.state === 'chase') {
      tx = p.pos[0]; tz = p.pos[2];
    } else {
      const unlit = game.lanterns.filter((l) => !l.lit);
      if (unlit.length === 0) continue;
      let best = null;
      for (const l of unlit) {
        const d = distXZ(s.pos, l.pos);
        if (best === null || d < best.d) best = { d, l };
      }
      tx = best.l.pos[0]; tz = best.l.pos[2];
    }
    const dx = tx - s.pos[0];
    const dz = tz - s.pos[2];
    const d = Math.hypot(dx, dz);
    if (d < 1e-9) continue;
    const stepLen = Math.min(game.world.shadeSpeed * DT, d);
    const nx = s.pos[0] + (dx / d) * stepLen;
    const nz = s.pos[2] + (dz / d) * stepLen;
    if (!inSafeZone(game, nx, nz) && topY(w, nx, nz) !== null && !blockedBySolid(w, nx, nz)) {
      s.pos[0] = nx; s.pos[2] = nz;
    }
  }
}

function driftersStep(game) {
  const p = game.player;
  for (const d of game.drifters) {
    const near = distXZ(d.pos, p.pos) <= T.drifter_notice_m;
    const eligible = p.carried >= T.drifter_min_carry && near && p.respawn === 0;
    if (d.state === 'idle') {
      if (eligible) {
        d.state = 'chase';
      } else {
        d.angle += (T.drifter_idle_speed / 5) * DT;
        d.pos = [d.anchor[0] + 5 * Math.cos(d.angle), d.anchor[1], d.anchor[2] + 5 * Math.sin(d.angle)];
        continue;
      }
    }
    if (d.state === 'chase') {
      if (!eligible) { d.state = 'idle'; continue; }
      const [ux, uz] = norm2(p.pos[0] - d.pos[0], p.pos[2] - d.pos[2]);
      d.pos = [d.pos[0] + ux * T.drifter_speed * DT, d.pos[1], d.pos[2] + uz * T.drifter_speed * DT];
    } else if (d.state === 'flee') {
      const [ux, uz] = norm2(d.pos[0] - p.pos[0], d.pos[2] - p.pos[2]);
      d.pos = [d.pos[0] + ux * T.drifter_speed * DT, d.pos[1], d.pos[2] + uz * T.drifter_speed * DT];
    }
  }
}

function driftersContact(game) {
  const p = game.player;
  if (p.respawn > 0) return;
  for (const d of game.drifters) {
    if (d.state !== 'chase' || distXZ(d.pos, p.pos) > T.drifter_touch_m) continue;
    const amount = Math.min(T.drifter_steal_max, p.carried);
    p.carried -= amount;
    d.stolen = amount;
    d.state = 'flee';
    d.flee = FLEE;
    event(game, 'drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
  }
}

function spawnsStep(game) {
  const t = game.simTick;
  if (game.allowMoteSpawn && t > 0 && t % MOTE_SPAWN === 0) {
    const randoms = game.motes.filter((m) => m.kind === 'random').length;
    const free = game.world.motePoints.filter((pt) => !game.motes.some((m) => distXZ(m.pos, pt) < 0.01));
    if (randoms < T.mote_max && free.length > 0) {
      const pt = free[Math.floor(game.rng() * free.length)];
      game.motes.push(makeMote(game, [pt[0], topY(game.world, pt[0], pt[2]) ?? 0, pt[2]], 'random'));
    }
  }

  if (game.allowShadeSpawn) {
    const max = game.world.shadeMax;
    if (t === SHADE_FIRST) {
      spawnShadeNearPlayer(game);
      if (game.shades.length < max) spawnShadeNearPlayer(game);
    } else if (t > SHADE_FIRST && (t - SHADE_FIRST) % game.world.shadeInterval === 0 && game.shades.length < max) {
      spawnShadeNearPlayer(game);
    }
  }

  if (game.allowDrifterSpawn && t > 0 && t % DRIFTER_SPAWN === 0 && game.drifters.length < T.drifter_max) {
    const isl = game.world.islands[Math.floor(game.rng() * game.world.islands.length)];
    const a = 2 * Math.PI * game.rng();
    const r = (0.7 * isl.r) * Math.sqrt(game.rng());
    const x = isl.cx + r * Math.cos(a);
    const z = isl.cz + r * Math.sin(a);
    game.drifters.push(makeDrifter(game, undefined, [x, topY(game.world, x, z) ?? 0, z], 'idle', 0));
  }
}

function hitsStep(game) {
  const p = game.player;
  if (p.invuln > 0 || p.respawn > 0) return;
  for (const s of game.shades) {
    if (s.state !== 'wander' && s.state !== 'chase') continue;
    if (s.eject > 0) continue;
    if (distXZ(s.pos, p.pos) > T.shade_hit_radius || Math.abs(s.pos[1] - p.pos[1]) > T.shade_hit_height) continue;
    p.flames -= 1;
    const dropped = Math.floor(p.carried * T.hit_drop_ratio);
    p.carried -= dropped;
    dropMotes(game, dropped, p.pos[0], p.pos[1], p.pos[2], DROP_TTL);
    p.invuln = INVULN;
    event(game, 'player_hit', { by: 'shade', flames: p.flames, dropped, lost: 0 });
    const [ux, uz] = norm2(s.pos[0] - p.pos[0], s.pos[2] - p.pos[2]);
    s.state = 'recoil';
    s.recoil = RECOIL;
    s.recoilDir = [ux, uz];
    break; // tối đa một lần mất Ngọn Lửa mỗi tick
  }
}

function fallCheck(game) {
  const p = game.player;
  if (p.respawn > 0 || p.pos[1] >= FALL_FLOOR) return;
  const lost = p.carried;
  p.flames -= 1;
  p.carried = 0;
  event(game, 'player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
  if (p.flames <= 0) return; // hết Ngọn Lửa: thua ngay, không hồi sinh
  p.respawn = FALL_WAIT;
  p.grounded = false;
  p.launched = false;
  p.vel = [0, 0, 0];
}

function checkEnd(game) {
  const p = game.player;
  const lanternsAllLit = game.lanterns.every((l) => l.lit);
  if (p.flames <= 0) {
    endGame(game, 'lost', 'no_flames');
  } else if (lanternsAllLit) {
    const t = Math.max(0, Math.floor(timeLeft(game)));
    game.score += t * SCORE.per_second_left + Math.max(0, p.flames) * SCORE.per_flame_left;
    endGame(game, 'won', 'all_lit');
  } else if (timeLeft(game) <= 0) {
    endGame(game, 'lost', 'dawn');
  }
}

// Chạy đúng một tick (1/60 s) theo game.input hiện tại. Sau bước này game.tick tăng 1.
export function step(game) {
  if (game.state !== 'playing') return game.events;
  game.events = [];
  game.tick += 1;
  if (game.pendingNightStart) {
    game.pendingNightStart = false;
    event(game, 'night_start', { night: game.night });
  }

  // 0. Đọc input; tạm dừng xử lý trước.
  const inp = game.input;
  const prev = game.prevButtons;
  const edge = (b) => inp[b] && !prev[b];
  game.edge = { jump: edge('jump'), interact: edge('interact'), pulse: edge('pulse'), dash: edge('dash') };
  const pausePressed = edge('pause');
  const justLit = [];
  game.prevButtons = { jump: inp.jump, interact: inp.interact, pulse: inp.pulse, dash: inp.dash, pause: inp.pause };
  if (pausePressed) {
    game.paused = !game.paused;
    event(game, game.paused ? 'paused' : 'resumed', {});
    return game.events;
  }
  if (game.paused) return game.events;
  game.simTick += 1;

  // 1-2. Giảm các bộ đếm; hồi sinh; thời tiết.
  playerLifecycle(game);
  windStep(game);

  // 3. Di chuyển Mây (nhảy, lướt, bục, gió), rồi kiểm tra rơi.
  if (game.player.respawn === 0) playerMove(game);
  fallCheck(game);

  // 4. Nhặt đom đóm và bùa.
  pickUp(game);

  // 5. Tương tác với đèn.
  justLit.push(...interactStep(game));

  // 6. Cập nhật vùng an toàn.
  safeZoneStep(game, justLit);

  // 7. Tỏa Sáng.
  pulseStep(game);

  // 8. Di chuyển Bóng Mực và Gió Lạc.
  shadesStep(game);
  driftersStep(game);

  // 9. Chạm: Gió Lạc cướp trước, rồi Bóng Mực gây hit.
  driftersContact(game);
  hitsStep(game);

  // 10. Sinh đom đóm, Bóng Mực, Gió Lạc theo lịch.
  spawnsStep(game);

  // 11. Xét thắng/thua.
  checkEnd(game);

  return game.events;
}

export { timeLeft };

export function snapshot(game) {
  const p = game.player;
  return {
    type: 'snapshot',
    tick: game.tick,
    sim_tick: game.simTick,
    night: game.night,
    state: game.paused && game.state === 'playing' ? 'paused' : game.state,
    time_left_s: r3(timeLeft(game)),
    score: game.score,
    wind: { active: game.wind.active, warning: game.wind.warning, dir_deg: r3(game.wind.dir) },
    player: {
      pos: r3v(p.pos),
      vel: r3v(p.vel),
      flames: p.flames,
      carried: p.carried,
      grounded: p.grounded,
      invuln: r3(p.invuln / 60),
      dash_cd_s: r3(p.dashCd / 60),
      pulse_cd_s: r3(p.pulseCd / 60),
      charm_s: r3(p.charmTicks / 60),
    },
    lanterns: game.lanterns.map((l) => ({ id: l.id, pos: r3v(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: game.shades.map((s) => ({ id: s.id, pos: r3v(s.pos), state: s.state })),
    motes_active: game.motes.length,
    motes: game.motes.map((m) => ({ id: m.id, pos: r3v(m.pos), kind: m.kind, ttl_s: m.ttl === null ? null : r3(m.ttl / 60) })),
    drifters: game.drifters.map((d) => ({ id: d.id, pos: r3v(d.pos), state: d.state, stolen: d.stolen })),
    charms: game.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: r3(c.respawn / 60) })),
  };
}
