# Spec Phase 4: Ticket-04 "Bình minh: phát hành v1.0.0" (Contract v1.3)

| Mã | Yêu cầu (rút gọn) | Bằng chứng |
|---|---|---|
| AC-P4-01 | Tên 3–12 ký tự [A-Za-z0-9_] | `tests/phase4.test.js` |
| AC-P4-02 | Mục điểm đủ trường; achieved_at ISO 8601 có múi giờ | `tests/phase4.test.js` |
| AC-P4-03 | Top 10; điểm giảm dần; bằng điểm thì ai đạt trước đứng trên; lưu cục bộ | `tests/phase4.test.js`; bảng xếp hạng trên web |
| AC-P4-04 | `--export-leaderboard out.json` cho `{"entries": [...]}` đúng thứ tự | `tests/phase4.test.js` (chạy CLI thật) |
| AC-P4-05 | Cảnh bench: 200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng fuel 100; không sự kiện; camera vòng tròn 30 m, Y=15, 15 s | `tests/phase4.test.js`; `bin/bench.js`; `docs/proof/phase-4/bench-scene-1280x720.png` |
| AC-P4-06 | Soak 10 Đêm trong một tiến trình; crashes = 0 và mem_end ≤ 1.2 × mem_start | `bin/soak.js`; `docs/proof/phase-4/soak.json` (**chưa đạt memory**, xem eval) |
| AC-P4-07 | Contract v1.3 có bench_cmd, soak_cmd | `tests/phase4.test.js` |
| AC-P4-08 | Đổi phím mọi hành động, báo trùng phím, khôi phục mặc định, lưu được | `tests/phase4.test.js`; menu Cài đặt |
| AC-P4-09 | Trợ năng: giảm chuyển động, chữ lớn ×1.25, chỉ báo mũi tên Bóng Mực, 10 s cuối nhấp nháy, gió và đèn sắp tắt | web (chưa kiểm trên tay) |
| AC-P4-10 | Chỉ số bench theo công thức ticket | `tests/benchstats.test.js` |

Ngưỡng máy chấm (không kiểm được ở đây): avg_fps ≥ 60, p1_low_fps ≥ 30, load_ms ≤ 10000.
