// Chạy mô phỏng không cửa sổ và trả về nội dung JSONL theo Test Contract v1.0.
import { createGame, step, snapshot, applyInputFrame } from './sim.js';
import { normalizeScenario, normalizeInputs, MalformedError } from './scenario.js';

function parseJson(text, what) {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new MalformedError(`${what} is not valid JSON: ${e.message}`);
  }
}

export function runSimulation({ seed, ticks, snapshotEvery = 10, scenarioText = null, inputsText = null }) {
  const scenario = scenarioText == null ? null : normalizeScenario(parseJson(scenarioText, 'scenario'));
  const frames = inputsText == null ? [] : normalizeInputs(parseJson(inputsText, 'inputs'));

  const game = createGame({ seed, scenario });
  const lines = [JSON.stringify(snapshot(game))];
  let fi = 0;

  for (let k = 0; k < ticks && game.state === 'playing'; k++) {
    while (fi < frames.length && frames[fi].tick <= k) applyInputFrame(game, frames[fi++]);
    step(game);
    for (const ev of game.events) {
      lines.push(JSON.stringify({ type: 'event', tick: ev.tick, name: ev.name, data: ev.data }));
    }
    if (game.tick % snapshotEvery === 0) lines.push(JSON.stringify(snapshot(game)));
  }

  lines.push(JSON.stringify({ type: 'end', ticks: game.tick, state: game.state, score: game.score }));
  return lines.join('\n') + '\n';
}
