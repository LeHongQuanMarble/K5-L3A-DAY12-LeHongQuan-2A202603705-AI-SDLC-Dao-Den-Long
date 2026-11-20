// Hiển thị three.js, menu và nhập liệu. Toàn bộ luật chơi nằm trong src/sim.js (dùng chung với headless).
import * as THREE from 'three';
import { createGame, createBenchGame, step, snapshot, applyInputFrame, timeLeft, DT } from '../src/sim.js';
import { TUNING as T } from '../src/tuning.js';
import { worldOf } from '../src/world.js';
import { validateName, validateEntry, addEntry, parseStore, serialize } from '../src/leaderboard.js';
import { ACTIONS, DEFAULT_SETTINGS, assignKey, parseSettings, serializeSettings } from '../src/settings.js';

const BG = 0x07061a;
const TURN_DEG_PER_S = 120;
const CAM_DIST = 7.5;
const CAM_HEIGHT = 3.2;
const NIGHT_NAMES = { 1: 'Đêm 1 · Đảo Bến', 2: 'Đêm 2 · Đảo Cau', 3: 'Đêm 3 · Đảo Chuông' };
const REASON_TEXT = {
  dawn_survived: 'Trời sáng và đảo vẫn sáng đủ. Mây giữ được đảo.',
  dawn: 'Trời sáng khi đèn chưa đủ. Bóng Mực rút lui.',
  no_flames: 'Ngọn lửa của Mây đã tắt.',
};

// ---------- lưu trữ cục bộ (có try/catch: không lưu được thì game vẫn chạy) ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
};
let settings = parseSettings(store.get('dden.settings') ?? '{}');
const saveSettings = () => store.set('dden.settings', serializeSettings(settings));
let leaderboard = parseStore(store.get('dden.leaderboard') ?? '{}');
const saveBoard = () => store.set('dden.leaderboard', serialize(leaderboard));

// ---------- trạng thái ----------
const params = new URLSearchParams(location.search);
const BENCH = params.get('bench') === '1';
const benchDuration = Number(params.get('duration') ?? 30);
const seedParam = Number(params.get('seed'));
let seed = params.get('seed') !== null && Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 1e9);
let night = 1;
let campaignScore = 0;
let nightsWon = 0;
let game;
let camYawDeg = 0;
const held = new Set();
let queued = { jump: false, interact: false, pulse: false, dash: false, pause: false };
let acc = 0;
let last = performance.now();
let msgTimer = 0;
let worldGroup = null;
let screen = 'menu';
let prevScreen = 'menu';
let rebinding = null;

// ---------- three.js ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 22, 70);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 220);
scene.add(new THREE.HemisphereLight(0x5a5a9a, 0x1a1024, 0.7));
const moon = new THREE.DirectionalLight(0x9db2ff, 0.5);
moon.position.set(-8, 14, 6);
scene.add(moon);
const sea = new THREE.Mesh(new THREE.CircleGeometry(200, 48), new THREE.MeshStandardMaterial({ color: 0x12384a, roughness: 0.4, metalness: 0.1 }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -1.7;
scene.add(sea);

// Mặt đất theo bản đồ của Đêm (src/world.js).
function buildWorld(n) {
  if (worldGroup) scene.remove(worldGroup);
  const w = worldOf(n);
  const grp = new THREE.Group();
  const grass = new THREE.MeshStandardMaterial({ color: 0x2f5d50, roughness: 1 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 });
  const flat = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    grp.add(m);
  };
  for (const s of w.ground) {
    if (s.kind === 'disc') {
      flat(new THREE.CircleGeometry(s.r, 72), grass, s.cx, s.y + 0.01, s.cz);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 0.75, 1.6, 72), rimMat);
      rim.position.set(s.cx, s.y - 0.8, s.cz);
      grp.add(rim);
    } else if (s.kind === 'rect') {
      flat(new THREE.PlaneGeometry(s.x1 - s.x0, s.z1 - s.z0), new THREE.MeshStandardMaterial({ color: 0x6b4a2f }), (s.x0 + s.x1) / 2, s.y + 0.02, (s.z0 + s.z1) / 2);
    } else if (s.kind === 'ring') {
      const m = new THREE.Mesh(new THREE.RingGeometry(s.rin, s.rout, 64, 1, Math.PI, Math.PI), grass);
      m.rotation.x = -Math.PI / 2;
      m.position.set(s.cx, s.y + 0.01, s.cz);
      grp.add(m);
    } else if (s.kind === 'ramp') {
      const a = (s.deg * Math.PI) / 180;
      const p = (along, lat, y) => [along * Math.cos(a) - lat * Math.sin(a), y, along * Math.sin(a) + lat * Math.cos(a)];
      const q = [p(s.rLow, -s.halfWidth, 0), p(s.rLow, s.halfWidth, 0), p(s.rHigh, s.halfWidth, s.yHigh), p(s.rHigh, -s.halfWidth, s.yHigh)];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]], 3));
      geo.computeVertexNormals();
      grp.add(new THREE.Mesh(geo, grass));
    }
  }
  for (const c of w.solids) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r, c.h, 24), new THREE.MeshStandardMaterial({ color: 0x3b2c24 }));
    m.position.set(c.cx, c.h / 2, c.cz);
    grp.add(m);
  }
  for (const pad of w.pads) {
    flat(new THREE.CircleGeometry(T.pad_radius, 24), new THREE.MeshStandardMaterial({ color: 0x8fa3b8, emissive: 0x2c4a66 }), pad.x, pad.y + 0.03, pad.z);
  }
  scene.add(grp);
  worldGroup = grp;
}

