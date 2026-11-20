# Thay đổi test Phase 4 (Ticket-04, Contract v1.3)

So sánh `tests/` ở tag `phase-3` với HEAD của phase 4.

| File | Thay đổi | Lý do |
|---|---|---|
| `tests/contract.test.js` | Đổi kỳ vọng `contract_version` từ `1.2` sang `1.3` và tên test tương ứng | Contract v1.3 theo Ticket-04 (thêm `bench_cmd`, `soak_cmd`) |
| `tests/phase4.test.js` | Mới, 17 test | AC-P4-01..10 (bảng xếp hạng, CLI xuất file, cài đặt, cảnh bench, contract) |
| `tests/benchstats.test.js` | Mới, 5 test | AC-P4-10: công thức avg_fps, p1_low_fps, p95 và ngưỡng |
| `tests/e2e/run.mjs` | Mới, 17 kiểm tra trên Chrome thật | Luồng menu, cài đặt, giới thiệu, nhập tên, lưu sau tải lại; chạy bằng `npm run e2e`, không nằm trong `npm test` |

- Không có test cũ nào bị xóa, `skip`, hay đổi kỳ vọng hành vi. `tests/sim.test.js`, `tests/phase2.test.js`, `tests/phase3.test.js`, `tests/headless.test.js` không đổi.
- Lưu ý về quy trình: một phần mã Phase 4 (bảng xếp hạng, cảnh bench, soak, cài đặt) được viết trước test. Chi tiết ở `docs/notes/ai-log.md`.
