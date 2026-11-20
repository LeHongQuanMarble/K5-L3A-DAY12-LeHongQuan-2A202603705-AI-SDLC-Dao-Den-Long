// Hiển thị three.js, menu và nhập liệu. Toàn bộ luật chơi nằm trong src/sim.js (dùng chung với headless).
import * as THREE from 'three';
import { createGame, createBenchGame, step, snapshot, applyInputFrame, timeLeft, DT } from '../src/sim.js';
import { TUNING as T } from '../src/tuning.js';
import { worldOf } from '../src/world.js';
import { validateName, validateEntry, addEntry, parseStore, serialize } from '../src/leaderboard.js';
import { ACTIONS, DEFAULT_SETTINGS, assignKey, parseSettings, serializeSettings } from '../src/settings.js';
import { unlock, setVolume, sfx, ambientLevel } from './audio.js';

// ---------- bảng màu chuẩn (Ticket-02 phần 3) ----------
const C = {
  night: 0x0e1430, fog: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f,
  sea: 0x12384a, lanternLit: 0xffb347, lanternCore: 0xffe9b0, lanternOff: 0x5b5f6e,
  moteCore: 0xfff6c2, moteHalo: 0xffe58a, shadeBody: 0x120a1a, shadeOutline: 0x7a3cff,
  shadeOutlineCB: 0x00b3ff, shadeStunned: 0x3a3450, shirt: 0xe8e2d0, scarf: 0xc8102e,
  gold: 0xf2c14e, drifter: 0x8fa3b8, danger: 0xff5a5f, dangerCB: 0xffffff, uiText: 0xf5f1e6,
};
const MAX_INST = 256; // số thực thể tối đa mỗi InstancedMesh
const TURN_DEG_PER_S = 120;
const CAM_DIST = 7.5;
const CAM_HEIGHT = 3.2;
const NIGHT_NAMES = { 1: 'Đêm 1 · Đảo Bến', 2: 'Đêm 2 · Đảo Cau', 3: 'Đêm 3 · Đảo Chuông' };
const NIGHT_INTRO = {
  1: 'Đảo Bến chìm trong sương. Năm Đèn Lồng Lớn cần dầu, và Bóng Mực đang lần theo ánh sáng yếu nhất.',
  2: 'Đảo Cau có hai hòn đảo nối bằng cầu tre. Bục nhảy sẽ bắn Mây sang đảo kia, còn Gió Lạc rình đom đóm trên đường.',
  3: 'Đảo Chuông có ba tầng, vách đá, dốc và tháp chuông. Gió sẽ thổi mạnh; giữ đèn sáng tới bình minh.',
};
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
setVolume(settings.volume);

// ---------- trạng thái ----------
const params = new URLSearchParams(location.search);
const BENCH = params.get('bench') === '1';
const TEST = params.has('test'); // cờ kiểm thử E2E: mở window.__ddl
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
let dragging = false;
let shake = 0;
let lastWindWarn = false;
let lastCountdown = -1;

// ---------- three.js ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.night);
scene.fog = new THREE.Fog(C.fog, 22, 70);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 220);
const hemi = new THREE.HemisphereLight(0x5a5a9a, 0x1a1024, 0.7);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9db2ff, 0.5);
moon.position.set(-8, 14, 6);
scene.add(moon);
const sea = new THREE.Mesh(new THREE.CircleGeometry(200, 48), new THREE.MeshStandardMaterial({ color: C.sea, roughness: 0.4, metalness: 0.1 }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -1.7;
scene.add(sea);

// Mặt đất theo bản đồ của Đêm (src/world.js).
function buildWorld(n) {
  if (worldGroup) scene.remove(worldGroup);
  const w = worldOf(n);
  const grp = new THREE.Group();
  const grass = new THREE.MeshStandardMaterial({ color: C.grass, roughness: 1 });
  const sandMat = new THREE.MeshStandardMaterial({ color: C.sand, roughness: 1 });
  const woodMat = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 1 });
  const flat = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    grp.add(m);
  };
  for (const s of w.ground) {
    if (s.kind === 'disc') {
      flat(new THREE.CircleGeometry(s.r, 72), grass, s.cx, s.y + 0.01, s.cz);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * 0.75, 1.6, 72), sandMat);
      rim.position.set(s.cx, s.y - 0.8, s.cz);
      grp.add(rim);
    } else if (s.kind === 'rect') {
      flat(new THREE.PlaneGeometry(s.x1 - s.x0, s.z1 - s.z0), woodMat, (s.x0 + s.x1) / 2, s.y + 0.02, (s.z0 + s.z1) / 2);
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
    const m = new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r, c.h, 24), woodMat);
    m.position.set(c.cx, c.h / 2, c.cz);
    grp.add(m);
  }
  for (const pad of w.pads) {
    flat(new THREE.CircleGeometry(T.pad_radius, 24), new THREE.MeshStandardMaterial({ color: C.drifter, emissive: 0x2c4a66 }), pad.x, pad.y + 0.03, pad.z);
  }
  scene.add(grp);
  worldGroup = grp;
}

