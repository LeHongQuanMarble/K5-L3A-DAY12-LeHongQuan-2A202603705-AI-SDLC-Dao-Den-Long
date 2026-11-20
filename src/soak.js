// Soak test headless (Ticket-04 mục 2): chạy N Đêm liên tiếp trong một tiến trình, Đêm 1 → 2 → 3 xoay vòng.
// Đêm thứ i dùng seed (seed + i). Input ngẫu nhiên theo seed: mỗi 30 tick chọn lại hướng; mỗi tick
// 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác.
import { createGame, step, applyInputFrame } from './sim.js';
import { createRng } from './rng.js';

const MB = (bytes) => Math.round((bytes / 1048576) * 10) / 10;
// Đo sau khi GC dọn (chạy với --expose-gc), để so sánh bộ nhớ đáng tin cậy.
const rssMb = () => { if (typeof globalThis.gc === 'function') globalThis.gc(); return MB(process.memoryUsage().rss); };
const MAX_TICKS = 25000; // an toàn: một Đêm đầy đủ tối đa 360 s = 21600 tick

export function playNight(game, seed) {
  const rng = createRng(seed ^ 0x5eed);
  let angle = 0;
  let steps = 0;
  while (game.state === 'playing' && steps < MAX_TICKS) {
    if (steps % 30 === 0) angle = rng() * 2 * Math.PI;
    applyInputFrame(game, {
      move: [Math.cos(angle), Math.sin(angle)],
      jump: rng() < 0.05,
      dash: rng() < 0.03,
      pulse: rng() < 0.02,
      interact: rng() < 0.10,
    });
    step(game);
    steps += 1;
  }
  return steps;
}

export function runSoak({ seed = 7, nights = 10 } = {}) {
  const t0 = Date.now();
  let crashes = 0;
  const results = [];
  let memStart = null;
  let last = null;
  for (let i = 1; i <= nights; i++) {
    const night = ((i - 1) % 3) + 1;
    const nightSeed = seed + i;
    try {
      const game = createGame({ seed: nightSeed, night });
      if (memStart === null) memStart = rssMb();
      playNight(game, nightSeed);
      results.push(game.state === 'playing' ? 'timeout' : game.state);
      last = { night, nightSeed };
    } catch (e) {
      crashes += 1;
      results.push('crash');
      process.stderr.write(`soak: night ${i} crashed: ${e.stack ?? e.message}\n`);
    }
  }
  // Reset sau Đêm cuối: dựng lại đêm đó từ đầu và đo bộ nhớ.
  if (last) createGame({ seed: last.nightSeed, night: last.night });
  const memEnd = rssMb();
  return {
    nights,
    crashes,
    results,
    mem_start_mb: memStart ?? 0,
    mem_end_mb: memEnd,
    duration_s: Math.round(((Date.now() - t0) / 1000) * 10) / 10,
  };
}

export function passes(r) {
  return r.crashes === 0 && r.mem_end_mb <= 1.2 * r.mem_start_mb;
}