let lanternViews = [];
function buildLanterns(g) {
  for (const v of lanternViews) scene.remove(v.group);
  lanternViews = g.lanterns.map((l) => {
    const group = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x4a3a2e }));
    post.position.y = 1.1;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 16), new THREE.MeshStandardMaterial({ color: 0x3a2a1a, emissive: 0x000000 }));
    bulb.position.y = 2.5;
    const light = new THREE.PointLight(0xffa64d, 0, 11, 1.6);
    light.position.y = 2.5;
    const torn = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ color: 0xb8a77a, side: THREE.DoubleSide }));
    torn.position.set(0.3, 1.9, 0.06);
    torn.visible = false;
    group.add(post, bulb, light, torn);
    group.position.set(l.pos[0], l.pos[1], l.pos[2]);
    scene.add(group);
    return { id: l.id, bulb, light, group, torn };
  });
}

const moteGeo = new THREE.SphereGeometry(0.12, 10, 8);
const moteMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffe066, emissiveIntensity: 1.6 });
const droppedMat = new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffb347, emissiveIntensity: 1.2 });
const moteMeshes = [];
const drifterMat = new THREE.MeshStandardMaterial({ color: 0x8fa3b8, roughness: 0.6, transparent: true, opacity: 0.85 });
const drifterMeshes = new Map();
const charmMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, emissive: 0x3a0008 });
const charmMeshes = new Map();

const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 6, 12), new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.8 }));
body.position.y = 0.85;
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.28, 18), new THREE.MeshStandardMaterial({ color: 0xd9b77a, roughness: 0.9 }));
hat.position.y = 1.5;
const playerLantern = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffcf70, emissive: 0xffa640, emissiveIntensity: 2 }));
playerLantern.position.set(0.32, 1.0, 0.1);
const playerLight = new THREE.PointLight(0xffb36b, 1.4, 7, 1.5);
playerLight.position.copy(playerLantern.position);
player.add(body, hat, playerLantern, playerLight);
scene.add(player);

