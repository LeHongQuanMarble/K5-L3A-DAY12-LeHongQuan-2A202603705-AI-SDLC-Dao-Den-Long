# AGENTS.md: hướng dẫn cho agent AI

Dự án: **Đảo Đèn Lồng**, game 3D trên three.js với lõi mô phỏng thuần JS và chế độ headless theo Test Contract v1.0.

## Lệnh

- `npm test`: toàn bộ test (node:test). Dùng lệnh này, **đừng** chạy `node --test tests/` vì Node 24 coi thư mục là một file.
- `npm run check`: kiểm tra cú pháp các file JS.
- `npm run evidence`: chạy các kịch bản headless bằng CLI thật và ghi `docs/proof/phase-1/`. **Không sửa tay** các file trong `docs/proof/`.
- `npm start`: máy chủ tĩnh tại http://127.0.0.1:8080 (tự chuyển về `/web/`).
- `node bin/headless.js --seed <n> --night 1 --ticks <n> --out <file>`: chạy headless.

## Quy tắc

1. **Test trước, code sau.** Viết hoặc sửa test cho AC trước, chạy để thấy đỏ, rồi mới sửa code.
2. **Không làm test xanh bằng cách sửa kỳ vọng cho khớp đầu ra sai.** Nếu một test cũ mâu thuẫn với yêu cầu mới, sửa test và ghi lý do vào `docs/notes/`.
3. **Con số chỉ có ở `src/tuning.js` (và `SCORE`).** Sau khi đổi, cập nhật `game.contract.json` cho khớp; `tests/contract.test.js` sẽ báo nếu lệch.
4. **Luật chơi chỉ ở `src/sim.js`.** Không đặt logic game trong `web/main.js`. `sim.js` không được import three.js hay DOM.
5. **Tất định.** Mọi ngẫu nhiên đi qua `createRng(seed)`. Không dùng `Math.random`, `Date.now` trong `src/`.
6. **Khoảng cách XZ, "trong bán kính r" là `<= r`.** Tọa độ mét, đất ở Y=0.
7. **Thay đổi đầu ra headless là thay đổi Contract**: ghi ở `docs/notes/`, chạy lại `npm run evidence`.
8. **Không commit** `.env`, khóa API, token.
9. Tag `phase-N` chỉ gắn sau khi `npm test` xanh và `npm run evidence` đã chạy lại trên đúng commit đó.

## Phạm vi hiện tại

Chỉ Phase 1 (Đêm 1). Yêu cầu Phase 2+ sẽ được phát hành sau; không đoán trước.