// Đèn lồng: cột gỗ, bóng đèn (sáng: #FFB347 phát sáng, lõi #FFE9B0; tắt: #5B5F6E), giấy rách khi tắt, thanh dầu.
const fuelBarBg = new THREE.MeshBasicMaterial({ color: 0x000000 });
const fuelBarFill = new THREE.MeshBasicMaterial({ color: C.lanternLit });
let lanternViews = [];
function buildLanterns(g) {
  for (const v of lanternViews) scene.remove(v.group);
  lanternViews = g.lanterns.map((l) => {
    const group = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 8), new THREE.MeshStandardMaterial({ color: C.wood }));
    post.position.y = 1.1;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 16), new THREE.MeshStandardMaterial({ color: C.lanternOff, emissive: 0x000000 }));
    bulb.position.y = 2.5;
    const light = new THREE.PointLight(C.lanternLit, 0, 11, 1.6);
    light.position.y = 2.5;
    const torn = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ color: C.sand, side: THREE.DoubleSide }));
    torn.position.set(0.3, 1.9, 0.06);
    torn.visible = false;
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12), fuelBarBg);
    barBg.position.set(0, 3.3, 0);
    const barFill = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12), fuelBarFill);
    barFill.position.set(0, 3.3, 0.01);
    group.add(post, bulb, light, torn, barBg, barFill);
    group.position.set(l.pos[0], l.pos[1], l.pos[2]);
    scene.add(group);
    return { id: l.id, bulb, light, group, torn, barFill };
  });
}

// Đom đóm và Bóng Mực dùng InstancedMesh (một lệnh vẽ mỗi loại).
const moteGeo = new THREE.SphereGeometry(0.12, 10, 8);
const moteMat = new THREE.MeshStandardMaterial({ color: C.moteCore, emissive: C.moteHalo, emissiveIntensity: 1.6 });
const moteInst = new THREE.InstancedMesh(moteGeo, moteMat, MAX_INST);
moteInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
moteInst.count = 0;
scene.add(moteInst);

const dummy = new THREE.Object3D();
const WHITE = new THREE.Color(0xffffff);
const DROPPED_TINT = new THREE.Color(0xffd36b);
const CORE_NORMAL = new THREE.Color(C.shadeBody);
const CORE_DRAIN = new THREE.Color(0x3a1a10);
const CORE_STUNNED = new THREE.Color(C.shadeStunned);
const shadeCoreGeo = new THREE.SphereGeometry(0.55, 18, 14);
const shadeEyeGeo = new THREE.SphereGeometry(0.07, 8, 6);
const shadeCore = new THREE.InstancedMesh(shadeCoreGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0x2a0d4a, emissiveIntensity: 0.6 }), MAX_INST);
const shadeEyeL = new THREE.InstancedMesh(shadeEyeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_INST);
const shadeEyeR = new THREE.InstancedMesh(shadeEyeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_INST);
for (const m of [shadeCore, shadeEyeL, shadeEyeR]) {
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.count = 0;
  scene.add(m);
}
shadeCore.setColorAt(0, WHITE);
shadeEyeL.setColorAt(0, WHITE);
shadeEyeR.setColorAt(0, WHITE);
moteInst.setColorAt(0, WHITE);
const shadeOutline = () => new THREE.Color(settings.colorblind ? C.shadeOutlineCB : C.shadeOutline);
const warnColor = () => (settings.colorblind ? '#ffffff' : '#ff5a5f');

const drifterMat = new THREE.MeshStandardMaterial({ color: C.drifter, roughness: 0.6, transparent: true, opacity: 0.85 });
const drifterMeshes = new Map();
const charmMat = new THREE.MeshStandardMaterial({ color: C.scarf, emissive: 0x3a0008 });
const charmMeshes = new Map();