// Bóng Mực dùng chung geometry và material theo trạng thái (không tạo mới mỗi con).
const shadeCoreGeo = new THREE.SphereGeometry(0.55, 18, 14);
const shadeEyeGeo = new THREE.SphereGeometry(0.07, 8, 6);
const shadeCoreMats = {
  normal: new THREE.MeshStandardMaterial({ color: 0x120a1a, roughness: 0.6, emissive: 0x2a0d4a, emissiveIntensity: 0.6 }),
  drain: new THREE.MeshStandardMaterial({ color: 0x120a1a, roughness: 0.6, emissive: 0xff8a3d, emissiveIntensity: 1.0 }),
  stunned: new THREE.MeshStandardMaterial({ color: 0x120a1a, roughness: 0.6, emissive: 0x66c7ff, emissiveIntensity: 1.2 }),
};
const shadeEyeMats = { normal: new THREE.MeshBasicMaterial({ color: 0x7a3cff }), stunned: new THREE.MeshBasicMaterial({ color: 0xffffff }) };
const shadeViews = new Map();
function makeShadeView() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(shadeCoreGeo, shadeCoreMats.normal);
  core.position.y = 0.6;
  const eyeL = new THREE.Mesh(shadeEyeGeo, shadeEyeMats.normal);
  const eyeR = new THREE.Mesh(shadeEyeGeo, shadeEyeMats.normal);
  eyeL.position.set(-0.18, 0.7, 0.45);
  eyeR.position.set(0.18, 0.7, 0.45);
  g.add(core, eyeL, eyeR);
  scene.add(g);
  return { group: g, core, eyes: [eyeL, eyeR] };
}
// Bảng màu dễ phân biệt (Ticket-03 mục 6): viền Bóng Mực xanh, cảnh báo trắng.
const shadeOutline = () => (settings.colorblind ? 0x00b3ff : 0x7a3cff);
const warnColor = () => (settings.colorblind ? '#ffffff' : '#ff5a5f');

const pulses = [];
function spawnPulse() {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 48), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(game.player.pos[0], 0.05, game.player.pos[2]);
  scene.add(mesh);
  pulses.push({ mesh, t: 0 });
}

// ---------- màn hình ----------
function show(id) {
  for (const s of ['menu', 'board', 'settings', 'pause', 'over']) document.getElementById(s).hidden = s !== id;
}
function applyDisplaySettings() {
  document.documentElement.classList.toggle('large', settings.largeText);
  document.documentElement.classList.toggle('reduced', settings.reducedMotion);
  document.getElementById('help').textContent = helpText();
}
function keyLabel(code) {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift').replace('ArrowLeft', '←').replace('ArrowRight', '→');
}
function helpText() {
  const k = settings.keys;
  return `${keyLabel(k.forward)}${keyLabel(k.left)}${keyLabel(k.back)}${keyLabel(k.right)} di chuyển · ←/→ xoay camera · ${keyLabel(k.jump)} nhảy · ${keyLabel(k.dash)} lướt · ${keyLabel(k.interact)} nạp đèn · ${keyLabel(k.pulse)} tỏa sáng · ${keyLabel(k.pause)} tạm dừng · R chơi lại`;
}

// ---------- trò chơi ----------
function setupScene() {
  buildWorld(game.night);
  buildLanterns(game);
  for (const v of shadeViews.values()) scene.remove(v.group);
  shadeViews.clear();
  for (const m of moteMeshes) scene.remove(m);
  moteMeshes.length = 0;
  for (const v of drifterMeshes.values()) scene.remove(v);
  drifterMeshes.clear();
  for (const v of charmMeshes.values()) scene.remove(v);
  charmMeshes.clear();
  camYawDeg = 0;
  queued = { jump: false, interact: false, pulse: false, dash: false, pause: false };
  acc = 0;
}

function startNight(n, newSeed = seed) {
  night = n;
  seed = newSeed;
  game = createGame({ seed, night: n });
  setupScene();
  screen = 'game';
  show(null);
  showMsg(`${NIGHT_NAMES[n]} · seed ${seed}`, 3000);
  syncHud();
}

function startCampaign(newSeed = seed) {
  campaignScore = 0;
  nightsWon = 0;
  startNight(1, newSeed);
}

function showMsg(text, ms = 2200) {
  document.getElementById('msg').textContent = text;
  msgTimer = ms;
}

