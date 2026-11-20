// Phân tích tham số dòng lệnh cho chế độ headless. Exit code: 0 ok, 1 sai cách gọi, 2 input/scenario sai định dạng.
import { readFileSync, writeFileSync } from 'node:fs';
import { runSimulation } from './headless.js';
import { MalformedError } from './scenario.js';

export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

const FLAGS = {
  '--seed': 'seed',
  '--night': 'night',
  '--scenario': 'scenario',
  '--inputs': 'inputs',
  '--ticks': 'ticks',
  '--out': 'out',
  '--snapshot-every': 'snapshotEvery',
};

const INT = /^-?\d+$/;

export function parseArgs(argv) {
  const raw = {};
  for (let i = 0; i < argv.length; i++) {
    const key = FLAGS[argv[i]];
    if (!key) throw new UsageError(`unknown argument ${argv[i]}`);
    const val = argv[i + 1];
    if (val === undefined || val.startsWith('--')) throw new UsageError(`${argv[i]} needs a value`);
    raw[key] = val;
    i++;
  }

  for (const req of ['seed', 'ticks', 'out']) {
    if (raw[req] === undefined) throw new UsageError(`missing required --${req === 'out' ? 'out' : req}`);
  }
  if (!INT.test(raw.seed)) throw new UsageError('--seed must be an integer');
  if (!INT.test(raw.ticks) || Number(raw.ticks) < 0) throw new UsageError('--ticks must be a non-negative integer');
  const night = raw.night ?? '1';
  if (night !== '1') throw new UsageError('only --night 1 is implemented in Phase 1');
  const snapshotEvery = raw.snapshotEvery ?? '10';
  if (!INT.test(snapshotEvery) || Number(snapshotEvery) < 1) {
    throw new UsageError('--snapshot-every must be a positive integer');
  }

  return {
    seed: Number(raw.seed),
    ticks: Number(raw.ticks),
    out: raw.out,
    snapshotEvery: Number(snapshotEvery),
    scenarioPath: raw.scenario,
    inputsPath: raw.inputs,
  };
}

function readOptional(path, what) {
  if (path === undefined) return null;
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    throw new MalformedError(`cannot read ${what} file ${path}: ${e.code ?? e.message}`);
  }
}

export function main(argv) {
  try {
    const args = parseArgs(argv);
    const text = runSimulation({
      seed: args.seed,
      ticks: args.ticks,
      snapshotEvery: args.snapshotEvery,
      scenarioText: readOptional(args.scenarioPath, 'scenario'),
      inputsText: readOptional(args.inputsPath, 'inputs'),
    });
    writeFileSync(args.out, text);
    return 0;
  } catch (e) {
    if (e instanceof UsageError) {
      process.stderr.write(`usage error: ${e.message}\n`);
      return 1;
    }
    if (e instanceof MalformedError) {
      process.stderr.write(`malformed input: ${e.message}\n`);
      return 2;
    }
    process.stderr.write(`error: ${e.stack ?? e.message}\n`);
    return 1;
  }
}
