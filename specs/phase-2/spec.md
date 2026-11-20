# Spec Phase 2: Ticket-02 "Ba hòn đảo" (Contract v1.1)

Nguồn: Ticket-02 do giảng viên phát hành. Bản này liệt kê tiêu chí nghiệm thu (AC-P2-*) và test tương ứng trong `tests/phase2.test.js`.
Số liệu lấy đúng từ Phần 1 của ticket và được đặt duy nhất trong `src/tuning.js`; `game.contract.json` sinh từ đó (`npm run contract`).

| Mã | Yêu cầu (rút gọn) | Test / bằng chứng |
|---|---|---|
| AC-P2-01 | Số liệu chuẩn: tốc độ 6, nhảy 7, trọng lực 20, lướt 14/0.2/1.5, sức chứa 10, đèn 10, tỏa sáng 3/5/3, đẩy 4 m, vùng an toàn 6, Bóng Mực 4.0 (Đêm 3: 4.5), thời gian 300/330/360 s, điểm chuẩn hóa | `AC-P2-01 tuning...` |
| AC-P2-02 | Tăng tốc đạt tốc độ đi bộ trong ≤ 0.1 s | `AC-P2-02` |
| AC-P2-03 | Nhảy đỉnh ≈ v²/2g = 1.225 m, chỉ nhảy khi chạm đất | `AC-P2-03` |
| AC-P2-04 | Lướt 14 m/s trong 0.2 s, hồi chiêu 1.5 s tính từ lúc bắt đầu lướt, không bất tử | `AC-P2-04` |
| AC-P2-05 | Nhặt: XZ ≤ 1.0 và chênh cao ≤ 1.5; sức chứa 10; 20 đom đóm lúc đầu, trần 30, sinh thêm tại tick 240k | `AC-P2-05` |
| AC-P2-06 | Nạp đèn: 10 đom đóm, nạp nhiều lần, chọn đèn gần nhất trong 2.0 m, bằng nhau lấy id nhỏ | `AC-P2-06` |
| AC-P2-07 | Thắp đủ đèn là thắng ngay (kể cả đúng tick hết giờ) | `AC-P2-07` |
| AC-P2-08 | Bóng Mực: 2 con ở tick 300, sau đó mỗi 480 tick; phát hiện 12 m, bỏ đuổi 18 m; tên trạng thái theo v1.1 | `AC-P2-08` |
| AC-P2-09 | Tỏa sáng: chi phí 3, bán kính 5 m 3D từ tâm (chân + 0.8), hồi 3 s, choáng 120 tick, đẩy 4 m trong 15 tick đầu, +5 điểm mỗi lần trúng | `AC-P2-09` |
| AC-P2-10 | Vùng an toàn 6 m quanh đèn đã sáng; Bóng Mực trong vùng khi đèn vừa thắp bị đẩy ra trong ≤ 30 tick, không gây sát thương | `AC-P2-10` |
| AC-P2-11 | Chạm: XZ ≤ 1.0 và chênh cao ≤ 1.5; −1 Ngọn Lửa; rơi floor(mang/2); bất tử 90 tick; Bóng Mực lùi 2 m trong 60 tick | `AC-P2-11` |
| AC-P2-12 | Rơi khỏi đảo (Y < −10): đúng 1 lần, bỏ qua bất tử, −1 Ngọn Lửa, mất đom đóm, chờ 60 tick rồi hồi sinh tại điểm xuất phát | `AC-P2-12` |
| AC-P2-13 | Thời gian 300/330/360 s; hết Ngọn Lửa thua ngay; hết giờ và chưa đủ đèn thua (dawn); điểm thắng = floor(giây còn lại)×2 + 50×Ngọn Lửa | `AC-P2-13` |
| AC-P2-14 | Đêm 2: hai đảo bán kính 28, cầu tre, hai bục nhảy (14 m/s dọc, 24 m/s ngang), 6 đèn | `AC-P2-14` |
| AC-P2-15 | Đêm 3: đáy/vành/đĩa/tháp, vách đứng, hai dốc 30° và 150°, bục (0,3,13) bắn lên tầng 2, 7 đèn | `AC-P2-15` |
| AC-P2-16 | Gió Đêm 3: báo trước 2 s, thổi 5 s, 2 m/s, mỗi 30 s; không có gió ở Đêm 1–2 | `AC-P2-16` |
| AC-P2-17 | Gió Lạc: idle → chase (≥5 đom đóm và ≤15 m) → cướp min(3, mang) → flee 240 tick; tối đa 2 con; sinh tại tick 1200k | `AC-P2-17` |
| AC-P2-18 | Bùa Gió: 600 tick, chạy 7.2 m/s, lướt không hồi chiêu; xuất hiện lại sau 2700 tick | `AC-P2-18` |
| AC-P2-19 | Tạm dừng: tick vẫn tăng, sim_tick/thời gian/hồi chiêu/spawn/TTL đứng yên; snapshot ghi state "paused" | `AC-P2-19` |
| AC-P2-20 | Tất định Đêm 2–3; snapshot v1.1 đủ trường bắt buộc; tọa độ tối đa 3 chữ số thập phân | `AC-P2-20` |

Thứ tự xử lý trong một tick (khớp Ticket-02): input/pause → bộ đếm → di chuyển Mây (nhảy, lướt, bục, gió) và rơi → nhặt → đèn → vùng an toàn → tỏa sáng → Bóng Mực và Gió Lạc → chạm (Gió Lạc trước) → sinh theo lịch → thắng/thua.

Quyết định thiết kế và giả định: xem `docs/notes/phase-2-assumptions.md`. Thay đổi test Phase 1 và lý do: `docs/notes/phase-2-test-changes.md`. Breaking changes: `CHANGELOG.md`.
