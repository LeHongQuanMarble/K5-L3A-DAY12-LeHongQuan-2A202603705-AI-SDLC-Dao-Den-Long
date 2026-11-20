// Hiển thị three.js và nhập liệu. Toàn bộ luật chơi nằm trong src/sim.js (dùng chung với headless).
import * as THREE from 'three';
import { createGame, step, snapshot, applyInputFrame, timeLeft, DT } from '../src/sim.js';
import { TUNING as T } from '../src/tuning.js';
import { worldOf } from '../src/world.js';

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

// ---------- trạng thái ----------
const params = new URLSearchParams(location.search);
const seedParam = Number(params.get('seed'));
let seed = params.get('seed') !== null && Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 1e9);
let night = 1;
let campaignScore = 0; // tổng điểm các Đêm đã thắng
let game;
let camYawDeg = 0;
const held = new Set();
let queued = { jump: false, interact: false, pulse: false, dash: false, pause: false };
let acc = 0;
let last = performance.now();
let msgTimer = 0;
let worldGroup = null;

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
const sea = new THREE.Mesh(
  new THREE.CircleGeometry(200, 48),
  new THREE.MeshStandardMaterial({ color: 0x12384a, roughness: 0.4, metalness: 0.1 }),
);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -1.7;
scene.add(sea);

// Mặt đất theo bản đồ của Đêm hiện tại (đĩa, hình chữ nhật, vành khăn, dốc).
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

// Đèn lồng lớn
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
    group.add(post, bulb, light);
    group.position.set(l.pos[0], l.pos[1], l.pos[2]);
    scene.add(group);
    return { id: l.id, bulb, light, group };
  });
}

// Đom đóm, Gió Lạc, bùa
const moteGeo = new THREE.SphereGeometry(0.12, 10, 8);
const moteMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffe066, emissiveIntensity: 1.6 });
const droppedMat = new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffb347, emissiveIntensity: 1.2 });
const moteMeshes = [];
const drifterMat = new THREE.MeshStandardMaterial({ color: 0x8fa3b8, roughness: 0.6, transparent: true, opacity: 0.85 });
const drifterMeshes = new Map();
const charmMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, emissive: 0x3a0008 });
const charmMeshes = new Map();

// Mây (người giữ đèn)
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

// Bóng Mực
const shadeViews = new Map();
function makeShadeView() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0x120a1a, roughness: 0.6, emissive: 0x2a0d4a, emissiveIntensity: 0.6 }),
  );
  core.position.y = 0.6;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00b3ff });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.18, 0.7, 0.45);
  eyeR.position.set(0.18, 0.7, 0.45);
  g.add(core, eyeL, eyeR);
  scene.add(g);
  return { group: g, core, eyeMat };
}

// Vòng sáng khi tỏa sáng
const pulses = [];
function spawnPulse() {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.0, 48),
    new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(game.player.pos[0], 0.05, game.player.pos[2]);
  scene.add(mesh);
  pulses.push({ mesh, t: 0 });
}

// ---------- trò chơi ----------
function startNight(n, newSeed = seed) {
  night = n;
  seed = newSeed;
  game = createGame({ seed, night: n });
  buildWorld(n);
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
  document.getElementById('over').hidden = true;
  document.getElementById('pause').hidden = true;
  showMsg(`${NIGHT_NAMES[n]} · seed ${seed}`, 3000);
  syncHud();
}

function startCampaign(newSeed = seed) {
  campaignScore = 0;
  startNight(1, newSeed);
}

function showMsg(text, ms = 2200) {
  document.getElementById('msg').textContent = text;
  msgTimer = ms;
}

