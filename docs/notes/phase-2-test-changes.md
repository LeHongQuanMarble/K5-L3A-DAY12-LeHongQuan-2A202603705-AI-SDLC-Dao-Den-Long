# Thay đổi test Phase 1 khi áp dụng Ticket-02 (Contract v1.1)

Quy tắc AGENTS.md mục 2: khi test cũ mâu thuẫn với yêu cầu mới, sửa test và ghi lý do ở đây. Không test nào bị xóa hay skip. Bốn file test đã được sửa: `tests/sim.test.js`, `tests/headless.test.js`, `tests/contract.test.js`. Test mới nằm ở `tests/phase2.test.js`.

| Test cũ | Thay đổi | Lý do |
|---|---|---|
| move [0,1] / diagonal / camera yaw | Kỳ vọng "đúng 6 m sau 1 s" → khoảng [5.6, 6] | Ticket-02: tăng tốc trong 0.1 s, mất khoảng 0.3 m |
| player stays on the island (clamp) | Đổi thành "bước qua mép đảo thì rơi" | Ticket-02: ngoài bán kính đảo là biển mây, không còn kẹp |
| jump leaves the ground | `onGround` → `grounded` | Đổi tên trường trong snapshot v1.1 |
| interact deposits / edge-triggered / far | Dùng `lantern_cost` 10; đọc sự kiện bỏ `night_start` | Số liệu mới; `night_start` là sự kiện mới của v1.1 |
| lighting all 5 lanterns (bonus) | Điểm thưởng: 2 điểm mỗi giây + 50 mỗi Ngọn Lửa | Ticket-02 thay công thức điểm |
| time running out → dawn | Bỏ `night_start` khi đếm sự kiện | Như trên |
| pulse costs / stuns / push | Chi phí 3; đẩy 4 m trong 15 tick (đo sau 15 tick) | Ticket-02: tỏa sáng và đẩy lùi mới |
| stunned shade wakes | Choáng 120 tick (tick 119 còn choáng, tick 120 hết) | Ticket-02: choáng 120 tick |
| pulse respects cooldown | Chi phí 3; cooldown 3 s | Ticket-02 |
| shade touching the player | Thêm `lost: 0` vào dữ liệu `player_hit` | Trường `lost` mới của v1.1 |
| headless: standing still until dawn | 180 s → 300 s (`ticks` 18000) | Ticket-02: Đêm 1 dài 300 s |
| headless: `--night` khác 1 bị từ chối | Từ chối `--night 4` (1–3 hợp lệ) | Ticket-02 thêm Đêm 2 và 3 |
| contract: version 1.0 | Đổi thành 1.1 | Ticket-02 yêu cầu contract v1.1 |

Không có assertion nào bị bỏ đi mà không thay bằng kiểm tra tương đương.
