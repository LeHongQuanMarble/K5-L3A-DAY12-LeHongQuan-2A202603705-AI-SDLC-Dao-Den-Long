# AGENTS.md: hướng dẫn cho agent AI

Dự án: **Đảo Đèn Lồng**, game 3D trên three.js với lõi mô phỏng thuần JS và chế độ headless theo Test Contract v1.3.

## Lệnh

- `npm test`: toàn bộ test (node:test). Dùng lệnh này, **đừng** chạy `node --test tests/` vì Node 24 coi thư mục là một file.
- `npm run check`: kiểm tra cú pháp các file JS.
- `npm run evidence`: chạy các kịch bản headless bằng CLI thật và ghi `docs/proof/phase-3/`. **Không sửa tay** các file trong `docs/proof/`.
- `npm run contract`: sinh lại `game.contract.json` từ `src/tuning.js` và `SCORE`. Không sửa tay file này.
- `npm run bench`: đo hiệu năng trong Chrome headless (cần `google-chrome`); cấu hình theo ticket là vsync tắt, xem `docs/notes/phase-4-eval.md`. `npm run soak`: soak 10 Đêm headless, có `--jitless`. `npm run e2e`: kiểm thử trình duyệt thật (cần `google-chrome`), không nằm trong `npm test`.
- `node bin/game.js --export-leaderboard out.json`: xuất bảng xếp hạng đã lưu.
- `npm start`: máy chủ tĩnh tại http://127.0.0.1:8080 (tự chuyển về `/web/`).
- `node bin/headless.js --seed <n> --night 1|2|3 --ticks <n> --out <file>`: chạy headless.

## Quy tắc

1. **Test trước, code sau.** Viết hoặc sửa test cho AC trước, chạy để thấy đỏ, rồi mới sửa code.
2. **Không làm test xanh bằng cách sửa kỳ vọng cho khớp đầu ra sai.** Nếu một test cũ mâu thuẫn với yêu cầu mới, sửa test và ghi lý do vào `docs/notes/`.
3. **Con số chỉ có ở `src/tuning.js` (và `SCORE`).** Sau khi đổi, chạy `npm run contract`; `tests/contract.test.js` sẽ báo nếu lệch.
4. **Luật chơi chỉ ở `src/sim.js`** (bản đồ ở `src/world.js`). Không đặt logic game trong `web/main.js`. `sim.js` và `world.js` không được import three.js hay DOM.
5. **Tất định.** Mọi ngẫu nhiên đi qua `createRng(seed)`. Không dùng `Math.random`, `Date.now` trong `src/`.
6. **Khoảng cách XZ, "trong bán kính r" là `<= r`.** Tọa độ mét, đất ở Y=0.
7. **Thay đổi đầu ra headless là thay đổi Contract**: ghi ở `docs/notes/`, chạy lại `npm run evidence`.
8. **Không commit** `.env`, khóa API, token.
9. Tag `phase-N` chỉ gắn sau khi `npm test` xanh và `npm run evidence` đã chạy lại trên đúng commit đó.

## Phạm vi hiện tại

Đã hoàn thành Phase 4 (Ticket-04, v1.0.0, Contract v1.3), phase cuối. Mỗi phase có spec và giả định riêng: `specs/phase-N/`, `docs/notes/phase-N-assumptions.md`. Breaking changes: `CHANGELOG.md`. Đánh giá và các mục chưa đạt: `docs/notes/phase-4-eval.md`.

## Quy tắc Phase 2+

10. **Đọc Changelog trước khi sửa Contract.** Mỗi thay đổi phá vỡ tương thích ghi vào `CHANGELOG.md`.
11. **Test cũ mâu thuẫn với ticket mới:** sửa hoặc thay bằng test tương đương, ghi lý do vào `docs/notes/<phase>-test-changes.md`. Không dùng `skip`.