// Mây: áo #E8E2D0, khăn #C8102E, đội nón lá, treo đèn lồng nhỏ.
const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.6, 6, 12), new THREE.MeshStandardMaterial({ color: C.shirt, roughness: 0.8 }));
body.position.y = 0.85;
const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.18), new THREE.MeshStandardMaterial({ color: C.scarf }));
scarf.position.set(0, 1.12, 0);
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.28, 18), new THREE.MeshStandardMaterial({ color: 0xd9b77a, roughness: 0.9 }));
hat.position.y = 1.5;
const playerLantern = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: C.lanternCore, emissive: C.lanternLit, emissiveIntensity: 2 }));
playerLantern.position.set(0.32, 1.0, 0.1);
const playerLight = new THREE.PointLight(0xffb36b, 1.4, 7, 1.5);
playerLight.position.copy(playerLantern.position);
player.add(body, scarf, hat, playerLantern, playerLight);
scene.add(player);

const pulses = [];
function spawnPulse() {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 48), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(game.player.pos[0], 0.05, game.player.pos[2]);
  scene.add(mesh);
  pulses.push({ mesh, t: 0 });
}

// ---------- màn hình ----------
const OVERLAYS = ['menu', 'board', 'settings', 'pause', 'over', 'intro'];
function show(id) {
  for (const s of OVERLAYS) document.getElementById(s).hidden = s !== id;
}
function applyDisplaySettings() {
  document.documentElement.classList.toggle('large', settings.largeText);
  document.documentElement.classList.toggle('reduced', settings.reducedMotion);
  document.getElementById('help').textContent = helpText();
}
function keyLabel(code) {
  return code.replace(/^Key/, '').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift').replace('ArrowLeft', '←').replace('ArrowRight', '→').replace('Escape', 'Esc');
}
function helpText() {
  const k = settings.keys;
  return `${keyLabel(k.forward)}${keyLabel(k.left)}${keyLabel(k.back)}${keyLabel(k.right)} di chuyển · ←/→ hoặc kéo chuột xoay camera · ${keyLabel(k.jump)} nhảy · ${keyLabel(k.dash)} lướt · ${keyLabel(k.interact)} nạp đèn · ${keyLabel(k.pulse)} tỏa sáng · ${keyLabel(k.pause)} tạm dừng · R chơi lại`;
}

// ---------- trò chơi ----------
function setupScene() {
  buildWorld(game.night);
  buildLanterns(game);
  shadeCore.count = 0;
  shadeEyeL.count = 0;
  shadeEyeR.count = 0;
  moteInst.count = 0;
  for (const v of drifterMeshes.values()) scene.remove(v);
  drifterMeshes.clear();
  for (const v of charmMeshes.values()) scene.remove(v);
  charmMeshes.clear();
  camYawDeg = 0;
  queued = { jump: false, interact: false, pulse: false, dash: false, pause: false };
  acc = 0;
  lastWindWarn = false;
  lastCountdown = -1;
}

// Màn giới thiệu Đêm: sim chưa chạy cho tới khi người chơi bắt đầu.
function startNight(n, newSeed = seed) {
  night = n;
  seed = newSeed;
  game = createGame({ seed, night: n });
  setupScene();
  screen = 'intro';
  document.getElementById('intro-title').textContent = NIGHT_NAMES[n];
  document.getElementById('intro-text').textContent = NIGHT_INTRO[n];
  show('intro');
  syncHud(snapshot(game));
}

