# Đánh giá Phase 4 (Ticket-04, Contract v1.3)

## Đã kiểm chứng (có bằng chứng)
- 152/152 test (`docs/proof/phase-4/test-output.txt`), gồm bảng xếp hạng, CLI xuất bảng (chạy thật), cảnh bench, cài đặt phím, công thức chỉ số bench.
- Bench chạy đầu cuối trong Chrome headless qua DevTools: `bench.json` (30 s, seed 42). Cảnh bench đúng đặc tả, ảnh tại `docs/proof/phase-4/bench-scene-1280x720.png`.
- Soak 10 Đêm headless: `soak.json`, 0 crash, 10 kết quả.

## Chưa đạt (ghi trung thực)
| Mục | Kết quả | Nguyên nhân |
|---|---|---|
| avg_fps ≥ 60 | **1.9** (bench.json, trên SwiftShader) | Render bằng CPU trong sandbox, không có GPU. Không đo được trên GPU ở đây. Máy chấm sẽ đo lại. |
| p1_low_fps ≥ 30 | **0.1** | Như trên |
| load_ms ≤ 10000 | 3168 ms | Đạt |
| soak: mem_end ≤ 1.2 × mem_start | **66.6 ≤ 61.3? Không đạt** (51.1 → 66.6 MB) | Bộ nhớ tăng ở các Đêm đầu rồi đứng yên (khoảng 63 MB sau 12 Đêm, đo thêm 24 Đêm). Đây là khởi động JIT, không phải rò rỉ tuyến tính; nhưng vẫn vượt ngưỡng. Không đổi định nghĩa `mem_start` để đạt ngưỡng. |
| Trình duyệt: menu, đổi phím, nhập tên, chữ lớn, mũi tên | Chưa kiểm trên tay | Đã viết, `node --check` đạt, chưa mở và thao tác |
| Âm thanh | Chưa làm | Ghi trong A-P4-11 |
| Video demo | Chưa làm | Không có ghi màn hình trong phiên |
| GitHub Release v1.0.0 | Chưa tải lên | Cần xác nhận của bạn (công khai) |

## Điều học được
1. Chi phí của cảnh bench nằm ở số đối tượng: mỗi Bóng Mực tạo geometry và material riêng làm chậm rõ rệt. Đổi sang dùng chung làm bước tiến thực sự nhưng vẫn chưa đủ khi render bằng CPU.
2. Đo bộ nhớ phải ép GC trước; không ép thì số đo dao động ±10%.
3. Khi thêm `bench` vào sim, phải đảm bảo CLI headless không đổi (kiểm bằng evidence Phase 3 không đổi).
4. Có một lỗi thật bị phát hiện bởi test: `parseSettings` cho phép hai hành động cùng một phím sau khi tải từ bộ nhớ. Đã thêm kiểm tra.