function onEvent(ev) {
  switch (ev.name) {
    case 'mote_picked': showMsg(`Nhặt được đom đóm (${ev.data.carried}/${snapshot(game).player.capacity})`, 1200); break;
    case 'deposit': showMsg(`Nạp ${ev.data.amount} đom đóm vào đèn ${ev.data.lantern_id} (${ev.data.deposited}/${T.lantern_cost})`); break;
    case 'lantern_lit': showMsg(ev.data.relight ? `Đèn ${ev.data.lantern_id} được thắp lại!` : `Đèn ${ev.data.lantern_id} đã sáng!`, 3000); break;
    case 'refuel': showMsg(`Châm ${ev.data.amount} đom đóm: đèn ${ev.data.lantern_id} còn ${ev.data.fuel.toFixed(1)} dầu`, 2000); break;
    case 'lantern_out': showMsg(`Đèn ${ev.data.lantern_id} đã tắt vì hết dầu!`, 3000); break;
    case 'pulse': spawnPulse(); showMsg(ev.data.stunned_ids.length ? `Tỏa sáng: choáng ${ev.data.stunned_ids.length} Bóng Mực` : 'Tỏa sáng: không có Bóng Mực trong tầm'); break;
    case 'player_hit': flash(); showMsg(ev.data.by === 'fall' ? `Mây rơi khỏi đảo! Còn ${ev.data.flames} ngọn lửa` : `Bóng Mực làm tắt một ngọn lửa! Còn ${ev.data.flames}`, 2500); break;
    case 'shade_spawned': showMsg('Một Bóng Mực mới xuất hiện trong sương', 2500); break;
    case 'drifter_steal': showMsg(`Gió Lạc cướp ${ev.data.amount} đom đóm!`, 2500); break;
    case 'charm_picked': showMsg('Bùa Gió: chạy nhanh hơn và lướt không hồi chiêu', 2500); break;
    case 'paused': show('pause'); break;
    case 'resumed': show(null); break;
    default: break;
  }
  if (ev.name === 'game_over') onGameOver(ev.data);
}

function flash() {
  if (settings.reducedMotion) return; // giảm chuyển động: không chớp màn hình
  const f = document.getElementById('flash');
  f.style.opacity = '1';
  setTimeout(() => { f.style.opacity = '0'; }, 120);
}

// Thắng Đêm 1–2: sang đêm kế. Thắng Đêm 3 hoặc thua ở bất kỳ Đêm nào: nhập tên vào bảng xếp hạng.
function onGameOver({ result, reason }) {
  const snap = snapshot(game);
  const title = document.getElementById('over-title');
  const text = document.getElementById('over-text');
  const next = document.getElementById('over-next');
  const entry = document.getElementById('entry');
  entry.hidden = true;
  document.getElementById('entry-err').hidden = true;
  if (BENCH) return;
  if (result === 'won') {
    campaignScore += snap.score;
    nightsWon += 1;
    if (night < 3) {
      title.textContent = `${NIGHT_NAMES[night]}: đèn vẫn sáng!`;
      text.textContent = `Điểm đêm này ${snap.score}. Tổng điểm ${campaignScore}.`;
      next.textContent = 'Sang đêm kế tiếp (Enter)';
      next.onclick = () => startNight(night + 1, seed);
    } else {
      title.textContent = 'Bình Minh';
      text.textContent = `Đảo vẫn sáng khi trời hửng. Tổng điểm: ${campaignScore}.`;
      next.textContent = 'Chơi lại từ Đêm 1';
      next.onclick = () => startCampaign(Math.floor(Math.random() * 1e9));
      entry.hidden = false;
    }
  } else {
    title.textContent = `${NIGHT_NAMES[night]}: đã thua`;
    text.textContent = REASON_TEXT[reason] ?? '';
    next.textContent = 'Chơi lại đêm này (R)';
    next.onclick = () => startNight(night, Math.floor(Math.random() * 1e9));
    entry.hidden = false;
  }
  screen = 'over';
  show('over');
}