function beginNight() {
  unlock();
  screen = 'game';
  show(null);
  showMsg(`${NIGHT_NAMES[night]} · seed ${seed}`, 3000);
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
    case 'mote_picked': sfx('pickup'); showMsg(`Nhặt được đom đóm (${ev.data.carried}/${snapshot(game).player.capacity})`, 1200); break;
    case 'deposit': sfx('deposit'); showMsg(`Nạp ${ev.data.amount} đom đóm vào đèn ${ev.data.lantern_id} (${ev.data.deposited}/${T.lantern_cost})`); break;
    case 'lantern_lit': sfx(ev.data.relight ? 'relit' : 'lit'); showMsg(ev.data.relight ? `Đèn ${ev.data.lantern_id} được thắp lại!` : `Đèn ${ev.data.lantern_id} đã sáng!`, 3000); break;
    case 'refuel': sfx('refuel'); showMsg(`Châm ${ev.data.amount} đom đóm: đèn ${ev.data.lantern_id} còn ${ev.data.fuel.toFixed(1)} dầu`, 2000); break;
    case 'lantern_out': sfx('out'); showMsg(`Đèn ${ev.data.lantern_id} đã tắt vì hết dầu!`, 3000); break;
    case 'pulse': sfx('pulse'); spawnPulse(); showMsg(ev.data.stunned_ids.length ? `Tỏa sáng: choáng ${ev.data.stunned_ids.length} Bóng Mực` : 'Tỏa sáng: không có Bóng Mực trong tầm'); break;
    case 'player_hit':
      if (ev.data.by === 'fall') { sfx('fall'); showMsg(`Mây rơi khỏi đảo! Còn ${ev.data.flames} ngọn lửa`, 2500); }
      else { sfx('hit'); showMsg(`Bóng Mực làm tắt một ngọn lửa! Còn ${ev.data.flames}`, 2500); }
      flash();
      shake = settings.reducedMotion ? 0 : 0.35;
      break;
    case 'shade_spawned': sfx('shade'); showMsg('Một Bóng Mực mới xuất hiện trong sương', 2500); break;
    case 'drifter_steal': sfx('steal'); showMsg(`Gió Lạc cướp ${ev.data.amount} đom đóm!`, 2500); break;
    case 'charm_picked': sfx('charm'); showMsg('Bùa Gió: chạy nhanh hơn và lướt không hồi chiêu', 2500); break;
    case 'dash': sfx('dash'); break;
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
    sfx('win');
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
    sfx('lose');
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

function syncHud(snap) {
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
  // Gợi ý phím E khi đứng gần đèn.
  const prompt = document.getElementById('prompt');
  const near = snap.lanterns.filter((l) => !l.lit || l.fuel < 100).find((l) => Math.hypot(l.pos[0] - snap.player.pos[0], l.pos[2] - snap.player.pos[2]) <= T.interact_radius);
  if (near && screen === 'game') {
    prompt.hidden = false;
    prompt.textContent = near.lit
      ? `${keyLabel(settings.keys.interact)} — Châm dầu (${Math.round(near.fuel)}/100)`
      : `${keyLabel(settings.keys.interact)} — Nạp ánh sáng (${near.deposited}/${near.ever_lit ? T.relight_cost : T.lantern_cost})`;
  } else {
    prompt.hidden = true;
  }
}

// Chỉ báo ngoài màn hình: mũi tên Bóng Mực (xanh) và mũi tên tới đèn chưa sáng gần nhất (vàng).
const arrowLayer = document.getElementById('arrows');
const arrowEls = [];
function arrowAt(i) {
  let el = arrowEls[i];
  if (!el) { el = document.createElement('div'); el.className = 'arrow'; arrowLayer.appendChild(el); arrowEls.push(el); }
  el.style.display = 'block';
  return el;
}
function placeArrow(el, v, color) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const k = Math.min(w / 2 / (Math.abs(v.x) || 1e-6), h / 2 / (Math.abs(v.y) || 1e-6));
  el.style.left = `${Math.max(12, Math.min(w - 32, w / 2 + v.x * k * 0.92 - 10))}px`;
  el.style.top = `${Math.max(120, Math.min(h - 40, h / 2 - v.y * k * 0.92 - 9))}px`;
  el.style.transform = `rotate(${(Math.atan2(-v.y, v.x) * 180) / Math.PI - 90}deg)`;
  el.style.borderBottomColor = color;
}
function syncArrows() {
  let used = 0;
  if (game && screen === 'game' && !BENCH) {
    const project = (x, y, z) => new THREE.Vector3(x, y, z).project(camera);
    for (const s of game.shades) {
      const v = project(s.pos[0], s.pos[1] + 0.6, s.pos[2]);
      if (v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1) continue;
      placeArrow(arrowAt(used++), v, `#${(settings.colorblind ? C.shadeOutlineCB : C.shadeOutline).toString(16).padStart(6, '0')}`);
    }
    // Đèn chưa sáng ngoài màn hình: chỉ đèn gần nhất.
    const unlit = game.lanterns.filter((l) => !l.lit);
    let best = null;
    for (const l of unlit) {
      const d = Math.hypot(l.pos[0] - game.player.pos[0], l.pos[2] - game.player.pos[2]);
      if (!best || d < best.d) best = { d, l };
    }
    if (best) {
      const v = project(best.l.pos[0], best.l.pos[1] + 2.5, best.l.pos[2]);
      if (v.z >= 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) placeArrow(arrowAt(used++), v, '#f2c14e');
    }
  }
  for (let i = used; i < arrowEls.length; i++) arrowEls[i].style.display = 'none';
}

