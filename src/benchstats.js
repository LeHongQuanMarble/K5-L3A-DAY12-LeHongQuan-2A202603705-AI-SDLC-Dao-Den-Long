// Công thức chỉ số bench (Ticket-04 mục 1). Đầu vào: mảng dt (ms) của các khung trong khoảng đo.
export function benchStats(dts) {
  const N = dts.length;
  if (N === 0) throw new RangeError('no frames measured');
  const sum = dts.reduce((a, b) => a + b, 0);
  const avg_fps = (1000 * N) / sum;
  const desc = [...dts].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const meanTop = desc.slice(0, k).reduce((a, b) => a + b, 0) / k;
  const p1_low_fps = 1000 / meanTop;
  const asc = [...dts].sort((a, b) => a - b);
  const frame_ms_p95 = asc[Math.max(0, Math.ceil(0.95 * N) - 1)];
  return {
    frames: N,
    avg_fps: round(avg_fps, 1),
    p1_low_fps: round(p1_low_fps, 1),
    frame_ms_p95: round(frame_ms_p95, 1),
  };
}

const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

// Ngưỡng đạt trên máy chấm (Ticket-04 mục 1).
export function meetsTargets(r) {
  return r.avg_fps >= 60 && r.p1_low_fps >= 30 && r.load_ms <= 10000;
}
