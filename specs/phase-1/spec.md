# Spec Phase 1: Đảo Đèn Lồng, Đêm 1 (PRD-0)

Nguồn: lab board, PRD-0 + Test Contract v1.0. Mọi con số nằm trong `src/tuning.js` và `game.contract.json`.

## Tiêu chí nghiệm thu (AC)

| ID | Yêu cầu | Cách kiểm chứng |
|---|---|---|
| AC-1 | Mây di chuyển trên XZ theo `move`, có chuẩn hóa vector dài > 1, xoay theo `cam_yaw_deg` | tests/sim.test.js: movement, diagonal, camera yaw |
| AC-2 | Nhảy, trọng lực, đứng trên đất Y=0 | tests/sim.test.js: jump |
| AC-3 | Nhặt đom đóm trong `pickup_radius`, tối đa `carry_capacity` | tests/sim.test.js: pickup |
| AC-4 | Tương tác gần đèn (`interact_radius`) để nạp `lantern_cost` đom đóm; đủ thì đèn sáng, +điểm | tests/sim.test.js: deposit, win |
| AC-5 | Tỏa sáng (`pulse`) tốn `pulse_cost`, làm choáng Bóng Mực trong `pulse_radius`, đẩy lùi `pulse_push_m`, có hồi chiêu | tests/sim.test.js: pulse |
| AC-6 | Bóng Mực đuổi Mây, trúng Mây (trong `shade_hit_radius`) mất 1 flames và rơi `hit_drop_ratio` đom đóm, có bất tử `invuln_s` | tests/sim.test.js: hit, no_flames |
| AC-7 | Bóng Mực không vào vùng `safe_radius` quanh đèn đã sáng | tests/sim.test.js: safe radius |
| AC-8 | Thắng khi 5 đèn sáng; thua khi hết flames hoặc hết `night1_duration_s` (bình minh) | tests/sim.test.js: win, dawn |
| AC-9 | Headless: `--seed --night 1 [--scenario] [--inputs] --ticks --out [--snapshot-every]`, 60 tick/s, JSONL đúng Contract | tests/headless.test.js |
| AC-10 | Lỗi input/scenario sai → exit code 2 | tests/headless.test.js |
| AC-11 | Cùng seed + scenario + inputs → output giống hệt | tests/headless.test.js, docs/proof/phase-1 |
| AC-12 | Chạy được trên trình duyệt (three.js) với HUD, thắng/thua, chơi lại | Chạy `npm start`, kiểm tra thủ công + ảnh chụp |

## Giả định (chi tiết ở docs/notes/assumptions.md)

- Điểm: đom đóm nạp vào đèn được tính `per_mote` mỗi đơn vị; đèn sáng `per_lantern`; choáng Bóng Mực mới `per_stun`; thắng cộng `per_second_left` × giây còn lại và `per_flame_left` × flames còn lại.
- `flames` là HP. Bình minh = thua.
- `fall_enabled = false`: Mây bị giới hạn trong đảo, không rơi.
- `random_shades: false` cũng tắt việc Bóng Mực xuất hiện thêm theo thời gian.
