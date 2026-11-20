# Nhật ký dùng AI: Phase 1

Công cụ: Claude Code (model Haiku 5.5, theo phiên làm việc). Lab board là nguồn yêu cầu duy nhất của phase này.

## Trình tự đã làm

1. Đọc tài liệu lab trong repo `K5-L3-LAB-Day12-AI-SDLC` (README, GUIDE, RULES, RUBRIC, CHECKPOINTS, SUBMISSION).
2. Đọc PRD-0 và Test Contract v1.0 từ lab board (một lần duy nhất, qua công cụ Artifact). Phase 2–4 chưa phát hành nên không có yêu cầu để làm.
3. Viết `specs/phase-1/spec.md` (AC-1..AC-12) và `tasks.md`.
4. TDD: `tuning.js` + `game.contract.json` → test contract xanh → test sim đỏ (lỗi `Cannot find module src/sim.js`) → code sim → 27/27 xanh → test headless đỏ → CLI → 38/38 xanh.
5. Web: three.js, HUD, input. Kiểm tra bằng Chrome headless chụp ảnh.
6. `npm run evidence` tạo bằng chứng từ CLI thật, chạy hai lần mỗi kịch bản để kiểm tra tất định.

## Sai lầm và cách phát hiện

| # | AI (hoặc tôi) làm gì sai | Phát hiện bằng | Cách sửa | Chỉnh harness |
|---|---|---|---|---|
| 1 | `node --test tests/` chỉ chạy được 1 "test" trên Node 24 (coi thư mục là một file) | `npm test` báo 1 test, 0 pass | Đổi script thành `node --test tests/*.test.js` | Ghi vào `AGENTS.md`: dùng `npm test` |
| 2 | Máy chủ tĩnh trả 404 cho `/`: `index.html` dùng `./main.js`, nên khi URL là `/` thì trình duyệt tìm `/main.js` | Chụp ảnh headless: chỉ thấy HUD mặc định trong HTML, không có canvas; `--dump-dom` không có `<canvas>` | Trả 302 về `/web/` (giữ query string) | Ghi cách chạy trong README và AGENTS.md |
| 3 | Lần đầu redirect làm mất `?seed=7` | Ảnh chụp hiện `seed 833052382` thay vì `seed 7` | Giữ `search` khi redirect | — |
| 4 | Thử `pkill -f "scripts/serve.js"` làm chính shell bị kill (lệnh có chứa chuỗi khớp) | Exit code 144 | Dùng PID hoặc đổi port khi cần | Không lặp lại kiểu kill theo chuỗi lệnh |

Các sai lầm 1–3 là của mã do tôi viết trong phiên này, không phải hallucination của AI về yêu cầu. Không có trường hợp AI bịa yêu cầu không có trong PRD-0.

## Ước tính token / chi phí

- Chưa đo được con số chính xác từ phiên làm việc. Ước tính thô: phần lớn token nằm ở việc đọc tài liệu lab (~43 KB) và viết code/test sim (~1.000 dòng).
- Tiết kiệm đã làm: đọc Artifact một lần duy nhất, dùng `tests/` và `scenarios/` tái sử dụng cho evidence, không chạy lại toàn bộ sau mỗi thay đổi nhỏ.
- Chưa làm: không có subagent nào (việc đủ nhỏ để làm trực tiếp, tránh chi phí phụ).

## Điều cần chú ý ở các phase sau

- Khi AI viết sai, phải thêm test hoặc ràng buộc vào code trước, rồi mới thêm dòng vào `AGENTS.md`.
- Kiểm chứng trình duyệt hiện chỉ là ảnh chụp. Thao tác phím chưa được tự động hóa; cần bổ sung nếu có thời gian.
