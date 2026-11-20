#!/usr/bin/env node
// Entry point headless: node bin/headless.js --seed 1 --night 1 --ticks 600 --out run.jsonl
import { main } from '../src/cli.js';

process.exitCode = main(process.argv.slice(2));