function simStep() {
  if (BENCH) { step(game); return; }
  const move = [0, 0];
  const k = settings.keys;
  if (held.has(k.forward)) move[1] += 1;
  if (held.has(k.back)) move[1] -= 1;
  if (held.has(k.right)) move[0] += 1;
  if (held.has(k.left)) move[0] -= 1;
  if (held.has('ArrowLeft')) camYawDeg -= TURN_DEG_PER_S * DT;
  if (held.has('ArrowRight')) camYawDeg += TURN_DEG_PER_S * DT;
  applyInputFrame(game, {
    move,
    cam_yaw_deg: camYawDeg,
    jump: queued.jump,
    interact: queued.interact,
    pulse: queued.pulse,
    dash: queued.dash,
    pause: queued.pause,
  });
  queued = { jump: false, interact: false, pulse: false, dash: false, pause: false };
  step(game);
  for (const ev of game.events) onEvent(ev);
}

// ---------- hiển thị ----------
function fmtTime(s) {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function syncHud() {
  const snap = snapshot(game);
  const lit = snap.lanterns.filter((l) => l.lit).length;
  document.getElementById('night').textContent = night;
  document.getElementById('carried').textContent = snap.player.carried;
  document.getElementById('capacity').textContent = snap.player.capacity;
  document.getElementById('lit').textContent = lit;
  document.getElementById('lantern-total').textContent = snap.lanterns.length;
  document.getElementById('hp').textContent = snap.player.flames;
  const t = timeLeft(game);
  const timeEl = document.getElementById('time');
  timeEl.textContent = fmtTime(t);
  timeEl.classList.toggle('alarm', t <= 10 && t > 0); // 10 s cuối: nhấp nháy đỏ
  document.getElementById('score').textContent = snap.score;
  document.getElementById('total').textContent = campaignScore + snap.score;
  const wind = document.getElementById('wind');
  wind.textContent = snap.wind.active ? '⚠ Gió mạnh!' : snap.wind.warning ? '⚠ Gió sắp tới' : '';
  wind.style.color = snap.wind.active || snap.wind.warning ? warnColor() : '';
  document.getElementById('dash-cd').textContent = snap.player.dash_cd_s > 0 ? snap.player.dash_cd_s.toFixed(1) : 'sẵn sàng';
  document.getElementById('pulse-cd').textContent = snap.player.pulse_cd_s > 0 ? snap.player.pulse_cd_s.toFixed(1) : 'sẵn sàng';
}

// Chỉ báo Bóng Mực ngoài màn hình: mũi tên ở mép, chỉ về phía Bóng Mực.
const arrowLayer = document.getElementById('arrows');
const arrowEls = [];
function syncArrows() {
  let used = 0;
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (game && screen === 'game' && !BENCH) {
    for (const s of game.shades) {
      const v = new THREE.Vector3(s.pos[0], s.pos[1] + 0.6, s.pos[2]).project(camera);
      const onScreen = v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
      if (onScreen) continue;
      let el = arrowEls[used];
      if (!el) { el = document.createElement('div'); el.className = 'arrow'; arrowLayer.appendChild(el); arrowEls.push(el); }
      used += 1;
      el.style.display = 'block';
      const k = Math.min(w / 2 / (Math.abs(v.x) || 1e-6), h / 2 / (Math.abs(v.y) || 1e-6));
      const x = w / 2 + v.x * k * 0.92 - 10;
      const y = h / 2 - v.y * k * 0.92 - 9;
      el.style.left = `${Math.max(12, Math.min(w - 32, x))}px`;
      el.style.top = `${Math.max(120, Math.min(h - 40, y))}px`;
      el.style.transform = `rotate(${(Math.atan2(-v.y, v.x) * 180) / Math.PI - 90}deg)`;
    }
  }
  for (let i = used; i < arrowEls.length; i++) arrowEls[i].style.display = 'none';
}

function syncScene(now) {
  const p = game.player;
  const snap = snapshot(game);
  player.position.set(p.pos[0], p.pos[1], p.pos[2]);
  player.scale.setScalar(1 + (p.grounded ? 0 : 0.05));
  player.visible = p.respawn === 0;

  for (const v of lanternViews) {
    const l = snap.lanterns.find((x) => x.id === v.id);
    // Đèn tắt xẹp 20% và có giấy rách; đèn sắp hết dầu (<30) nhấp nháy 1 Hz.
    v.group.scale.y = l.lit ? 1 : 0.8;
    v.torn.visible = !l.lit;
    const low = l.lit && l.fuel < 30;
    const blink = low ? ((now / 500) % 2 < 1 ? 1 : 0.15) : 1;
    v.bulb.material.emissive.setHex(l.lit ? 0xffa640 : 0x000000);
    v.bulb.material.emissiveIntensity = l.lit ? (1.8 + 0.2 * Math.sin(now / 300)) * blink : 0;
    v.bulb.material.color.setHex(l.lit ? 0xffd38a : 0x3a2a1a);
    v.light.intensity = l.lit ? 6 * blink : 0;
  }

  while (moteMeshes.length < game.motes.length) {
    const m = new THREE.Mesh(moteGeo, moteMat);
    scene.add(m);
    moteMeshes.push(m);
  }
  moteMeshes.forEach((m, i) => {
    if (i < game.motes.length) {
      const q = game.motes[i];
      m.visible = true;
      m.material = q.kind === 'dropped' ? droppedMat : moteMat;
      m.position.set(q.pos[0], q.pos[1] + 0.7 + 0.1 * Math.sin(now / 250 + i), q.pos[2]);
    } else {
      m.visible = false;
    }
  });

  const alive = new Set(game.shades.map((s) => s.id));
  for (const [id, v] of shadeViews) {
    if (!alive.has(id)) { scene.remove(v.group); shadeViews.delete(id); }
  }
  for (const s of game.shades) {
    if (!shadeViews.has(s.id)) shadeViews.set(s.id, makeShadeView());
    const v = shadeViews.get(s.id);
    v.group.position.set(s.pos[0], s.pos[1], s.pos[2]);
    const stunned = s.state === 'stunned';
    const draining = s.state === 'drain';
    v.core.material = stunned ? shadeCoreMats.stunned : draining ? shadeCoreMats.drain : shadeCoreMats.normal;
    v.core.scale.setScalar(stunned ? 0.9 + 0.1 * Math.sin(now / 80) : 1);
    shadeEyeMats.normal.color.setHex(shadeOutline());
    for (const e of v.eyes) e.material = stunned ? shadeEyeMats.stunned : shadeEyeMats.normal;
  }

  const driftIds = new Set(game.drifters.map((d) => d.id));
  for (const [id, m] of drifterMeshes) {
    if (!driftIds.has(id)) { scene.remove(m); drifterMeshes.delete(id); }
  }
  for (const d of game.drifters) {
    if (!drifterMeshes.has(d.id)) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), drifterMat);
      m.scale.set(1.4, 0.4, 0.6);
      scene.add(m);
      drifterMeshes.set(d.id, m);
    }
    drifterMeshes.get(d.id).position.set(d.pos[0], d.pos[1] + 1.8, d.pos[2]);
  }

  for (const c of game.charms) {
    if (!charmMeshes.has(c.id)) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), charmMat);
      scene.add(m);
      charmMeshes.set(c.id, m);
    }
    const m = charmMeshes.get(c.id);
    m.visible = c.available;
    m.position.set(c.pos[0], c.pos[1] + 0.2 + 0.05 * Math.sin(now / 300), c.pos[2]);
  }

  for (let i = pulses.length - 1; i >= 0; i--) {
    const pu = pulses[i];
    pu.t += 1 / 60;
    const k = pu.t / 0.6;
    pu.mesh.scale.setScalar(1 + k * T.pulse_radius);
    pu.mesh.material.opacity = Math.max(0, 0.9 * (1 - k));
    if (k >= 1) { scene.remove(pu.mesh); pulses.splice(i, 1); }
  }

  if (BENCH) {
    // Camera bay vòng tròn tâm (0,0,0), bán kính 30 m, Y = 15, 15 s một vòng, ngược chiều kim đồng hồ khi nhìn từ trên
    // (trục X sang phải, Z xuống dưới trên bản đồ nhìn từ trên).
    const th = ((now - benchT0) / 1000) * ((2 * Math.PI) / 15);
    camera.position.set(30 * Math.cos(th), 15, -30 * Math.sin(th));
    camera.lookAt(0, 0, 0);
    return;
  }
  const yaw = (camYawDeg * Math.PI) / 180;
  const target = new THREE.Vector3(p.pos[0], p.pos[1] + 1.4, p.pos[2]);
  const want = new THREE.Vector3(target.x - Math.sin(yaw) * CAM_DIST, target.y + CAM_HEIGHT, target.z - Math.cos(yaw) * CAM_DIST);
  camera.position.lerp(want, 0.2);
  camera.lookAt(target);
}

