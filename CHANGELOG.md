# Changelog

## Phase 2 (Ticket-02, Contract v1.1)

### Thay đổi phá vỡ tương thích (breaking)
- `game.contract.json`: `contract_version` 1.1. Tuning đổi: bán kính đảo Đêm 1 là 40 m (`island_radius_night1`), sức chứa 10, đèn 10 đom đóm, tỏa sáng chi phí 3 bán kính 5 m, choáng 2 s, đẩy 4 m, vùng an toàn 6 m, trọng lực 20, nhảy 7, Đêm 1 dài 300 s. Đã bỏ `lantern_ring_radius` và `fall_enabled` cũ.
- Snapshot: `motes` là mảng đối tượng `{id, pos, kind, ttl_s}` (trước là mảng tọa độ). `player` có thêm `vel`, `grounded`, `invuln`, `dash_cd_s`, `pulse_cd_s`, `charm_s`; `onGround` đổi thành `grounded`. Thêm `night`, `wind`, `drifters`, `charms`, `sim_tick` tách khỏi `tick`.
- Trạng thái Bóng Mực: `spawning`, `wander`, `chase`, `recoil`, `stunned` (trước là `chasing`).
- Sự kiện: thêm `dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `night_start`, `paused`, `resumed`. `player_hit` có thêm `lost`; `by` có thêm `fall`.
- Điểm: `per_stun` 25 → 5; `per_second_left` 5 → 2; thưởng thắng là `floor(giây)×2 + 50×Ngọn Lửa`.
- CLI: `--night` nhận 1, 2, 3 (trước chỉ 1). Input có thêm `dash`, `pause`.
- Chỉ số `sim_tick` không còn bằng `tick` khi có tạm dừng.

### Thêm mới
- Đêm 2 (Đảo Cau) và Đêm 3 (Đảo Chuông): bản đồ, cầu tre, tầng, dốc, vách, bục nhảy, tháp chuông.
- Lướt (Shift trên web), hồi chiêu 1.5 s.
- Rơi khỏi đảo và hồi sinh.
- Gió Lạc (kẻ cướp đom đóm), Bùa Gió, gió Đêm 3.
- Tạm dừng (Esc/P).
- Web: chuỗi ba Đêm, tổng điểm chiến dịch, HUD mới, mặt đất theo từng Đêm.

### Đã làm sau đó (Phase 4)
- (Đã làm ở Phase 4: menu, màn giới thiệu, cài đặt, âm thanh, âm lượng, độ nhạy chuột.)

## Phase 3 (Ticket-03 "Đèn cạn dầu", Contract v1.2)

### Thay đổi phá vỡ tương thích (breaking)
- Thắp đủ đèn không kết thúc Đêm nữa (bỏ thắng sớm). Thắng khi hết giờ, còn Ngọn Lửa và đủ đèn sáng: `game_over.reason = dawn_survived`. `all_lit` không còn dùng.
- Thời lượng Đêm: 240 / 270 / 300 s (trước 300 / 330 / 360).
- Điểm: `per_mote` 10 → 5 (nạp và châm); bỏ `per_second_left`; thêm `per_relight` 40, `per_drain_stun` 10, `per_lit_end` 50, `per_fuel_end` 1; thưởng thắng đổi thành đèn sáng và Ngọn Lửa.
- Snapshot: mỗi đèn có `fuel`, `ever_lit`, `relit_count`; `player.capacity`; trạng thái Bóng Mực thêm `drain`.
- Scenario: đèn có `fuel`, `ever_lit`; `player.successful_lights`; Bóng Mực có `target_lantern_id`, trạng thái `drain`.
- Sự kiện mới: `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit` thêm `relight`.
- Bóng Mực hết choáng về `wander` (trước là `chase` khi Mây gần).
- Sức chứa tăng theo số lần thắp thành công (10 → tối đa 20). Trước đây cố định 10.

### Thêm mới
- Nhiên liệu đèn, hút dầu, châm dầu, thắp lại (5 đom đóm).
- Web: thanh dầu/nhấp nháy dưới 30, đèn tắt xẹp và có vết rách, bảng màu dễ phân biệt (lưu cục bộ).
- ADR 0001 (`docs/adr/0001-fuel-and-win-rule.md`).

## Phase 4 (Ticket-04 "Bình minh: phát hành v1.0.0", Contract v1.3)

### Thay đổi phá vỡ tương thích
- `game.contract.json`: `contract_version` 1.3; thêm `bench_cmd`, `soak_cmd`; `run_cmd` là `node bin/game.js`.
- `npm start` chạy `bin/game.js` (máy chủ tĩnh). `scripts/serve.js` xuất `startServer` để dùng lại.
- Sim có chế độ `createBenchGame` (không ảnh hưởng CLI headless; đầu ra headless không đổi).

### Thêm mới
- Bảng xếp hạng cục bộ: top 10, tên 3–12 ký tự, lưu trên web (localStorage) và xuất JSON; `node bin/game.js --export-leaderboard out.json`.
- Soak test headless 10 Đêm: `node --expose-gc bin/soak.js --seed 7 --nights 10 --out soak.json`.
- Benchmark: `node --expose-gc bin/bench.js --seed 42 --duration 30 --out bench.json` (Chrome headless qua DevTools).
- Menu chính; màn hình Cài đặt: đổi phím (có báo trùng), khôi phục mặc định, giảm chuyển động, chữ lớn ×1.25, bảng màu dễ phân biệt.
- Chỉ báo Bóng Mực ngoài màn hình (mũi tên ở mép), 10 s cuối nhấp nháy đỏ, cảnh báo gió, đèn sắp tắt nhấp nháy.
- Nhập tên khi kết thúc chiến dịch (thắng Đêm 3 hoặc thua).

## Phase 4 bổ sung (hoàn thiện trước v1.0.0)

- Bench: tối ưu bằng `InstancedMesh` cho Bóng Mực và đom đóm; bỏ snapshot khỏi vòng vẽ; thêm `--vsync 1` cho bench tham khảo (ghi `vsync_off: false`).
- Web: bảng màu theo mã hex của ticket; thanh dầu trên đèn; gợi ý phím E; mũi tên tới đèn chưa sáng; màn giới thiệu từng Đêm; âm thanh tổng hợp; âm lượng, độ nhạy chuột; rung camera khi trúng (tắt khi giảm chuyển động).
- Kiểm thử E2E bằng Chrome thật (`npm run e2e`, 17 kiểm tra).
- Quay video demo bằng `scripts/record-demo.mjs`.
- Harness: hook `PostToolUse` chạy `npm run check` sau mỗi lần sửa; skill `ddl-verify`.