function syncScene(now) {
  const p = game.player;
  player.position.set(p.pos[0], p.pos[1], p.pos[2]);
  player.scale.setScalar(1 + (p.grounded ? 0 : 0.05));
  player.visible = p.respawn === 0;

  // Ánh sáng môi trường tăng theo tiến độ: cường độ = 0.15 + 0.55 × (đèn sáng / tổng đèn).
  let litCount = 0;
  for (const l of game.lanterns) if (l.lit) litCount += 1;
  const litFrac = litCount / game.lanterns.length;
  hemi.intensity = (0.15 + 0.55 * litFrac) * 1.4;
  ambientLevel(litCount, game.lanterns.length);

  game.lanterns.forEach((gl, idx) => {
    const v = lanternViews[idx];
    const l = { lit: gl.lit, fuel: gl.lit ? gl.fuelU / 60 : 0 }; // đọc trực tiếp từ sim
    // Đèn tắt xẹp 20% và có giấy rách (không cần màu để phân biệt); đèn sắp hết dầu (<30) nhấp nháy 1 Hz.
    v.group.scale.y = l.lit ? 1 : 0.8;
    v.torn.visible = !l.lit;
    const low = l.lit && l.fuel < 30;
    const blink = low ? ((now / 500) % 2 < 1 ? 1 : 0.15) : 1;
    v.bulb.material.emissive.setHex(l.lit ? C.lanternLit : 0x000000);
    v.bulb.material.emissiveIntensity = l.lit ? (1.8 + 0.2 * Math.sin(now / 300)) * blink : 0;
    v.bulb.material.color.setHex(l.lit ? C.lanternCore : C.lanternOff);
    v.light.intensity = l.lit ? 6 * blink : 0;
    v.barFill.scale.x = Math.max(0.001, l.fuel / 100);
    v.barFill.position.x = -0.6 * (1 - l.fuel / 100);
    v.barFill.material.color.setHex(l.fuel < 30 ? C.danger : C.lanternLit);
    v.barFill.visible = l.lit;
  });

  // Đom đóm: một InstancedMesh (một lệnh vẽ); đom đóm rơi có màu riêng.
  moteInst.count = game.motes.length;
  game.motes.forEach((q, i) => {
    dummy.position.set(q.pos[0], q.pos[1] + 0.7 + 0.1 * Math.sin(now / 250 + i), q.pos[2]);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    moteInst.setMatrixAt(i, dummy.matrix);
    moteInst.setColorAt(i, q.kind === 'dropped' ? DROPPED_TINT : WHITE);
  });
  moteInst.instanceMatrix.needsUpdate = true;
  if (moteInst.instanceColor) moteInst.instanceColor.needsUpdate = true;

  // Bóng Mực: thân và hai mắt là InstancedMesh; màu theo trạng thái qua instanceColor.
  const n = game.shades.length;
  shadeCore.count = n;
  shadeEyeL.count = n;
  shadeEyeR.count = n;
  const outline = shadeOutline();
  game.shades.forEach((s, i) => {
    const stunned = s.state === 'stunned';
    const draining = s.state === 'drain';
    dummy.position.set(s.pos[0], s.pos[1] + 0.6, s.pos[2]);
    dummy.scale.setScalar(stunned ? 0.9 + 0.1 * Math.sin(now / 80) : 1);
    dummy.updateMatrix();
    shadeCore.setMatrixAt(i, dummy.matrix);
    shadeCore.setColorAt(i, stunned ? CORE_STUNNED : draining ? CORE_DRAIN : CORE_NORMAL);
    dummy.position.set(s.pos[0] - 0.18, s.pos[1] + 0.7, s.pos[2] + 0.45);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    shadeEyeL.setMatrixAt(i, dummy.matrix);
    dummy.position.set(s.pos[0] + 0.18, s.pos[1] + 0.7, s.pos[2] + 0.45);
    dummy.updateMatrix();
    shadeEyeR.setMatrixAt(i, dummy.matrix);
    const eyeColor = stunned ? WHITE : outline;
    shadeEyeL.setColorAt(i, eyeColor);
    shadeEyeR.setColorAt(i, eyeColor);
  });
  for (const m of [shadeCore, shadeEyeL, shadeEyeR]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
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
  // Rung camera khi trúng Bóng Mực (tắt khi giảm chuyển động).
  if (shake > 0 && !settings.reducedMotion) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    shake *= 0.9;
    if (shake < 0.01) shake = 0;
  }
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
  for (const id of ['stats', 'help', 'cool', 'msg', 'wind', 'prompt']) document.getElementById(id).style.display = 'none';
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
    if (elapsed > 3 + benchDuration) bench.done = true;
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
    const snap = snapshot(game);
    syncHud(snap);
    syncScene(now);
    if (screen === 'game') {
      const wn = snap.wind.warning || snap.wind.active;
      if (wn && !lastWindWarn) sfx('wind');
      lastWindWarn = wn;
      const t = Math.ceil(timeLeft(game));
      if (t <= 10 && t > 0 && t !== lastCountdown) { sfx('tick'); lastCountdown = t; }
    }
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
  document.getElementById('opt-volume').value = String(Math.round(settings.volume * 100));
  document.getElementById('opt-sensitivity').value = String(settings.sensitivity);
}

