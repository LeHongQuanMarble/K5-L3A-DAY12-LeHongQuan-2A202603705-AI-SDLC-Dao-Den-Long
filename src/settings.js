// Cài đặt người chơi (Ticket-04 mục 4). Thuần logic: web đọc/ghi localStorage và gọi các hàm này.
export const ACTIONS = [
  { id: 'forward', label: 'Tiến' },
  { id: 'back', label: 'Lùi' },
  { id: 'left', label: 'Sang trái' },
  { id: 'right', label: 'Sang phải' },
  { id: 'jump', label: 'Nhảy' },
  { id: 'dash', label: 'Lướt' },
  { id: 'interact', label: 'Nạp đèn / châm dầu' },
  { id: 'pulse', label: 'Tỏa sáng' },
  { id: 'pause', label: 'Tạm dừng' },
];

export const DEFAULT_KEYS = Object.freeze({
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD',
  jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyF', pause: 'Escape',
});

export const DEFAULT_SETTINGS = Object.freeze({
  keys: { ...DEFAULT_KEYS },
  reducedMotion: false,
  largeText: false,
  colorblind: false,
  volume: 0.5,        // 0..1
  sensitivity: 1,     // độ nhạy chuột kéo camera: 0.2..3
});

// Trả về tên hành động đang dùng phím `code` (trừ `except`), hoặc null nếu trống.
export function conflictOf(keys, code, except = null) {
  for (const [action, k] of Object.entries(keys)) {
    if (action !== except && k === code) return action;
  }
  return null;
}

// Gán phím cho hành động; trả về { ok, keys, error }. Không gán khi trùng phím.
export function assignKey(keys, action, code) {
  if (!ACTIONS.some((a) => a.id === action)) return { ok: false, keys, error: `hành động không tồn tại: ${action}` };
  if (typeof code !== 'string' || code === '') return { ok: false, keys, error: 'phím không hợp lệ' };
  const other = conflictOf(keys, code, action);
  if (other) {
    const label = ACTIONS.find((a) => a.id === other).label;
    return { ok: false, keys, error: `phím này đang dùng cho "${label}"` };
  }
  return { ok: true, keys: { ...keys, [action]: code }, error: null };
}

// Đọc cài đặt đã lưu; dữ liệu hỏng hoặc thiếu trường thì dùng mặc định cho phần đó.
export function parseSettings(text) {
  let data;
  try { data = JSON.parse(text); } catch { return structuredClone(DEFAULT_SETTINGS); }
  const out = structuredClone(DEFAULT_SETTINGS);
  if (data && typeof data === 'object') {
    if (data.keys && typeof data.keys === 'object') {
      const keys = { ...DEFAULT_KEYS };
      for (const a of ACTIONS) {
        if (typeof data.keys[a.id] === 'string') keys[a.id] = data.keys[a.id];
      }
      // Trùng phím trong dữ liệu đã lưu: quay về mặc định để tránh điều khiển bị lẫn.
      const codes = Object.values(keys);
      out.keys = new Set(codes).size === codes.length ? keys : { ...DEFAULT_KEYS };
    }
    for (const k of ['reducedMotion', 'largeText', 'colorblind']) {
      if (typeof data[k] === 'boolean') out[k] = data[k];
    }
    if (typeof data.volume === 'number' && data.volume >= 0 && data.volume <= 1) out.volume = data.volume;
    if (typeof data.sensitivity === 'number' && data.sensitivity >= 0.2 && data.sensitivity <= 3) out.sensitivity = data.sensitivity;
  }
  return out;
}

export function serializeSettings(s) {
  return JSON.stringify(s);
}