function onEvent(ev) {
  switch (ev.name) {
    case 'mote_picked': showMsg(`Nhặt được đom đóm (${ev.data.carried}/${T.carry_capacity})`, 1200); break;
    case 'deposit': showMsg(`Nạp ${ev.data.amount} đom đóm vào đèn ${ev.data.lantern_id} (${ev.data.deposited}/${T.lantern_cost})`); break;
    case 'lantern_lit': showMsg(`Đèn ${ev.data.lantern_id} đã sáng!`, 3000); break;
    case 'pulse': spawnPulse(); showMsg(ev.data.stunned_ids.length ? `Tỏa sáng: choáng ${ev.data.stunned_ids.length} Bóng Mực` : 'Tỏa sáng: không có Bóng Mực trong tầm'); break;
    case 'player_hit': flash(); showMsg(ev.data.by === 'fall' ? `Mây rơi khỏi đảo! Còn ${ev.data.flames} ngọn lửa` : `Bóng Mực làm tắt một ngọn lửa! Còn ${ev.data.flames}`, 2500); break;
    case 'shade_spawned': showMsg('Một Bóng Mực mới xuất hiện trong sương', 2500); break;
    case 'drifter_steal': showMsg(`Gió Lạc cướp ${ev.data.amount} đom đóm!`, 2500); break;
    case 'charm_picked': showMsg('Bùa Gió: chạy nhanh hơn và lướt không hồi chiêu', 2500); break;
    case 'dash': break;
    case 'paused': showPause(true); break;
    case 'resumed': showPause(false); break;
    case 'night_start': break;
    default: break;
  }
  if (ev.name === 'game_over') onGameOver(ev.data);
}

function flash() {
  const f = document.getElementById('flash');
  f.style.opacity = '1';
  setTimeout(() => { f.style.opacity = '0'; }, 120);
}

function showPause(on) {
  document.getElementById('pause').hidden = !on;
}

function onGameOver({ result, reason }) {
  const title = document.getElementById('over-title');
  const text = document.getElementById('over-text');
  const btn = document.getElementById('replay');
  const snap = snapshot(game);
  if (result === 'won') {
    campaignScore += snap.score;
    if (night < 3) {
      title.textContent = `${NIGHT_NAMES[night]}: đèn vẫn sáng!`;
      text.textContent = `Điểm đêm này ${snap.score}. Tổng điểm ${campaignScore}. Nhấn Enter hoặc nút bên dưới để sang đêm kế tiếp.`;
      btn.textContent = 'Sang đêm kế tiếp (Enter)';
      btn.onclick = () => startNight(night + 1, seed);
    } else {
      title.textContent = 'Bình Minh';
      text.textContent = `Đảo vẫn sáng khi trời hửng. Tổng điểm: ${campaignScore}.`;
      btn.textContent = 'Chơi lại từ Đêm 1 (R)';
      btn.onclick = () => startCampaign(Math.floor(Math.random() * 1e9));
    }
  } else {
    title.textContent = `${NIGHT_NAMES[night]}: đã thua`;
    text.textContent = REASON_TEXT[reason] ?? '';
    btn.textContent = 'Chơi lại đêm này (R)';
    btn.onclick = () => startNight(night, Math.floor(Math.random() * 1e9));
  }
  document.getElementById('over').hidden = false;
}

