// Hiển thị three.js và nhập liệu. Toàn bộ luật chơi nằm trong src/sim.js (dùng chung với headless).
import * as THREE from 'three';
import { createGame, step, snapshot, applyInputFrame, timeLeft, DT } from '../src/sim.js';
import { TUNING as T } from '../src/tuning.js';

const BG = 0x07061a;
const ISLAND_Y = 0;
const TURN_DEG_PER_S = 120;
const CAM_DIST = 7.5;
const CAM_HEIGHT = 3.2;

const REASON_TEXT = {
  all_lit: 'Cả 5 Đèn Lồng Lớn đã sáng. Đêm 1 được cứu rồi!',
  dawn: 'Trời sáng trước khi đèn sáng hết. Bóng Mực rút lui.',
  no_flames: 'Ngọn lửa của Mây đã tắt.',
};

// ---------- trạng thái ----------
const params = new URLSearchParams(location.search);
let seed = Number.isInteger(Number(params.get('seed'))) && params.get('seed') !== null
  ? Number(params.get('seed'))
  : Math.floor(Math.random() * 1e9);
let game;
let camYawDeg = 0;
const held = new Set();
let queued = { jump: false, interact: false, pulse: false };
let acc = 0;
let last = performance.now();
let msgTimer = 0;

// ---------- three.js ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 22, 60);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

scene.add(new THREE.HemisphereLight(0x5a5a9a, 0x1a1024, 0.7));
const moon = new THREE.DirectionalLight(0x9db2ff, 0.5);
moon.position.set(-8, 14, 6);
scene.add(moon);

// Đảo tròn và biển đêm
const island = new THREE.Mesh(
  new THREE.CircleGeometry(T.island_radius, 72),
  new THREE.MeshStandardMaterial({ color: 0x2c4234, roughness: 1 }),
);
island.rotation.x = -Math.PI / 2;
scene.add(island);
const rim = new THREE.Mesh(
  new THREE.CylinderGeometry(T.island_radius, T.island_radius * 0.75, 1.6, 72),
  new THREE.MeshStandardMaterial({ color: 0x3b2c24, roughness: 1 }),
);
rim.position.y = -0.8;
scene.add(rim);
const sea = new THREE.Mesh(
  new THREE.CircleGeometry(160, 48),
  new THREE.MeshStandardMaterial({ color: 0x0b1433, roughness: 0.4, metalness: 0.1 }),
);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -1.7;
scene.add(sea);

// Đèn lồng lớn
const lanternViews = [];
for (const l of game0().lanterns) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x4a3a2e }),
  );
  post.position.y = 1.1;
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1a, emissive: 0x000000 }),
  );
  bulb.position.y = 2.5;
  const light = new THREE.PointLight(0xffa64d, 0, 11, 1.6);
  light.position.y = 2.5;
  group.add(post, bulb, light);
  group.position.set(l.pos[0], ISLAND_Y, l.pos[2]);
  scene.add(group);
  lanternViews.push({ id: l.id, bulb, light, lit: false });
}

// Đom đóm
const moteGeo = new THREE.SphereGeometry(0.12, 10, 8);
const moteMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffe066, emissiveIntensity: 1.6 });
const moteMeshes = [];

// Mây (người giữ đèn)
const player = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.28, 0.6, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0xf1e2c6, roughness: 0.8 }),
);
body.position.y = 0.85;
const hat = new THREE.Mesh(
  new THREE.ConeGeometry(0.55, 0.28, 18),
  new THREE.MeshStandardMaterial({ color: 0xd9b77a, roughness: 0.9 }),
);
hat.position.y = 1.5;
const playerLantern = new THREE.Mesh(
  new THREE.SphereGeometry(0.13, 12, 10),
  new THREE.MeshStandardMaterial({ color: 0xffcf70, emissive: 0xffa640, emissiveIntensity: 2 }),
);
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
    new THREE.MeshStandardMaterial({ color: 0x120a22, roughness: 0.6, emissive: 0x2a0d4a, emissiveIntensity: 0.6 }),
  );
  core.position.y = 0.6;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5ad8 });
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
function game0() {
  return createGame({ seed: 0 });
}

