// Bản đồ chuẩn của ba Đêm (Ticket-02 phần 2). Thuần dữ liệu và hình học, không có logic game.
// Góc đo từ +X, ngược chiều kim đồng hồ nhìn từ trên xuống (mặt phẳng XZ).
import { TUNING as T } from './tuning.js';

const RAD = Math.PI / 180;
const at = (r, deg, cx = 0, cz = 0) => [cx + r * Math.cos(deg * RAD), 0, cz + r * Math.sin(deg * RAD)];
const range = (n, f) => Array.from({ length: n }, (_, k) => f(k));

// --- Mặt đất: mỗi phần tử là một mặt có độ cao y. ---
// disc: đĩa tròn; rect: hình chữ nhật; ring: vành khăn (nửa z > 0 nếu half = 'zpos'); ramp: dốc thẳng.
function groundOf(night) {
  if (night === 1) {
    return [{ kind: 'disc', cx: 0, cz: 0, r: T.island_radius_night1, y: 0 }];
  }
  if (night === 2) {
    const R = T.island_radius_night2;
    return [
      { kind: 'disc', cx: 0, cz: 0, r: R, y: 0 },
      { kind: 'disc', cx: 70, cz: 0, r: R, y: 0 },
      { kind: 'rect', x0: 26, x1: 44, z0: -2, z1: 2, y: 0 }, // cầu tre
    ];
  }
  // Đêm 3
  return [
    { kind: 'disc', cx: 0, cz: 0, r: 45, y: 0 },
    { kind: 'ring', cx: 0, cz: 0, rin: 12, rout: 24, y: 3, half: 'zpos' },
    { kind: 'disc', cx: 0, cz: 0, r: 8, y: 6 },
    { kind: 'ramp', deg: 30, rLow: 30, rHigh: 24, yHigh: 3, halfWidth: 1.5 },
    { kind: 'ramp', deg: 150, rLow: 30, rHigh: 24, yHigh: 3, halfWidth: 1.5 },
  ];
}

// Phần tử tường/cột không đi qua được.
function solidsOf(night) {
  return night === 3 ? [{ kind: 'cyl', cx: 0, cz: 0, r: 2, h: 8 }] : [];
}

// --- Bục nhảy: chạm bục (đứng trên mặt y) thì được bắn lên. ---
function padsOf(night) {
  if (night === 2) {
    const a = { x: 20, y: 0, z: 18 };
    const b = { x: 50, y: 0, z: -18 };
    return [
      { ...a, up: T.pad_night2_up, speed: T.pad_night2_speed, target: { x: 70, z: 0 } },
      { ...b, up: T.pad_night2_up, speed: T.pad_night2_speed, target: { x: 0, z: 0 } },
    ];
  }
  if (night === 3) {
    return [{ x: 0, y: 3, z: 13, up: T.pad_night3_up, speed: T.pad_night3_speed, dir: { x: 0, z: -1 } }];
  }
  return [];
}

// --- Đèn lồng (chân cột). ---
function lanternsOf(night) {
  const pos = {
    1: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    2: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    3: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
  }[night];
  return pos.map((p, i) => ({ id: `L${i + 1}`, pos: p }));
}

// --- Điểm sinh đom đóm (mỗi điểm một vị trí cố định). ---
function motePointsOf(night) {
  if (night === 1) {
    return [...range(8, (k) => at(12, 45 * k)), ...range(16, (k) => at(33, 22.5 * k))];
  }
  if (night === 2) {
    const island = (cx) => [
      ...range(4, (k) => at(10, 90 * k, cx)),
      ...range(8, (k) => at(22, 45 * k, cx)),
    ];
    return [...island(0), ...island(70)];
  }
  return [
    ...range(18, (k) => at(34, 20 * k)),
    ...range(8, (k) => at(18, 20 * (k + 1))),
    ...range(4, (k) => at(5, 45 + 90 * k)),
  ];
}

