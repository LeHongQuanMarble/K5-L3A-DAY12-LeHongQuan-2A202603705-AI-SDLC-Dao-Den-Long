# Spec Phase 3: Ticket-03 "Đèn cạn dầu" (Contract v1.2)

Nguồn: Ticket-03 (Change Request). Quyết định thiết kế: `docs/adr/0001-fuel-and-win-rule.md`. Giả định: `docs/notes/phase-3-assumptions.md`.

| Mã | Yêu cầu (rút gọn) | Test |
|---|---|---|
| AC-P3-01 | Số liệu v1.2: fuel 100, hao 1/s, 10 fuel/đom đóm, relight 5, thắng 0.6, hút 5/s, ngưỡng 30, sức chứa tối đa 20; điểm 5/40/10/50/1/50 | `AC-P3-01` |
| AC-P3-02 | Đèn sáng hao 1 fuel/giây | `AC-P3-02` |
| AC-P3-03 | Châm dầu: used = min(mang, ceil((100−fuel)/10)); +5 điểm mỗi đom đóm | `AC-P3-03` |
| AC-P3-04 | Đèn đầy dầu không được chọn khi tương tác | `AC-P3-04` |
| AC-P3-05 | Hết dầu: đèn tắt, deposited = 0, ever_lit, sự kiện lantern_out | `AC-P3-05` |
| AC-P3-06 | Thắp lại cần 5 (đã từng sáng), +40 điểm; chưa từng sáng cần 10, +100 | `AC-P3-06` |
| AC-P3-07 | Sức chứa 10 + 2 × lần thắp thành công, tối đa 20; đèn đặt sẵn không tính | `AC-P3-07` |
| AC-P3-08 | Đủ đèn không kết thúc đêm (không thắng sớm) | `AC-P3-08` |
| AC-P3-09 | Hết giờ, còn sống và đủ đèn: thắng dawn_survived; thưởng đèn sáng 50 + floor(fuel), mỗi Ngọn Lửa 50 | `AC-P3-09` |
| AC-P3-10 | Ngưỡng 3/5, 4/6, 5/7; thiếu đèn thua dawn; hết Ngọn Lửa ở tick cuối vẫn thua no_flames | `AC-P3-10` |
| AC-P3-11 | Thời lượng 240/270/300 s | `AC-P3-11` |
| AC-P3-12 | Bóng Mực đi lang thang tìm đèn yếu (<30) trước đèn tắt | `AC-P3-12` |
| AC-P3-13 | Hút dầu khi cách đèn ≤ 2 m: 5/s, cộng dồn, đứng yên | `AC-P3-13` |
| AC-P3-14 | Sự kiện fuel_drain mỗi 60 tick khi đang hút | `AC-P3-14` |
| AC-P3-15 | Thoát drain: chase khi Mây ≤ 6 m; wander khi đèn tắt hoặc Bóng Mực cách đèn > 2 m | `AC-P3-15` |
| AC-P3-16 | Đèn dưới 30 mất vùng an toàn; 30 trở lên thì còn | `AC-P3-16` |
| AC-P3-17 | Châm đèn lên từ 30 trở lên đẩy Bóng Mực trong 6 m ra | `AC-P3-17` |
| AC-P3-18 | Tỏa sáng trúng Bóng Mực đang hút: tổng 15 điểm | `AC-P3-18` |
| AC-P3-19 | Hết choáng về wander | `AC-P3-19` |
| AC-P3-20 | Điểm nạp 5 mỗi đom đóm, thắp lần đầu 100 | `AC-P3-20` |
| AC-P3-21 | Thưởng kết thúc đêm đúng công thức | `AC-P3-21` |
| AC-P3-22 | Snapshot v1.2: fuel (1 chữ số), ever_lit, relit_count, capacity, trạng thái drain | `AC-P3-22` |
| AC-P3-23 | Scenario: đèn sáng không có fuel thì 100; ever_lit mặc định theo lit | `AC-P3-23` |
| AC-P3-24 | Tất định khi có hút dầu | `AC-P3-24` |

Bằng chứng headless: `docs/proof/phase-3/evidence.md` (các kịch bản P3-R4 hút dầu, P3-R5 châm dầu, P3-R6 thắp lại).
Web: thanh dầu và đèn nhấp nháy khi dưới 30; đèn tắt xẹp 20% có vết rách; bảng màu dễ phân biệt lưu trong `localStorage` (có try/catch).
