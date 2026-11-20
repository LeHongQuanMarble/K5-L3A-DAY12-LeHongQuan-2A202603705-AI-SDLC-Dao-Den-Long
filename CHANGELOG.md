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

### Chưa làm trong Phase 2
- Menu chính, màn giới thiệu Đêm, cài đặt âm lượng và độ nhạy chuột lưu giữa các lần mở, âm thanh, bảng màu chuẩn: chưa có. Xem `docs/notes/phase-2-eval.md`.
