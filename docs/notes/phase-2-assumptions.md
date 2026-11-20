# Giả định và quyết định thiết kế Phase 2 (Ticket-02)

Ticket-02 có những chỗ không nói rõ. Dưới đây là lựa chọn của tôi, kèm lý do. Nếu giảng viên nói khác, lời giảng viên là cuối cùng.

| # | Chỗ chưa rõ | Giả định | Lý do / ảnh hưởng |
|---|---|---|---|
| A-P2-01 | Điều khiển trên không | Gia tốc ngang khi bay 20 m/s² (đất: 60 m/s²) | Ticket: "điều khiển trên không đầy đủ" nhưng không ghi số; chọn giá trị làm cảm giác khác biệt rõ |
| A-P2-02 | Tích phân nhảy | Nửa bước hình thang (trung bình vận tốc) thay vì Euler nửa bước | Đỉnh nhảy khớp v²/2g; Euler làm sai 0.06 m |
| A-P2-03 | Hướng nhìn khi đứng yên | Hướng lướt = hướng đang đi; đứng yên = hướng quay mặt lần cuối (mặc định +Z) | Ticket nói đúng như vậy |
| A-P2-04 | Bục nhảy và lướt | Vận tốc bục giữ nguyên khi bay; lướt trong lúc bay thay vận tốc ngang 0.2 s, sau đó vận tốc lướt được giữ | Ticket: phím di chuyển không ghi đè, nhưng vẫn được lướt |
| A-P2-05 | Đèn sẵn sáng trong scenario | Đèn `lit: true` không có `deposited` được tính đủ `lantern_cost`, không cộng điểm | Đúng nguyên tắc Phase 1 (A19) |
| A-P2-06 | Thứ tự tọa độ bục | Bục Đêm 2 hướng về tâm đảo kia (vector đơn vị từ bục đến tâm) | Ticket: "hướng về tâm đảo kia" |
| A-P2-07 | Đêm 3: tường và bậc | Đi bộ không leo bậc cao hơn 0.3 m; mép tầng là vách, bước ra thì rơi | Ticket: vách đứng không đi lên được |
| A-P2-08 | Đêm 3: điểm xuất phát | (0, 0, −10), ngoài tháp chuông bán kính 2 | Ticket không ghi; (0,0,0) nằm trong tháp |
| A-P2-09 | Điểm hồi sinh | Luôn là điểm xuất phát của Đêm (world.start), không phải vị trí scenario | Ticket: "hồi sinh ở điểm xuất phát" |
| A-P2-10 | Bóng Mực trôi | Bóng Mực giữ độ cao lúc sinh, không leo tầng; chỉ cần mặt đất ngay dưới không null | Ticket không nói; giữ luật "dy ≤ 1.5" có nghĩa khi Mây ở tầng cao hơn thì Bóng Mực không chạm |
| A-P2-11 | Lịch sinh Bóng Mực Đêm 2–3 | Cùng mốc 300 tick cho 2 con đầu, rồi theo chu kỳ 7 s (Đêm 2) và 6 s (Đêm 3), tối đa 8 và 10 | Ticket chỉ nêu chu kỳ và trần; mốc đầu lấy như Đêm 1 |
| A-P2-12 | Điểm sinh Bóng Mực | Chọn ngẫu nhiên (rng) một điểm trống cách Mây ≥ 15 m | Ticket ghi "≥ 15 m" cho Đêm 1; áp dụng cho mọi Đêm |
| A-P2-13 | Trần đom đóm | Trần 30 chỉ đếm đom đóm random, không đếm đom đóm rơi | Ticket không nói rõ |
| A-P2-14 | Bóng Mực wander | Đi về đèn tắt gần nhất; không còn đèn tắt thì đứng yên | Ticket v1.2 xác nhận "như trước" |
| A-P2-15 | Hết choáng | Về chase nếu Mây trong 12 m, ngược lại về wander | Ticket không nói |
| A-P2-16 | Bóng Mực bị đẩy vào vùng an toàn | Lực đẩy bị chặn khi đích nằm trong vùng an toàn | Giữ luật "không vào vùng an toàn" |
| A-P2-17 | Eject đèn vừa thắp | Chỉ đèn thắp trong tick đó đẩy Bóng Mực trong 6 m; đẩy đều trong 30 tick | Đúng câu chữ ticket |
| A-P2-18 | Đom đóm rơi khi bị đánh | Tọa độ rơi ngẫu nhiên trong vành 1.5–2.5 m (rng), TTL 480 tick | Ticket không ghi cách chọn điểm |
| A-P2-19 | Gió Lạc: vị trí sương | Điểm ngẫu nhiên trong 70% bán kính một đảo (rng) | Ticket: "điểm sương ngẫu nhiên" |
| A-P2-20 | Gió Lạc idle | Lượn quanh điểm neo bán kính 5 m với 2 m/s | Ticket: "lượn chậm 2 m/s" |
| A-P2-21 | Tỏa sáng trúng Gió Lạc khi đang đứng yên | Chuyển sang flee, không có đom đóm để thả | Ticket không nói cho trạng thái idle |
| A-P2-22 | Gió Lạc flee | Biến mất sau 240 tick, kể cả khi đang mang đom đóm đã cướp | Ticket: "biến mất cùng số đã cướp" |
| A-P2-23 | Gió Đêm 3 | Cơn đầu ở tick 1800; hướng chọn ngẫu nhiên khi bắt đầu báo trước; chỉ đẩy Mây | Ticket: "mỗi 30 s", không nói lần đầu |
| A-P2-24 | Rơi và đom đóm | Rơi làm mất toàn bộ đom đóm đang mang (ghi `lost`); trúng Bóng Mực ghi `lost: 0` | Trường `lost` mới của contract v1.1 |
| A-P2-25 | Bất tử và rơi | Rơi bỏ qua bất tử; sau hồi sinh có bất tử 90 tick | Đúng câu chữ ticket |
| A-P2-26 | Bộ đếm | Mọi bộ đếm lưu theo tick nguyên, không theo số thực | Tránh sai số; snapshot đổi ra giây, làm tròn 3 số |
| A-P2-27 | Snapshot `invuln`, `dash_cd_s`, `pulse_cd_s`, `charm_s` | Đơn vị giây | Tên trường kết thúc bằng `_s` |
| A-P2-28 | Trường `wind.warning` | Thêm vào snapshot để HUD báo trước | Contract không cấm trường thêm |
| A-P2-29 | Sự kiện `night_start` | Phát ở tick 1 của mỗi lần chạy | Contract v1.1 liệt kê sự kiện này nhưng không nói lúc nào |
| A-P2-30 | Điểm mỗi Đêm | `score` của headless là điểm một Đêm; tổng chiến dịch cộng ở web | Ticket: "tổng điểm game là tổng điểm các Đêm đã thắng" |
| A-P2-31 | Bùa khi đang được nhặt lại | Nhặt bùa đang hoạt động làm mới 600 tick | Ticket: "nhặt lại thì làm mới" |
| A-P2-32 | Lướt khi có Bùa Gió | Không đặt hồi chiêu; vẫn phải bấm lại nút | Ticket: "vẫn cần nhấn lại nút" |
| A-P2-33 | Thời điểm cảnh báo gió | Cảnh báo chỉ hiện trong 2 s trước cơn; cơn kéo dài đúng 5 s | Ticket |
| A-P2-34 | Scenario `drifters` mặc định | Không có Gió Lạc nếu scenario không khai báo và `random_drifters: false` | Giữ quy tắc Phase 1 "chỉ thực thể được liệt kê" |
| A-P2-35 | Scenario `wind_enabled` | Mặc định theo Đêm (chỉ Đêm 3 có gió) | Ticket |