// ---------- chế độ benchmark (Ticket-04 mục 1) ----------
let benchT0 = 0;
const bench = { dts: [], firstFrameEpoch: 0, done: false, renderer: '' };
function startBench() {
  game = createBenchGame({ seed });
  night = 1;
  setupScene();
  screen = 'game';
  show(null);
  for (const id of ['stats', 'help', 'cool', 'msg', 'wind']) document.getElementById(id).style.display = 'none';
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  bench.renderer = `three.js r160 (WebGL): ${dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)}`;
  benchT0 = performance.now();
  window.__bench = bench;
}

// ---------- vòng lặp ----------
let prevFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (BENCH) {
    // Khung đầu tiên đã hiển thị: ghi mốc để tính load_ms. 3 s đầu là khởi động (không đo).
    if (!bench.firstFrameEpoch) bench.firstFrameEpoch = Date.now();
    const elapsed = (now - benchT0) / 1000;
    if (elapsed > 3 && elapsed <= 3 + benchDuration) bench.dts.push(now - prevFrame);
    if (elapsed > 3 + benchDuration && !bench.done) {
      bench.done = true;
      bench.dts = bench.dts.slice();
    }
    prevFrame = now;
    acc += dt;
    while (acc >= DT) { simStep(); acc -= DT; }
    syncScene(now);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
    return;
  }
  prevFrame = now;
  if (screen === 'game' && game.state === 'playing') {
    acc += dt;
    while (acc >= DT && game.state === 'playing' && screen === 'game') {
      simStep();
      acc -= DT;
    }
  } else {
    acc = 0;
  }
  if (msgTimer > 0) {
    msgTimer -= dt * 1000;
    if (msgTimer <= 0) document.getElementById('msg').textContent = '';
  }
  if (game) {
    syncHud();
    syncScene(now);
  }
  syncArrows();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- bảng xếp hạng ----------
