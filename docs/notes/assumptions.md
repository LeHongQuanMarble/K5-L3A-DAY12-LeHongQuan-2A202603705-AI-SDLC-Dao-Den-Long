# Giả định Phase 1

PRD-0 có những chỗ mơ hồ có chủ đích. Dưới đây là lựa chọn của tôi, mỗi cái kèm lý do ngắn. Nếu giảng viên nói khác, lời giảng viên là cuối cùng.

| # | Chỗ mơ hồ | Giả định | Lý do / ảnh hưởng |
|---|---|---|---|
| A1 | Điểm nạp đèn | `per_mote` tính **khi nạp** vào đèn, nhân số đơn vị nạp. Nhặt không có điểm. | Điểm gắn với hành động có kết quả; tránh farm bằng cách nhặt rồi rơi |
| A2 | `flames` là gì | HP của Mây, bắt đầu bằng `flames = 3`. Mỗi lần trúng mất 1. | PRD: "lose all HP", contract có `flames` |
| A3 | Đom đóm rơi khi trúng | `floor(carried × 0.5)` bị mất, không rơi xuống đất | Đơn giản, tất định; không cần thực thể rơi |
| A4 | Tỏa sáng "tốn ánh sáng" | Tốn `pulse_cost = 1` đom đóm đang mang; cần `carried ≥ 1` | Đom đóm là nguồn sáng duy nhất |
| A5 | Choáng nhiều lần | Mỗi lần tỏa sáng làm mới thời gian choáng của mọi Bóng Mực trong tầm; `per_stun` chỉ cộng khi Bóng Mực chưa ở trạng thái choáng | Không cho farm điểm bằng cách tỏa sáng liên tục |
| A6 | Bóng Mực "sợ đèn" | `safe_radius` = 3 m chỉ áp dụng quanh **đèn đã sáng** | Đèn chưa sáng chưa có tác dụng gì |
| A7 | Bóng Mực mới | Cứ 30 s xuất hiện thêm một con ở biên đảo, tối đa 6 con. **Tắt** khi `random_shades: false` | Contract nói "chỉ các thực thể được liệt kê tồn tại" |
| A8 | Đảo và rơi | Đảo tròn bán kính 12 m; Mây bị kẹp trong đảo; `fall_enabled = false` | PRD không yêu cầu rơi; tránh một nhánh luật chưa được định nghĩa |
| A9 | Vị trí đèn | 5 đèn trên vòng bán kính 7 m, góc `2πi/5 + 0.3` | Cố định để tất định; scenario có thể đặt lại `pos` |
| A10 | Thứ tự kết thúc cùng tick | Thắng trước, rồi hết HP, rồi bình minh | Thắng là kết quả tốt hơn khi xảy ra cùng lúc |
| A11 | Nhảy | Vận tốc 6 m/s, trọng lực 18 m/s², không double-jump, không có va chạm trần | PRD chỉ nói có nhảy |
| A12 | Đầu vào `move` ngoài [-1, 1] | Coi là định dạng sai → exit code 2. Vector có độ dài > 1 (thành phần đều trong [-1, 1]) được chuẩn hóa | Đúng câu chữ "each component in [−1, 1]" |
| A13 | Định dạng dòng sự kiện | `{"type":"event","tick":n,"name":...,"data":{...}}`; `tick` = k+1 | Contract chỉ liệt kê `name` và `data`; cần `type` để phân loại dòng |
| A14 | Snapshot | Có thêm khóa `motes` (vị trí đom đóm). Snapshot được ghi khi `tick % every == 0`, kể cả tick 0 | Khuyến nghị của contract; giúp kiểm chứng |
| A15 | `time_left_s` trong scenario | Thay cho mốc bắt đầu: `time_left = time_left_s − tick/60` | Suy ra từ công thức contract |
| A16 | `--seed` | Bắt buộc; `--night` mặc định `1`, giá trị khác bị từ chối | Phase 1 chỉ có Đêm 1 |
| A17 | Scenario `motes` / `shades` | Nếu có thì **thay thế** danh sách ngẫu nhiên; nếu không và `random_* = false` thì rỗng | Đúng câu chữ contract "replace the initial lists" |
| A18 | ID Bóng Mực tự động | `S1`, `S2`, … theo thứ tự tạo; ID do scenario đặt không được có dạng `S<n>` | Tránh trùng ID |
| A19 | Đèn ban đầu sáng trong scenario | Có `deposited = lantern_cost`, không cộng điểm | Contract: pre-lit lantern không cho điểm thắp sáng |
