# Đánh giá Phase 1

Tag: `phase-1`. Yêu cầu: PRD-0 và Test Contract v1.0 trên lab board.

## Yêu cầu đã đạt và bằng chứng

| Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|
| Di chuyển, chuẩn hóa vector, xoay theo camera | Đạt | `tests/sim.test.js` (movement, diagonal, camera yaw) |
| Nhảy, trọng lực, đứng trên Y=0 | Đạt | `tests/sim.test.js` (jump) |
| Nhặt đom đóm, sức chứa | Đạt | `tests/sim.test.js` (pickup, capacity) |
| Nạp đèn, thắp đèn, điểm | Đạt | `tests/sim.test.js` (deposit); `evidence.md` R2 |
| Tỏa sáng: chi phí, choáng, đẩy lùi, hồi chiêu | Đạt | `tests/sim.test.js` (pulse, cooldown); `evidence.md` R3 |
| Bóng Mực đuổi, trúng, bất tử | Đạt | `tests/sim.test.js` (hit); `evidence.md` R1 |
| Vùng an toàn quanh đèn | Đạt | `tests/sim.test.js` (safe radius) |
| Thắng 5 đèn; thua hết HP; thua bình minh | Đạt | `evidence.md` R2, R1, R5 |
| CLI headless, JSONL, snapshot-every, tick 0 | Đạt | `tests/headless.test.js`; `evidence.md` |
| Exit code 2 cho input sai | Đạt | `tests/headless.test.js`; `evidence.md` |
| Tất định | Đạt | `evidence.md`: 6/6 run có sha256 khớp khi chạy lại |
| Chơi thử trong trình duyệt | **Hiển thị đạt, thao tác chưa kiểm chứng tự động** | `web-load-seed7.png` |
| README: cài đặt ≤3 lệnh, điều khiển, điểm, headless | Đạt | `README.md` |
| `game.contract.json` | Đạt | `tests/contract.test.js` |

## Chưa đạt hoặc chưa kiểm chứng

- Chơi bằng bàn phím trong trình duyệt chưa được kiểm chứng tự động (không có test end-to-end). Chỉ có ảnh chụp trang khi tải xong.
- Chưa đo hiệu năng trình duyệt (FPS). Không có yêu cầu đo ở Phase 1.
- Lưu ý: ở kịch bản ngẫu nhiên (R4, R6), Mây thua khá nhanh vì Bóng Mực đuổi kịp khi người chơi đứng yên hoặc đi lạc. Đây là cân bằng chưa được tinh chỉnh; không ảnh hưởng yêu cầu PRD-0, nhưng sẽ xem lại ở Phase 4 nếu có yêu cầu đo độ khó.

## Đã làm đúng so với AC

- Bộ kịch bản kiểm chứng nằm trong `tests/` và `scenarios/`, chạy bằng một lệnh (`npm test`, `npm run evidence`).
- Bằng chứng khớp mã ở tag `phase-1` (được tạo từ đúng commit này).

## Điều cần làm ở Phase 2

1. Đọc Ticket-02 khi phát hành, so với giả định A1–A19.
2. Trước khi code, viết kế hoạch kiểm chứng cho phần mới.
3. Chạy lại toàn bộ `npm test` và `npm run evidence` sau khi tích hợp để chứng minh phần cũ không hỏng.
4. Rà soát `AGENTS.md`: thêm dòng nếu AI lặp lại một lỗi.