// --- Điểm sinh Bóng Mực. ---
function shadePointsOf(night) {
  if (night === 1) return range(12, (k) => at(37, 15 + 30 * k));
  if (night === 2) {
    const ring = (cx) => range(8, (k) => at(26, 22.5 + 45 * k, cx));
    return [...ring(0), ...ring(70)];
  }
  return range(16, (k) => at(43, 22.5 * k));
}

// --- Bùa Gió (Đêm 2, 3). ---
function charmsOf(night) {
  if (night === 2) return [{ id: 'C1', pos: [35, 0, 0] }];
  if (night === 3) return [{ id: 'C1', pos: [30, 0, 25] }, { id: 'C2', pos: [-30, 0, 25] }];
  return [];
}

// Tâm các đảo, để chọn điểm sương cho Gió Lạc.
function islandCentersOf(night) {
  if (night === 2) return [{ cx: 0, cz: 0, r: T.island_radius_night2 }, { cx: 70, cz: 0, r: T.island_radius_night2 }];
  if (night === 3) return [{ cx: 0, cz: 0, r: 45 }];
  return [{ cx: 0, cz: 0, r: T.island_radius_night1 }];
}

export function worldOf(night) {
  if (![1, 2, 3].includes(night)) throw new RangeError(`night must be 1, 2 or 3, got ${night}`);
  return {
    night,
    // Điểm xuất phát (và điểm hồi sinh). Đêm 1 là (0,0,0) theo PRD; Đêm 3 đặt ngoài tháp chuông (giả định A-P2-09).
    start: night === 3 ? [0, 0, -10] : [0, 0, 0],
    duration_s: [T.night1_duration_s, T.night2_duration_s, T.night3_duration_s][night - 1],
    ground: groundOf(night),
    solids: solidsOf(night),
    pads: padsOf(night),
    lanterns: lanternsOf(night),
    motePoints: motePointsOf(night),
    shadePoints: shadePointsOf(night),
    charms: charmsOf(night),
    islands: islandCentersOf(night),
    shadeSpeed: night === 3 ? T.shade_speed_night3 : T.shade_speed,
    shadeInterval: [T.shade_spawn_interval_night1_s, T.shade_spawn_interval_night2_s, T.shade_spawn_interval_night3_s][night - 1] * 60,
    shadeMax: [T.shade_max_night1, T.shade_max_night2, T.shade_max_night3][night - 1],
    windEnabled: night === 3,
  };
}

// Độ cao cao nhất của một mặt tại (x, z) mà không vượt quá maxY; null nếu không có mặt nào.
function surfaceY(s, x, z) {
  if (s.kind === 'disc') return Math.hypot(x - s.cx, z - s.cz) <= s.r ? s.y : null;
  if (s.kind === 'rect') return x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1 ? s.y : null;
  if (s.kind === 'ring') {
    const d = Math.hypot(x - s.cx, z - s.cz);
    if (d < s.rin || d > s.rout) return null;
    if (s.half === 'zpos' && z - s.cz <= 0) return null;
    return s.y;
  }
  if (s.kind === 'ramp') {
    const a = s.deg * RAD;
    const along = x * Math.cos(a) + z * Math.sin(a);
    const lateral = -x * Math.sin(a) + z * Math.cos(a);
    if (Math.abs(lateral) > s.halfWidth || along < s.rHigh || along > s.rLow) return null;
    return (s.yHigh * (s.rLow - along)) / (s.rLow - s.rHigh);
  }
  return null;
}

export function topY(world, x, z, maxY = Infinity) {
  let best = null;
  for (const s of world.ground) {
    const y = surfaceY(s, x, z);
    if (y !== null && y <= maxY && (best === null || y > best)) best = y;
  }
  return best;
}

export function blockedBySolid(world, x, z) {
  return world.solids.some((c) => Math.hypot(x - c.cx, z - c.cz) <= c.r);
}
