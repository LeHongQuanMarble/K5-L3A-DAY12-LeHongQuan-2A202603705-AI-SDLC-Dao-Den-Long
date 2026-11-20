#!/usr/bin/env node
// node bin/soak.js --seed 7 --nights 10 --out soak.json
import { writeFileSync } from 'node:fs';
import { runSoak, passes } from '../src/soak.js';

const args = process.argv.slice(2);
const val = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const seed = Number(val('--seed', '7'));
const nights = Number(val('--nights', '10'));
const out = val('--out', null);
if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1) {
  process.stderr.write('usage: node bin/soak.js --seed <int> --nights <n> --out <file>\n');
  process.exit(1);
}
const r = runSoak({ seed, nights });
const text = JSON.stringify(r, null, 2) + '\n';
if (out) writeFileSync(out, text);
process.stdout.write(text);
process.stdout.write(passes(r) ? 'PASS\n' : 'FAIL\n');
process.exit(passes(r) ? 0 : 1);