function renderBoard() {
  const rows = document.getElementById('board-rows');
  rows.textContent = '';
  leaderboard.forEach((e, i) => {
    const tr = document.createElement('tr');
    for (const v of [i + 1, e.name, e.score, `${e.nights_won}/3`, e.achieved_at.slice(0, 16).replace('T', ' ')]) {
      const td = document.createElement('td');
      td.textContent = String(v);
      tr.appendChild(td);
    }
    rows.appendChild(tr);
  });
  document.getElementById('board-empty').hidden = leaderboard.length > 0;
}

function saveEntry() {
  const name = document.getElementById('entry-name').value.trim();
  const err = document.getElementById('entry-err');
  if (!validateName(name)) {
    err.textContent = 'Tên cần 3–12 ký tự: chữ không dấu, số hoặc _';
    err.hidden = false;
    return;
  }
  const entry = { name, score: campaignScore, nights_won: nightsWon, achieved_at: new Date().toISOString(), seed };
  const problem = validateEntry(entry);
  if (problem) { err.textContent = problem; err.hidden = false; return; }
  leaderboard = addEntry(leaderboard, entry);
  saveBoard();
  document.getElementById('entry').hidden = true;
  renderBoard();
  screen = 'board';
  show('board');
}

function exportBoard() {
  const blob = new Blob([serialize(leaderboard)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leaderboard.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- cài đặt ----------
function renderKeys() {
  const body = document.querySelector('#keys tbody');
  body.textContent = '';
  for (const a of ACTIONS) {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = a.label;
    const td2 = document.createElement('td');
    const b = document.createElement('button');
    b.className = 'ghost';
    b.textContent = rebinding === a.id ? 'Nhấn phím…' : keyLabel(settings.keys[a.id]);
    b.addEventListener('click', () => { rebinding = a.id; renderKeys(); showKeyMsg(''); });
    td2.appendChild(b);
    tr.append(td1, td2);
    body.appendChild(tr);
  }
}
function showKeyMsg(text) {
  const el = document.getElementById('key-msg');
  el.textContent = text;
  el.hidden = !text;
}
function syncSettingsInputs() {
  document.getElementById('opt-reduced').checked = settings.reducedMotion;
  document.getElementById('opt-large').checked = settings.largeText;
  document.getElementById('opt-colorblind').checked = settings.colorblind;
}

// ---------- nhập liệu ----------
window.addEventListener('keydown', (e) => {
  // Đang đổi phím: nhận phím tiếp theo; Esc hủy. Trùng phím bị từ chối và báo lỗi.
  if (rebinding) {
    e.preventDefault();
    if (e.code === 'Escape') { rebinding = null; renderKeys(); return; }
    const r = assignKey(settings.keys, rebinding, e.code);
    if (r.ok) { settings.keys = r.keys; saveSettings(); showKeyMsg(''); applyDisplaySettings(); }
    else showKeyMsg(r.error);
    rebinding = null;
    renderKeys();
    return;
  }
  if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return; // đang gõ tên
  const k = settings.keys;
  const gameKeys = [k.forward, k.back, k.left, k.right, k.jump, k.dash, k.interact, k.pulse, k.pause, 'ArrowLeft', 'ArrowRight'];
  if (gameKeys.includes(e.code)) e.preventDefault();
  if (e.code === 'Enter' && screen === 'over') {
    if (document.getElementById('entry').hidden) document.getElementById('over-next').click();
    return;
  }
  if (e.code === 'KeyR' && screen !== 'menu' && screen !== 'entry') { startCampaign(Math.floor(Math.random() * 1e9)); return; }
  if (screen !== 'game' || BENCH) return;
  if (e.repeat) return;
  held.add(e.code);
  if (e.code === k.jump) queued.jump = true;
  if (e.code === k.interact) queued.interact = true;
  if (e.code === k.pulse) queued.pulse = true;
  if (e.code === k.dash) queued.dash = true;
  if (e.code === k.pause) queued.pause = true;
});
window.addEventListener('keyup', (e) => held.delete(e.code));
window.addEventListener('blur', () => held.clear());
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- nút ----------
const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
on('menu-play', () => startCampaign(seed));
on('menu-board', () => { renderBoard(); screen = 'board'; show('board'); });
on('menu-settings', () => { prevScreen = 'menu'; screen = 'settings'; renderKeys(); syncSettingsInputs(); show('settings'); });
on('board-back', () => { screen = 'menu'; show('menu'); });
on('board-export', exportBoard);
on('settings-back', () => {
  rebinding = null;
  showKeyMsg('');
  screen = prevScreen;
  show(prevScreen === 'game' ? null : prevScreen);
});
on('keys-reset', () => {
  settings = { ...settings, keys: { ...DEFAULT_SETTINGS.keys } };
  saveSettings();
  renderKeys();
  applyDisplaySettings();
});
on('resume', () => { queued.pause = true; });
on('restart-night', () => startNight(night, Math.floor(Math.random() * 1e9)));
on('pause-settings', () => { prevScreen = 'game'; screen = 'settings'; renderKeys(); syncSettingsInputs(); show('settings'); });
on('pause-menu', () => { screen = 'menu'; show('menu'); });
on('over-menu', () => { screen = 'menu'; show('menu'); });
on('over-board', () => { renderBoard(); screen = 'board'; show('board'); });
on('entry-save', saveEntry);
on('over-next', () => startCampaign(Math.floor(Math.random() * 1e9)));
document.getElementById('opt-reduced').addEventListener('change', (e) => { settings.reducedMotion = e.target.checked; saveSettings(); applyDisplaySettings(); });
document.getElementById('opt-large').addEventListener('change', (e) => { settings.largeText = e.target.checked; saveSettings(); applyDisplaySettings(); });
document.getElementById('opt-colorblind').addEventListener('change', (e) => { settings.colorblind = e.target.checked; saveSettings(); });

applyDisplaySettings();
if (BENCH) {
  startBench();
} else {
  show('menu');
}
requestAnimationFrame(frame);
