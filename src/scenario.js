// Đọc và kiểm tra scenario / inputs. Mọi lỗi định dạng ném MalformedError (CLI trả exit code 2).
import { TUNING as T } from './tuning.js';

export class MalformedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MalformedError';
  }
}

const bad = (msg) => { throw new MalformedError(msg); };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);

function vec3(v, where) {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(isFiniteNum)) bad(`${where} must be [x, y, z] numbers`);
  return [...v];
}

function nonNegInt(v, where) {
  if (!Number.isInteger(v) || v < 0) bad(`${where} must be a non-negative integer`);
  return v;
}

// Mã đèn tối đa trên mọi Đêm là L7 (Đêm 3); sim kiểm tra id theo Đêm.
const LANTERN_IDS = Array.from({ length: 7 }, (_, i) => `L${i + 1}`);

export function normalizeScenario(raw) {
  if (!isObj(raw)) bad('scenario must be a JSON object');
  const out = {
    random_motes: true,
    random_shades: true,
    random_drifters: true,
    lanterns: [],
  };

  if (raw.player !== undefined) {
    if (!isObj(raw.player)) bad('player must be an object');
    const p = {};
    if (raw.player.pos !== undefined) p.pos = vec3(raw.player.pos, 'player.pos');
    if (raw.player.carried !== undefined) {
      p.carried = nonNegInt(raw.player.carried, 'player.carried');
      if (p.carried > T.carry_capacity) bad(`player.carried must be <= ${T.carry_capacity}`);
    }
    if (raw.player.flames !== undefined) p.flames = nonNegInt(raw.player.flames, 'player.flames');
    for (const k of ['invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) {
      if (raw.player[k] !== undefined) p[k] = nonNegInt(raw.player[k], `player.${k}`);
    }
    out.player = p;
  }

  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    if (raw[k] !== undefined) {
      if (typeof raw[k] !== 'boolean') bad(`${k} must be a boolean`);
      out[k] = raw[k];
    }
  }

  if (raw.motes !== undefined) {
    if (!Array.isArray(raw.motes)) bad('motes must be an array');
    out.motes = raw.motes.map((m, i) => vec3(m, `motes[${i}]`));
  }

  if (raw.drifters !== undefined) {
    if (!Array.isArray(raw.drifters)) bad('drifters must be an array');
    out.drifters = raw.drifters.map((d, i) => {
      if (!isObj(d)) bad(`drifters[${i}] must be an object`);
      const item = { pos: vec3(d.pos, `drifters[${i}].pos`) };
      if (d.id !== undefined) item.id = d.id;
      if (d.state !== undefined) {
        if (!['idle', 'chase', 'flee'].includes(d.state)) bad(`drifters[${i}].state must be idle, chase or flee`);
        item.state = d.state;
      }
      if (d.stolen !== undefined) item.stolen = nonNegInt(d.stolen, `drifters[${i}].stolen`);
      return item;
    });
  }

  if (raw.charms !== undefined) {
    if (!Array.isArray(raw.charms)) bad('charms must be an array');
    out.charms = raw.charms.map((c, i) => {
      if (!isObj(c) || typeof c.id !== 'string') bad(`charms[${i}].id must be a string`);
      const item = { id: c.id };
      if (c.available !== undefined) {
        if (typeof c.available !== 'boolean') bad(`charms[${i}].available must be a boolean`);
        item.available = c.available;
      }
      if (c.respawn_ticks !== undefined) item.respawn_ticks = nonNegInt(c.respawn_ticks, `charms[${i}].respawn_ticks`);
      return item;
    });
  }

  if (raw.shades !== undefined) {
    if (!Array.isArray(raw.shades)) bad('shades must be an array');
    const seen = new Set();
    out.shades = raw.shades.map((s, i) => {
      if (!isObj(s)) bad(`shades[${i}] must be an object`);
      const item = { pos: vec3(s.pos, `shades[${i}].pos`) };
      if (s.state !== undefined) {
        if (!['spawning', 'wander', 'chase', 'recoil', 'stunned'].includes(s.state)) {
          bad(`shades[${i}].state must be one of spawning, wander, chase, recoil, stunned`);
        }
        item.state = s.state;
      }
      if (s.state_ticks_left !== undefined) item.state_ticks_left = nonNegInt(s.state_ticks_left, `shades[${i}].state_ticks_left`);
      if (s.id !== undefined) {
        if (typeof s.id !== 'string' || s.id === '') bad(`shades[${i}].id must be a non-empty string`);
        if (/^S\d+$/.test(s.id)) bad(`shades[${i}].id must not use the auto-generated S<n> form`);
        if (seen.has(s.id)) bad(`duplicate shade id ${s.id}`);
        seen.add(s.id);
        item.id = s.id;
      }
      return item;
    });
  }

  if (raw.lanterns !== undefined) {
    if (!Array.isArray(raw.lanterns)) bad('lanterns must be an array');
    out.lanterns = raw.lanterns.map((l, i) => {
      if (!isObj(l) || !LANTERN_IDS.includes(l.id)) bad(`lanterns[${i}].id must be one of ${LANTERN_IDS.join(', ')}`);
      const item = { id: l.id };
      if (l.pos !== undefined) item.pos = vec3(l.pos, `lanterns[${i}].pos`);
      if (l.lit !== undefined) {
        if (typeof l.lit !== 'boolean') bad(`lanterns[${i}].lit must be a boolean`);
        item.lit = l.lit;
      }
      if (l.deposited !== undefined) item.deposited = nonNegInt(l.deposited, `lanterns[${i}].deposited`);
      return item;
    });
  }

  if (raw.time_left_s !== undefined) {
    if (!isFiniteNum(raw.time_left_s)) bad('time_left_s must be a number');
    out.time_left_s = raw.time_left_s;
  }

  return out;
}

const BUTTONS = ['jump', 'interact', 'pulse', 'dash', 'pause'];

export function normalizeInputs(raw) {
  if (!isObj(raw) || !Array.isArray(raw.frames)) bad('inputs must be an object with a "frames" array');
  let last = -1;
  return raw.frames.map((f, i) => {
    if (!isObj(f)) bad(`frames[${i}] must be an object`);
    if (!Number.isInteger(f.tick) || f.tick < 0) bad(`frames[${i}].tick must be a non-negative integer`);
    if (f.tick <= last) bad(`frames[${i}].tick must strictly increase`);
    last = f.tick;
    const fr = { tick: f.tick };
    if (f.move !== undefined) {
      if (!Array.isArray(f.move) || f.move.length !== 2 || !f.move.every((c) => isFiniteNum(c) && c >= -1 && c <= 1)) {
        bad(`frames[${i}].move must be [x, z] with components in [-1, 1]`);
      }
      fr.move = [...f.move];
    }
    if (f.cam_yaw_deg !== undefined) {
      if (!isFiniteNum(f.cam_yaw_deg)) bad(`frames[${i}].cam_yaw_deg must be a number`);
      fr.cam_yaw_deg = f.cam_yaw_deg;
    }
    for (const b of BUTTONS) {
      if (f[b] !== undefined) {
        if (typeof f[b] !== 'boolean') bad(`frames[${i}].${b} must be a boolean`);
        fr[b] = f[b];
      }
    }
    return fr;
  });
}
