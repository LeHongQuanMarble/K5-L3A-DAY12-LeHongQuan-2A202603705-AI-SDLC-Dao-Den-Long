# Thay đổi test cũ khi áp dụng Ticket-03 (Contract v1.2)

Không test nào bị skip hay xóa im lặng. Mỗi thay đổi có lý do.

| Test | Thay đổi | Lý do |
|---|---|---|
| `tests/phase2.test.js` AC-P2-01 | Thời lượng 240/270/300; `per_mote` 10 → 5; bỏ `per_second_left` | Ticket-03 mục 3, 5 |
| `tests/phase2.test.js` AC-P2-07 "all lanterns lit wins" | Đổi thành "đủ đèn không kết thúc đêm" | Ticket-03 mục 3: không còn thắng sớm (kiểm tra đầy đủ ở AC-P3-08) |
| `tests/phase2.test.js` AC-P2-13 thời lượng | 240/270/300 | Ticket-03 mục 3 |
| `tests/phase2.test.js` AC-P2-13 điểm thắng | Thay bằng kiểm tra bỏ `per_second_left` | Ticket-03 mục 5; công thức mới ở AC-P3-21 |
| `tests/sim.test.js` "lighting all 5 lanterns wins" | Đổi thành "không thắng sớm" | Ticket-03 mục 3 |
| `tests/headless.test.js` "standing still until dawn" | 300 s → 240 s (18000 → 14400 tick) | Ticket-03 mục 3 |
| `tests/contract.test.js` | Phiên bản 1.2 | Ticket-03 mục 7 |
| `tests/phase2.test.js` AC-P2-15 (stun → chase) | Không đổi kiểm tra, nhưng hành vi mới là wander (AC-P3-19) | Giữ nguyên test cũ vì nó chỉ kiểm tra trạng thái không còn stunned |
