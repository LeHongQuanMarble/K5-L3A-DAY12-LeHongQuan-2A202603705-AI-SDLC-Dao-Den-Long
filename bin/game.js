#!/usr/bin/env node
// Điểm vào của game: mặc định chạy máy chủ tĩnh; với --export-leaderboard thì xuất bảng xếp hạng ra file JSON.
//   node bin/game.js                                  -> http://127.0.0.1:8080/
//   node bin/game.js --export-leaderboard out.json    -> {"entries": [...]} theo đúng thứ tự
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { parseStore, serialize } from '../src/leaderboard.js';
import { startServer } from '../scripts/serve.js';

const args = process.argv.slice(2);
const i = args.indexOf('--export-leaderboard');
if (i >= 0) {
  const out = args[i + 1];
  if (!out || out.startsWith('--')) {
    process.stderr.write('usage: --export-leaderboard <out.json>\n');
    process.exit(1);
  }
  const storePath = process.env.DDL_LEADERBOARD ?? path.join(homedir(), '.dao-den-long', 'leaderboard.json');
  const entries = existsSync(storePath) ? parseStore(readFileSync(storePath, 'utf8')) : [];
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  writeFileSync(out, serialize(entries));
  process.stdout.write(`exported ${entries.length} entries to ${out}\n`);
  process.exit(0);
} else {
  startServer();
}