// ---------- nhập liệu ----------
window.addEventListener('keydown', (e) => {
  unlock();
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
  if (e.target && e.target.tagName === 'INPUT' && (e.target.type === 'text')) return; // đang gõ tên
  const k = settings.keys;
  const gameKeys = [k.forward, k.back, k.left, k.right, k.jump, k.dash, k.interact, k.pulse, k.pause, 'ArrowLeft', 'ArrowRight'];
  if (gameKeys.includes(e.code)) e.preventDefault();
  if (screen === 'intro' && (e.code === 'Enter' || e.code === k.jump)) { beginNight(); return; }
  if (e.code === 'Enter' && screen === 'over') {
    if (document.getElementById('entry').hidden) document.getElementById('over-next').click();
    return;
  }
  if (e.code === 'KeyR' && screen !== 'menu' && screen !== 'intro') { startCampaign(Math.floor(Math.random() * 1e9)); return; }
  if (screen !== 'game' || BENCH) return;
  if (e.repeat) return;
  held.add(e.code);
  if (e.code === k.jump) { queued.jump = true; sfx('jump'); }
  if (e.code === k.interact) queued.interact = true;
  if (e.code === k.pulse) queued.pulse = true;
  if (e.code === k.dash) queued.dash = true;
  if (e.code === k.pause) queued.pause = true;
});
window.addEventListener('keyup', (e) => held.delete(e.code));
window.addEventListener('blur', () => held.clear());

// Kéo chuột xoay camera; độ nhạy theo cài đặt.
window.addEventListener('pointerdown', (e) => { unlock(); if (screen === 'game' && e.button === 0) dragging = true; });
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointermove', (e) => {
  if (dragging && screen === 'game') camYawDeg += e.movementX * 0.25 * settings.sensitivity;
});

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
on('intro-start', beginNight);
on('intro-menu', () => { screen = 'menu'; show('menu'); });
document.getElementById('opt-reduced').addEventListener('change', (e) => { settings.reducedMotion = e.target.checked; saveSettings(); applyDisplaySettings(); });
document.getElementById('opt-large').addEventListener('change', (e) => { settings.largeText = e.target.checked; saveSettings(); applyDisplaySettings(); });
document.getElementById('opt-colorblind').addEventListener('change', (e) => { settings.colorblind = e.target.checked; saveSettings(); });
document.getElementById('opt-volume').addEventListener('input', (e) => { settings.volume = Number(e.target.value) / 100; setVolume(settings.volume); saveSettings(); });
document.getElementById('opt-sensitivity').addEventListener('input', (e) => { settings.sensitivity = Number(e.target.value); saveSettings(); });

// Cờ kiểm thử E2E (?test): cho phép kết thúc Đêm bằng lệnh để kiểm tra luồng nhập tên.
if (TEST) {
  window.__ddl = {
    forceEnd: (result, reason) => onGameOver({ result, reason }),
    state: () => ({ screen, night, campaignScore, nightsWon, lanterns: game ? snapshot(game).lanterns.length : 0 }),
  };
}

applyDisplaySettings();
if (BENCH) {
  startBench();
} else {
  show('menu');
}
requestAnimationFrame(frame);
