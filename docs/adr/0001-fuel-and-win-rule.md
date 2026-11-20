# ADR 0001: Mô hình nhiên liệu đèn và luật thắng (Ticket-03)

Trạng thái: chấp nhận (Phase 3, Contract v1.2).

## Bối cảnh

Phase 2 cho thắp hết đèn là thắng ngay. Playtest cho thấy người chơi giỏi thắp đủ đèn trong 2 phút, thiếu căng thẳng cuối đêm. Ticket-03 đổi mục tiêu thành "giữ đảo sáng tới bình minh".

## Quyết định

1. **Đèn có nhiên liệu (fuel 0–100).** Đèn đang sáng hao 1 fuel/giây. Châm thêm bằng đom đóm (10 fuel mỗi đom đóm). Hết fuel thì đèn tắt và nhớ `ever_lit`.
2. **Đơn vị nội bộ là nguyên 1/60 fuel (`fuelU`).** Một tick hao đúng 1 đơn vị; Bóng Mực hút 5 đơn vị mỗi tick. Số thực chỉ xuất hiện khi làm tròn cho snapshot, nên không có sai số tích lũy qua hàng nghìn tick và kết quả tất định.
3. **Bóng Mực hút dầu qua trạng thái `drain`.** Bóng Mực đi tìm đèn sáng có fuel dưới 30 trước, đứng yên khi cách đèn ≤ 2 m và hút 5 fuel/giây. Nhiều con cộng dồn.
4. **Vùng an toàn phụ thuộc fuel.** Đèn dưới 30 không còn vùng 6 m. Đèn được châm lên từ 30 trở lên thì Bóng Mực trong 6 m bị đẩy ra.
5. **Thắng ở bình minh, không thắng sớm.** Thắng khi hết giờ, còn Ngọn Lửa và số đèn sáng ≥ ceil(0.6 × tổng đèn). Hết Ngọn Lửa luôn thua ngay.
6. **Sức chứa tăng theo số lần thắp thành công**, 10 + 2 mỗi lần, tối đa 20. Đây là cơ chế thưởng cho việc thắp đèn, không phải thưởng thời gian.

## Hệ quả

- Contract v1.2 đổi trường đèn (`fuel`, `ever_lit`, `relit_count`) và điểm (bỏ `per_second_left`). Đây là breaking change, ghi ở `CHANGELOG.md`.
- Test Phase 2 và Phase 1 kiểm tra thắng sớm và thưởng thời gian đã được cập nhật, có lý do ở `docs/notes/phase-3-test-changes.md`.
- Thứ tự một tick có thêm bước hao và hút dầu ở bước 2, và xét thắng/thua ở cuối (bao gồm tick bình minh).

## Phương án bị loại

- *Hao dầu theo số thực (float):* sai số tích lũy làm kết quả khác nhau giữa các máy, vi phạm tất định.
- *Cho Bóng Mực hút dầu khi đứng xa đèn:* không khớp "cách đèn ≤ 2 m" và làm khó đọc luật.
- *Giữ thưởng thời gian:* trái với "Thưởng thời gian: Bỏ" và khuyến khích thắp nhanh, ngược mục tiêu thiết kế.
