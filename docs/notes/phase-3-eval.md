# Đánh giá Phase 3 (Ticket-03, Contract v1.2)

## Đã kiểm chứng
- 38 test trong `tests/phase3.test.js` (AC-P3-01..24). Tổng bộ test 131/131 (`docs/proof/phase-3/test-output.txt`), gồm các test Phase 1–2 còn hiệu lực.
- Bằng chứng headless `docs/proof/phase-3/evidence.md`: hút dầu (P3-R4: 6 fuel/s, đèn tắt đúng tick 200, Bóng Mực về wander), châm dầu (P3-R5), thắp lại (P3-R6), ba Đêm đầy đủ, tất định.
- Web: đã sửa, `node --check` đạt. **Chưa mở trên trình duyệt** nên chưa kiểm chứng hiển thị thanh dầu, nhấp nháy và bảng màu.

## Điều học được
1. Hao dầu theo số thực cho kết quả lệch 0.02 fuel: đèn "100" hao một tick thành 99.98, làm châm dầu chọn nhầm đèn đầy. Đổi sang đơn vị nguyên 1/60 và ngưỡng "đầy" theo hiển thị.
2. Đèn đặt trong scenario mặc định ở (0,0,25), không phải (0,0,0). Kịch bản hút dầu đầu tiên đặt Bóng Mực cạnh một đèn khác nên không hút; bằng chứng P3-R4 đã sai cho đến khi sửa scenario.
3. Thứ tự chuyển trạng thái và đẩy ra: đẩy ra không được chặn chuyển trạng thái.
4. Khi viết lại toàn bộ sim, công cụ ghi báo lỗi "file đã thay đổi" dù nội dung không đổi; phải đọc lại trước khi ghi đè.

## Chưa đạt
- Trình duyệt chưa kiểm chứng (xem trên).
- Hiệu chỉnh cảm giác hút dầu (5/s) và tỉ lệ thắng (0.6) chưa thử chơi thật.

## Token và chi phí

Xem [token-usage.md](token-usage.md).