function startGame(newSeed) {
  seed = newSeed;
  game = createGame({ seed });
  camYawDeg = 0;
  queued = { jump: false, interact: false, pulse: false };
  acc = 0;
  for (const v of shadeViews.values()) scene.remove(v.group);
  shadeViews.clear();
  document.getElementById('over').hidden = true;
  showMsg(`Đêm 1 · đảo Bến · seed ${seed}`);
  syncHud();
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
    case 'player_hit': flash(); showMsg(`Bóng Mực làm tắt một ngọn lửa! Còn ${ev.data.flames}, rơi ${ev.data.dropped} đom đóm`, 2500); break;
    case 'shade_spawned': showMsg('Một Bóng Mực mới xuất hiện trong sương', 2500); break;
    default: break;
  }
  if (ev.name === 'game_over') showOver(ev.data);
}

function flash() {
  const f = document.getElementById('flash');
  f.style.opacity = '1';
  setTimeout(() => { f.style.opacity = '0'; }, 120);
}

function showOver({ result, reason }) {
  document.getElementById('over-title').textContent = result === 'won' ? 'Đèn đã sáng!' : 'Đêm đã thua';
  document.getElementById('over-text').textContent = REASON_TEXT[reason] ?? '';
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
    dash: false,
  });
  queued = { jump: false, interact: false, pulse: false };
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
  document.getElementById('carried').textContent = snap.player.carried;
  document.getElementById('lit').textContent = snap.lanterns.filter((l) => l.lit).length;
  document.getElementById('hp').textContent = snap.player.flames;
  document.getElementById('time').textContent = fmtTime(timeLeft(game));
  document.getElementById('score').textContent = snap.score;
}

function syncScene(now) {
  const p = game.player;
  player.position.set(p.pos[0], p.pos[1], p.pos[2]);
  body.rotation.z = 0;
  const hop = p.onGround ? 0 : 0.05;
  player.scale.setScalar(1 + hop);

  for (const v of lanternViews) {
    const l = game.lanterns.find((x) => x.id === v.id);
    if (l.lit && !v.lit) v.lit = true;
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
      m.position.set(q[0], 0.7 + 0.1 * Math.sin(now / 250 + i), q[2]);
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
    v.group.position.set(s.pos[0], 0, s.pos[2]);
    const stunned = s.state === 'stunned';
    v.core.material.emissive.setHex(stunned ? 0x66c7ff : 0x2a0d4a);
    v.core.material.emissiveIntensity = stunned ? 1.2 : 0.6;
    v.core.scale.setScalar(stunned ? 0.9 + 0.1 * Math.sin(now / 80) : 1);
    v.eyeMat.color.setHex(stunned ? 0xffffff : 0xff5ad8);
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
  const want = new THREE.Vector3(
    target.x - Math.sin(yaw) * CAM_DIST,
    target.y + CAM_HEIGHT,
    target.z - Math.cos(yaw) * CAM_DIST,
  );
  camera.position.lerp(want, 0.2);
  camera.lookAt(target);
}

// ---------- vòng lặp ----------
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
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
const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyF', 'KeyR']);
window.addEventListener('keydown', (e) => {
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (e.code === 'KeyR') { startGame(Math.floor(Math.random() * 1e9)); return; }
  if (e.repeat) return;
  held.add(e.code);
  if (e.code === 'Space') queued.jump = true;
  if (e.code === 'KeyE') queued.interact = true;
  if (e.code === 'KeyF') queued.pulse = true;
});
window.addEventListener('keyup', (e) => held.delete(e.code));
window.addEventListener('blur', () => held.clear());
document.getElementById('replay').addEventListener('click', () => startGame(Math.floor(Math.random() * 1e9)));
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

startGame(seed);
requestAnimationFrame(frame);
