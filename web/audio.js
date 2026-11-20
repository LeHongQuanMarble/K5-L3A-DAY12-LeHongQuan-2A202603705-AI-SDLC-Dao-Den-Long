// Âm thanh tổng hợp bằng Web Audio (không có file âm thanh, nên không có asset cần ghi nguồn).
// Nhạc nền đêm là hai dao động trầm có LFO chậm; hiệu ứng là các tiếng ngắn theo sự kiện của sim.
let ctx = null;
let master = null;
let ambient = null;
let volume = 0.5;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

// Gọi khi người chơi tương tác lần đầu (trình duyệt chặn âm thanh trước đó).
export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
  if (c && !ambient) startAmbient();
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = volume;
}

function tone(freq, dur, type = 'sine', gain = 0.2, when = 0, slideTo = null) {
  const c = ensure();
  if (!c || volume === 0) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, gain = 0.15, when = 0, lp = 1800) {
  const c = ensure();
  if (!c || volume === 0) return;
  const t = c.currentTime + when;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lp;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

// Tên sự kiện khớp với sim: mote_picked, deposit, lantern_lit, refuel, pulse, player_hit, dash, ...
export function sfx(name) {
  switch (name) {
    case 'pickup': tone(880, 0.08, 'triangle', 0.12); break;
    case 'deposit': tone(660, 0.1, 'triangle', 0.14); break;
    case 'lit': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'sine', 0.16, i * 0.09)); break;
    case 'relit': [659, 784, 988].forEach((f, i) => tone(f, 0.3, 'sine', 0.14, i * 0.08)); break;
    case 'refuel': tone(520, 0.12, 'triangle', 0.12, 0, 780); break;
    case 'out': tone(330, 0.6, 'sawtooth', 0.08, 0, 110); break;
    case 'pulse': noise(0.35, 0.22, 0, 2600); tone(400, 0.3, 'sine', 0.1, 0, 1200); break;
    case 'hit': tone(120, 0.35, 'sine', 0.3, 0, 45); noise(0.2, 0.2, 0, 500); break;
    case 'fall': tone(260, 0.9, 'triangle', 0.22, 0, 60); break;
    case 'jump': tone(300, 0.15, 'sine', 0.12, 0, 600); break;
    case 'dash': noise(0.22, 0.22, 0, 4000); break;
    case 'shade': tone(90, 0.6, 'sine', 0.12); break;
    case 'steal': tone(700, 0.2, 'square', 0.08, 0, 300); break;
    case 'charm': [784, 988, 1175].forEach((f, i) => tone(f, 0.2, 'triangle', 0.12, i * 0.05)); break;
    case 'tick': tone(1400, 0.05, 'square', 0.05); break;
    case 'wind': noise(1.2, 0.12, 0, 900); break;
    case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.6, 'sine', 0.14, i * 0.12)); break;
    case 'lose': [392, 330, 262].forEach((f, i) => tone(f, 0.6, 'triangle', 0.14, i * 0.25)); break;
    default: break;
  }
}

// Nhạc nền đêm: hai dao động trầm lệch nhau, LFO chậm làm âm lượng thở.
function startAmbient() {
  const c = ctx;
  if (!c) return;
  const g = c.createGain();
  g.gain.value = 0.05;
  g.connect(master);
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.03;
  lfo.connect(lfoGain).connect(g.gain);
  lfo.start();
  for (const f of [55, 82.4]) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    o.start();
  }
  ambient = g;
}

export function ambientLevel(lit, total) {
  // Nhạc nền nhỏ dần khi ít đèn sáng, cùng với ánh sáng môi trường của cảnh.
  if (ambient) ambient.gain.value = 0.02 + 0.06 * (total ? lit / total : 0);
}
