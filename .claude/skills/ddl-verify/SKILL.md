---
name: ddl-verify
description: Use when a change to Đảo Đèn Lồng needs proof — before claiming a feature, a fix, a tag or a release works. Runs the test suite, regenerates evidence, and checks bench, soak and end-to-end results against the rules in AGENTS.md.
---

# Xác minh Đảo Đèn Lồng

Không nói "đã chạy" nếu chưa có đầu ra của lệnh. Quy trình:

1. `npm run check` (cú pháp) và `npm test` (toàn bộ test). Ghi số pass/fail.
2. Nếu đầu ra headless đổi: `npm run evidence`, rồi kiểm tra `git diff docs/proof/`. Không sửa tay file trong `docs/proof/`.
3. Nếu đổi số liệu: `npm run contract`, rồi chạy `npm test` (test contract phải khớp).
4. Nếu đổi giao diện: `npm run e2e` (cần google-chrome). Đọc `docs/proof/phase-4/e2e/e2e.json`.
5. Nếu đổi hiệu năng: `node --expose-gc bin/bench.js --seed 42 --duration 30 --out <file>`. Ghi cả cấu hình máy trong báo cáo.
6. Tag `phase-N` chỉ gắn sau khi bước 1–2 xanh trên đúng commit đó.

Báo cáo theo mẫu: lệnh đã chạy, exit code, số liệu chính, điều chưa kiểm chứng.
