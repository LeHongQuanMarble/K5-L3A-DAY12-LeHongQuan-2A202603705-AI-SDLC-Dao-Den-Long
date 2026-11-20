// Bảng xếp hạng cục bộ (Ticket-04 mục 3). Thuần logic: không đọc/ghi đĩa ở đây.
// Quy tắc: tên 3–12 ký tự [A-Za-z0-9_]; giữ top 10; điểm giảm dần; bằng điểm thì ai đạt trước đứng trên.

export const MAX_ENTRIES = 10;
const NAME_RE = /^[A-Za-z0-9_]{3,12}$/;
const ISO_TZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function validateName(name) {
  return typeof name === 'string' && NAME_RE.test(name);
}

export function validateEntry(e) {
  if (!e || typeof e !== 'object') return 'entry must be an object';
  if (!validateName(e.name)) return 'name must be 3-12 characters of A-Z, a-z, 0-9 or _';
  if (!Number.isInteger(e.score) || e.score < 0) return 'score must be a non-negative integer';
  if (!Number.isInteger(e.nights_won) || e.nights_won < 0 || e.nights_won > 3) return 'nights_won must be 0-3';
  if (typeof e.achieved_at !== 'string' || !ISO_TZ_RE.test(e.achieved_at) || Number.isNaN(Date.parse(e.achieved_at))) {
    return 'achieved_at must be an ISO 8601 timestamp with a timezone';
  }
  if (!Number.isInteger(e.seed)) return 'seed must be an integer';
  return null;
}

// Thứ tự: điểm cao hơn trước; bằng điểm thì thời điểm sớm hơn trước.
export function compareEntries(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return Date.parse(a.achieved_at) - Date.parse(b.achieved_at);
}

// Trả về danh sách mới (không đổi đầu vào), đã sắp xếp và cắt còn MAX_ENTRIES.
export function addEntry(entries, entry) {
  const err = validateEntry(entry);
  if (err) throw new RangeError(err);
  return [...entries, { ...entry }].sort(compareEntries).slice(0, MAX_ENTRIES);
}

// Đọc chuỗi JSON đã lưu; dữ liệu hỏng thì trả về danh sách rỗng (không làm hỏng game).
export function parseStore(text) {
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data?.entries) ? data.entries : [];
    return list.filter((e) => validateEntry(e) === null).sort(compareEntries).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function serialize(entries) {
  return JSON.stringify({ entries: [...entries].sort(compareEntries).slice(0, MAX_ENTRIES) }, null, 2) + '\n';
}
