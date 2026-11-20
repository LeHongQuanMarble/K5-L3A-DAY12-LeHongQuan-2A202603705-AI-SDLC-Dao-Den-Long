import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUNING, SCORE } from '../src/tuning.js';

const contract = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));

test('contract declares the fixed fields of Test Contract v1.3', () => {
  assert.equal(contract.contract_version, '1.3');
  assert.match(contract.team, /^[^ ]+$/);
  for (const k of ['build_cmd', 'run_cmd', 'headless_cmd']) assert.equal(typeof contract[k], 'string');
});

test('contract tuning matches src/tuning.js exactly', () => {
  assert.deepEqual(contract.tuning, { ...TUNING });
});

test('contract score matches src/tuning.js exactly', () => {
  assert.deepEqual(contract.score, { ...SCORE });
});
