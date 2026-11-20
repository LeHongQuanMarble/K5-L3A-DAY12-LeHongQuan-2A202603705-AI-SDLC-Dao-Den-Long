# Giả định Phase 4 (Ticket-04)

| # | Chỗ chưa rõ | Giả định | Lý do |
|---|---|---|---|
| A-P4-01 | Hướng "ngược chiều kim đồng hồ khi nhìn từ trên" | Trên bản đồ nhìn từ trên, trục X sang phải và Z xuống dưới; camera đi từ (30,15,0) sang (0,15,−30) | Một quy ước cố định; người chấm kiểm chứng bằng ảnh |
| A-P4-02 | Cảnh bench và "không sự kiện" | `createBenchGame` tắt spawn, nhặt, hao dầu, hút, sát thương, rơi, kết thúc; Bóng Mực wander đi theo luật thường | Ticket mục 1 |
| A-P4-03 | `mem_start` | RSS đo ngay sau khi dựng Đêm đầu (chưa chạy bước nào), đo sau khi ép GC | Đúng định nghĩa ticket; ép GC để số đo không nhiễu |
| A-P4-04 | Soak: input và kết thúc | Input theo seed đúng tỉ lệ ticket; mỗi Đêm chạy đến khi kết thúc, tối đa 25000 tick | Ticket mục 2 |
| A-P4-05 | Lưu bảng xếp hạng | Web: localStorage (`dden.leaderboard`); CLI đọc `~/.dao-den-long/leaderboard.json` hoặc biến `DDL_LEADERBOARD`; nút "Tải JSON" trên web để đưa file vào CLI | Trình duyệt không cho CLI đọc localStorage |
| A-P4-06 | Ai đứng trên khi bằng điểm | Thời điểm sớm hơn đứng trên (so theo UTC, không phụ thuộc múi giờ hiển thị) | Ticket mục 3 |
| A-P4-07 | Tên có dấu | Chưa hỗ trợ (là điểm cộng, không bắt buộc); báo lỗi rõ ràng khi nhập | Giữ đúng quy tắc bắt buộc |
| A-P4-08 | Trùng phím | Từ chối gán và báo tên hành động đang dùng phím đó | Ticket: "phát hiện trùng phím và báo" |
| A-P4-09 | Chữ lớn | Tăng cỡ chữ UI ×1.25 qua biến CSS; cỡ tối thiểu 18 px | Ticket mục 4 |
| A-P4-10 | Giảm chuyển động | Tắt chớp màn hình (không có rung camera trong bản này) | Chỉ có chớp màn hình để tắt |
| A-P4-11 | Âm thanh | Không làm trong Phase 4 (ghi rõ ở đánh giá) | Không có asset và ngân sách thời gian; không giả vờ có |
| A-P4-12 | Vsync | Bench khởi chạy Chrome với `--disable-gpu-vsync --disable-frame-rate-limit`; ghi `vsync_off: true` | Ticket: tắt vsync nếu engine cho phép |
| A-P4-13 | Số đo | Bench trong phiên này chạy trên SwiftShader (render bằng CPU), không phải GPU | Số chỉ để tham khảo; máy chấm sẽ đo lại |
