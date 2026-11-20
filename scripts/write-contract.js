// Sinh game.contract.json từ src/tuning.js để hai nơi luôn khớp (chạy: node scripts/write-contract.js).
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TUNING, SCORE } from '../src/tuning.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'game.contract.json');
const old = JSON.parse(readFileSync(file, 'utf8'));
const contract = {
  contract_version: '1.3',
  team: old.team,
  build_cmd: 'npm run check',
  run_cmd: 'node bin/game.js',
  headless_cmd: 'node bin/headless.js',
  bench_cmd: 'node --expose-gc bin/bench.js',
  soak_cmd: 'node --expose-gc bin/soak.js',
  tuning: { ...TUNING },
  score: { ...SCORE },
};
writeFileSync(file, JSON.stringify(contract, null, 2) + '\n');
console.log(`wrote ${file}`);
