# Retro: Đảo Đèn Lồng (Day 12 · AI SDLC)

## Tổng hợp đánh giá bốn phase
- **Phase 1 (Đêm 1):** lõi mô phỏng tất định, headless, bằng chứng từ CLI thật. Mạnh: test đỏ trước, bằng chứng chạy hai lần so sha256.
- **Phase 2 (ba Đêm):** sửa lỗi đơn vị (giây và tick), thứ tự cạnh nhấn, điểm hồi sinh. Đây là phase nhiều lỗi nhất; test đỏ trước bắt được hầu hết.
- **Phase 3 (đèn cạn dầu):** đổi luật thắng và điểm; cần sửa 6 test cũ có lý do. Phát hiện scenario đặt sai vị trí làm bằng chứng sai, và lỗi "đầy dầu" do hao một tick.
- **Phase 4 (phát hành):** bảng xếp hạng, soak, bench, cài đặt. Không đạt FPS và bộ nhớ trong sandbox; video và Release chưa làm.

## Điều hiệu quả và không hiệu quả khi làm với AI
- Hiệu quả: viết test theo mã AC trước rồi code; ghi giả định cho mọi chỗ mơ hồ; bằng chứng sinh bằng script từ CLI thật, không sửa tay.
- Không hiệu quả: viết nhiều module trước khi có test (phase 4 có 11 test không đỏ trước); tự tin nói "đạt" khi chưa mở trình duyệt; để số đo sandbox trông như số chính thức.

## Những lần AI sai và cách phát hiện
| Lần | Sai ở đâu | Phát hiện bằng |
|---|---|---|
| 1 | `prevButtons` cập nhật trước khi đọc cạnh nhấn | Test nhảy và lướt đỏ |
| 2 | Hồi sinh về vị trí scenario | Test rơi thấy rơi lần hai |
| 3 | Tên thuộc tính đổi, thay thế toàn cục nhân đôi hậu tố | Test NaN |
| 4 | Đèn đầy dầu bị coi là chưa đầy vì hao 1 tick | Test "đèn đầy không được chọn" |
| 5 | Scenario đặt đèn/Bóng Mực không cạnh nhau | Bằng chứng P3-R4 chỉ có hao dầu, không hút |
| 6 | Viết module bảng xếp hạng trước test | Test sau đó chỉ đỏ ở hợp đồng |

## Harness giúp nhiều nhất
1. `AGENTS.md` với quy tắc "test trước" và "không sửa tay docs/proof": ngăn việc đổi kỳ vọng cho khớp đầu ra sai.
2. `scripts/evidence.js` và `scripts/write-contract.js`: bằng chứng và contract luôn sinh từ mã, không sửa tay.
3. `docs/notes/*-test-changes.md`: mỗi test cũ bị đổi đều có lý do.
Chưa dùng: skill, hook. Đây là điều cần làm nếu làm lại (ví dụ hook chạy `npm test` sau mỗi lần sửa `src/`).

## Token và chi phí (ước tính thô)
- Không đo được số token chính xác từ phiên. Phần lớn token nằm ở: đọc đề bốn lần, viết lại `src/sim.js` ba lần (Phase 2, 3, 4 có đổi), viết lại `web/main.js` hai lần.
- Tiết kiệm đã làm: đọc lab board chỉ khi cần; ưu tiên chạy test nhỏ trước; sinh bằng chứng bằng script thay vì mô tả bằng lời.
- Lãng phí: viết lại toàn bộ file khi chỉ đổi vài dòng (ví dụ `sim.js` khi Phase 3). Lần sau dùng Edit cho thay đổi nhỏ.

## Nếu làm lại
1. Viết test cho bảng xếp hạng và cài đặt trước khi viết module.
2. Mở trình duyệt sớm (sau Phase 1), không để đến cuối mới kiểm chứng giao diện.
3. Ghi bench trong sandbox ngay từ đầu để biết chi phí render sớm, và giảm số đối tượng.
4. Thêm hook chạy test sau mỗi lần sửa mã.
