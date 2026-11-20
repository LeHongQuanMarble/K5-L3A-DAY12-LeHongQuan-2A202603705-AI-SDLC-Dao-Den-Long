# Token và chi phí theo phase

**Quan trọng:** không đo được số token chính xác từ các phiên làm việc. Cột "Mức tương đối" là đánh giá định tính theo việc đã làm trong phase (đọc tài liệu, viết lại file lớn, số lần chạy lại), không phải số đo. Các cột "Commit" và "Test" đếm được từ git và `npm test`.

| Phase | Commit | Test khi kết thúc phase | Mức token tương đối | Việc tốn token nhiều nhất | Cách tiết kiệm đã làm |
|---|---|---|---|---|---|
| 1 (Đêm 1) | 8 (`814223c`…`2a194ba`) | 38 | Cao | Đọc PRD-0 và contract, viết spec, sim, web và bằng chứng từ đầu | Test đỏ trước, bằng chứng sinh bằng script, không mô tả bằng lời |
| 2 (ba Đêm) | 2 | 93 | Cao | Đọc ticket, sửa 6 test cũ, nhiều lần sửa lỗi đơn vị giây và tick | Chạy riêng `tests/phase2.test.js` trước khi chạy cả bộ |
| 3 (đèn cạn dầu) | 1 | 131 | Trung bình đến cao | Viết lại `src/sim.js` cho v1.2 | Đọc lại file trước khi ghi đè; test trước |
| 4 (phát hành) | 5 | 153 | Cao | Bench và soak lặp nhiều lần, E2E trên Chrome, quay video | Đo bằng script, lưu JSON thay vì mô tả; chạy lại chỉ phần liên quan |

## Lãng phí đã nhận ra

- Viết lại toàn bộ `src/sim.js` ở Phase 2, 3 và 4, và `web/main.js` hai lần, trong khi chỉ đổi vài dòng. Lần sau dùng sửa cục bộ.
- Đọc lại tài liệu lab nhiều lần. Retro ghi nhận: đọc đề bốn lần là một phần lớn của token.

Nếu có số liệu thật từ thống kê sử dụng của tài khoản, thay vào các ô "Mức tương đối" tương ứng.
