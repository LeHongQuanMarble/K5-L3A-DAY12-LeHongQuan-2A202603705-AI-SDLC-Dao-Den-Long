import { test } from 'node:test';
import assert from 'node:assert/strict';
import { benchStats, meetsTargets } from '../src/benchstats.js';

test('avg_fps = 1000 × N / Σ dt', () => {
  const r = benchStats([10, 10, 10, 10]); // 4 khung 10 ms
  assert.equal(r.frames, 4);
  assert.equal(r.avg_fps, 100);
});

test('p1_low_fps uses the k = max(1, ceil(0.01 N)) slowest frames', () => {
  const dts = Array.from({ length: 200 }, () => 10);
  dts[0] = 50; dts[1] = 30; // N=200 -> k=2: trung bình 40 ms -> 25 fps
  assert.equal(benchStats(dts).p1_low_fps, 25);
  const small = [10, 20];   // N=2 -> k=max(1,1)=1: khung chậm nhất 20 ms -> 50 fps
  assert.equal(benchStats(small).p1_low_fps, 50);
});

test('frame_ms_p95 is the 95th percentile (nearest rank) of dt', () => {
  const dts = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
  assert.equal(benchStats(dts).frame_ms_p95, 95);
});

test('empty measurement is rejected', () => {
  assert.throws(() => benchStats([]), RangeError);
});

test('targets: avg >= 60, p1 >= 30, load <= 10000', () => {
  assert.equal(meetsTargets({ avg_fps: 60, p1_low_fps: 30, load_ms: 10000 }), true);
  assert.equal(meetsTargets({ avg_fps: 59.9, p1_low_fps: 30, load_ms: 100 }), false);
  assert.equal(meetsTargets({ avg_fps: 87, p1_low_fps: 29, load_ms: 100 }), false);
  assert.equal(meetsTargets({ avg_fps: 87, p1_low_fps: 52, load_ms: 10001 }), false);
});
