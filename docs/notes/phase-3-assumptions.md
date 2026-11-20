# Giả định Phase 3 (Ticket-03)

| # | Chỗ chưa rõ | Giả định | Lý do |
|---|---|---|---|
| A-P3-01 | "Đầy dầu" | Đèn có fuel ≥ 99.95 (hiển thị 100.0) được coi là đầy | Hao 1/60 ngay tick tương tác làm đèn 100 thành 99.98; nếu không, đèn đầy vẫn bị châm 1 đom đóm |
| A-P3-02 | Thứ tự hao và hút | Hao và hút diễn ra ở bước 2, trước tương tác | Ticket: "ở bước 2 trừ dầu" |
| A-P3-03 | Thoát drain khi bị đẩy | Chuyển trạng thái (chase/wander) được xét trước khi đẩy ra; đẩy vẫn xảy ra | Nếu đẩy trước sẽ chặn chuyển trạng thái, và Bóng Mực đứng yên ở trạng thái sai |
| A-P3-04 | Mây châm dầu trong 2 m đèn | Bóng Mực đang hút luôn ở trong 6 m của Mây, nên châm dầu lúc đó đưa Bóng Mực sang chase | Hệ quả của hình học; ghi để người chấm không nhầm với lỗi |
| A-P3-05 | Wander chọn đèn | Đèn sáng dưới 30 được ưu tiên; trong nhóm chọn đèn gần nhất (XZ) | Ticket: "đèn sáng có fuel < 30 gần nhất" |
| A-P3-06 | Chase trong lúc hút | Chase không đổi mục tiêu; mục tiêu drain bị xóa khi chuyển sang chase | Ticket: "chase không đổi mục tiêu" |
| A-P3-07 | Sự kiện fuel_drain | Phát ở tick chia hết cho 60 (theo sim tick), cho mỗi Bóng Mực đang hút | Ticket: "mỗi 60 tick khi đang hút" |
| A-P3-08 | Thắng ở bình minh nhưng đầy Ngọn Lửa 0 | Hết Ngọn Lửa ở bất kỳ tick nào đều thua no_flames trước khi xét giờ | Ticket mục 3 |
| A-P3-09 | Thưởng bình minh | floor(fuel) lấy sau tick cuối (đã trừ hao tick đó) | Nhất quán với thứ tự tick |
| A-P3-10 | Sức chứa khi dùng scenario | Scenario `successful_lights` đặt số lần thắp đã có; đèn sẵn sáng trong scenario không tính | Ticket: "đèn đặt sẵn bằng scenario không tính" |
| A-P3-11 | Bóng Mực hết choáng | Về wander (Ticket) thay vì chase như Phase 2 | Đổi hành vi có chủ đích; ghi ở CHANGELOG |
| A-P3-12 | Đèn tắt vì hết dầu có trong deposited | Đặt deposited = 0 | Ticket: "deposited = 0" |
| A-P3-13 | Thắp lại sau khi tắt | Cần đúng 5 đom đóm; thắp được mà không cần tích lũy từ trước | Ticket mục 1 |
| A-P3-14 | Thưởng thắp lại | Thắp lại +40 (không cộng 100) | Ticket mục 5 |
| A-P3-15 | Tiêu đề điểm `per_mote` | Nạp và châm dầu đều là 5 điểm mỗi đom đóm | Ticket mục 5 |