// Mỗi bước mô phỏng (1/60 s) đọc phím đang giữ và các lần nhấn đã xếp hàng.
function simStep() {
  const move = [0, 0];
  if (held.has('KeyW')) move[1] += 1;
  if (held.has('KeyS')) move[1] -= 1;
  if (held.has('KeyD')) move[0] += 1;
  if (held.has('KeyA')) move[0] -= 1;
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

// ---------- đồng bộ hiển thị ----------
function fmtTime(s) {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function syncHud() {
  const snap = snapshot(game);
  const lit = snap.lanterns.filter((l) => l.lit).length;
  document.getElementById('night').textContent = night;
  document.getElementById('carried').textContent = snap.player.carried;
  document.getElementById('capacity').textContent = T.carry_capacity;
  document.getElementById('lit').textContent = lit;
  document.getElementById('lantern-total').textContent = snap.lanterns.length;
  document.getElementById('hp').textContent = snap.player.flames;
  document.getElementById('time').textContent = fmtTime(timeLeft(game));
  document.getElementById('score').textContent = snap.score;
  document.getElementById('total').textContent = campaignScore + snap.score;
  const wind = document.getElementById('wind');
  wind.textContent = snap.wind.active ? 'Gió mạnh!' : snap.wind.warning ? 'Gió sắp tới' : '';
  document.getElementById('dash-cd').textContent = snap.player.dash_cd_s > 0 ? snap.player.dash_cd_s.toFixed(1) : 'sẵn sàng';
  document.getElementById('pulse-cd').textContent = snap.player.pulse_cd_s > 0 ? snap.player.pulse_cd_s.toFixed(1) : 'sẵn sàng';
}

function syncScene(now) {
  const p = game.player;
  player.position.set(p.pos[0], p.pos[1], p.pos[2]);
  player.scale.setScalar(1 + (p.grounded ? 0 : 0.05));
  player.visible = p.respawn === 0;

  for (const v of lanternViews) {
    const l = game.lanterns.find((x) => x.id === v.id);
    v.bulb.material.emissive.setHex(l.lit ? 0xffa640 : 0x000000);
    v.bulb.material.emissiveIntensity = l.lit ? 1.8 + 0.2 * Math.sin(now / 300) : 0;
    v.bulb.material.color.setHex(l.lit ? 0xffd38a : 0x3a2a1a);
    v.light.intensity = l.lit ? 6 : 0;
  }

  // đom đóm: tái sử dụng mesh
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

  // Bóng Mực
  const alive = new Set(game.shades.map((s) => s.id));
  for (const [id, v] of shadeViews) {
    if (!alive.has(id)) { scene.remove(v.group); shadeViews.delete(id); }
  }
  for (const s of game.shades) {
    if (!shadeViews.has(s.id)) shadeViews.set(s.id, makeShadeView());
    const v = shadeViews.get(s.id);
    v.group.position.set(s.pos[0], s.pos[1], s.pos[2]);
    const stunned = s.state === 'stunned';
    v.core.material.emissive.setHex(stunned ? 0x66c7ff : 0x2a0d4a);
    v.core.material.emissiveIntensity = stunned ? 1.2 : 0.6;
    v.core.scale.setScalar(stunned ? 0.9 + 0.1 * Math.sin(now / 80) : 1);
    v.eyeMat.color.setHex(stunned ? 0xffffff : 0x00b3ff);
  }

  // Gió Lạc
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

  // Bùa Gió
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

  // vòng sáng
  for (let i = pulses.length - 1; i >= 0; i--) {
    const pu = pulses[i];
    pu.t += 1 / 60;
    const k = pu.t / 0.6;
    pu.mesh.scale.setScalar(1 + k * T.pulse_radius);
    pu.mesh.material.opacity = Math.max(0, 0.9 * (1 - k));
    if (k >= 1) { scene.remove(pu.mesh); pulses.splice(i, 1); }
  }

  // camera theo sau Mây, theo hướng camYaw
  const yaw = (camYawDeg * Math.PI) / 180;
  const target = new THREE.Vector3(p.pos[0], p.pos[1] + 1.4, p.pos[2]);
  const want = new THREE.Vector3(target.x - Math.sin(yaw) * CAM_DIST, target.y + CAM_HEIGHT, target.z - Math.cos(yaw) * CAM_DIST);
  camera.position.lerp(want, 0.2);
  camera.lookAt(target);
}

// ---------- vòng lặp ----------
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // Khi tạm dừng, sim vẫn được gọi để đọc phím Esc/P; logic đứng yên bên trong sim.
  if (game.state === 'playing') {
    acc += dt;
    while (acc >= DT && game.state === 'playing') {
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
  syncHud();
  syncScene(now);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ---------- nhập liệu ----------
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyF', 'KeyR', 'ShiftLeft', 'ShiftRight', 'Escape', 'KeyP']);
window.addEventListener('keydown', (e) => {
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (e.code === 'KeyR') { startCampaign(Math.floor(Math.random() * 1e9)); return; }
  if (e.code === 'Enter' && !document.getElementById('over').hidden) {
    const btn = document.getElementById('replay');
    if (btn.onclick) btn.onclick();
    return;
  }
  if (e.repeat) return;
  held.add(e.code);
  if (e.code === 'Space') queued.jump = true;
  if (e.code === 'KeyE') queued.interact = true;
  if (e.code === 'KeyF') queued.pulse = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') queued.dash = true;
  if (e.code === 'Escape' || e.code === 'KeyP') queued.pause = true;
});
window.addEventListener('keyup', (e) => held.delete(e.code));
window.addEventListener('blur', () => held.clear());
document.getElementById('replay').onclick = () => startCampaign(Math.floor(Math.random() * 1e9)); // onGameOver sẽ thay hành động này
document.getElementById('resume').addEventListener('click', () => { queued.pause = true; });
document.getElementById('restart-night').addEventListener('click', () => startNight(night, Math.floor(Math.random() * 1e9)));
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

startCampaign(seed);
requestAnimationFrame(frame);
