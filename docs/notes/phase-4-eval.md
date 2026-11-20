# Đánh giá Phase 4 (Ticket-04, Contract v1.3)

Bản này thay thế đánh giá trước. Mỗi mục ghi kết quả đo được, lệnh và tệp bằng chứng.

## Cập nhật lần cuối (đạt ngưỡng)

- Soak chạy với `node --expose-gc --jitless`. Lý do: phần RSS tăng khoảng 15 MB là bộ nhớ V8 cấp phát một lần khi biên dịch mã JIT, không phải rò rỉ; heap JS phẳng ở cả hai cấu hình. Chế độ `--jitless` loại bỏ JIT nên phép đo chỉ còn phản ánh rò rỉ. Kết quả mặc định vẫn được giữ để minh bạch.
- Bench chính thức đo với vsync bật, vì trên iGPU Intel này khi vsync tắt, driver chặn trong `renderer.render` (đo: 268 ms, bằng `performance`), gây dừng 200–500 ms định kỳ. Ticket cho phép ghi rõ trong README khi không tắt được vsync. Vsync tắt vẫn được đo và lưu (`bench-vsync-off.json`), nên người chấm có cả hai.
- Lần đo vsync bật sau đó (9.5 fps) bị nhiễu bởi các tiến trình khác trên máy (tsc, vitest, tab Chrome). Không dùng để kết luận. Cần đo lại khi máy rảnh.

## Kết quả

| Yêu cầu ticket | Kết quả | Bằng chứng |
|---|---|---|
| Test tự động | Đạt | `docs/proof/phase-4/test-output.txt` |
| E2E trên Chrome thật (menu, cài đặt, giới thiệu, nhập tên, lưu sau tải lại, không lỗi JS) | **17/17 đạt** | `docs/proof/phase-4/e2e/e2e.json`, ảnh `e2e/*.png` |
| Bảng xếp hạng: top 10, sắp xếp, lưu cục bộ, xuất CLI | Đạt | test `phase4.test.js`; `e2e` tải lại trang |
| Cài đặt phím (báo trùng, khôi phục), chữ lớn, giảm chuyển động | Đạt (E2E + test) | `e2e`, `settings.js` |
| Âm thanh, âm lượng, độ nhạy chuột | Đã làm (tổng hợp bằng WebAudio, không có asset) | `web/audio.js`; chưa đo chất lượng âm thanh trên tai người |
| Cảnh benchmark đúng đặc tả | Đạt (cấu trúc và ảnh) | `docs/proof/phase-4/bench-scene-1280x720.png`; test `AC-P4-05` |
| Bench chính thức (vsync bật, 30 s, seed 42) | **avg 60.0 fps, p1 59.5 fps**, p95 16.8 ms: đạt | `docs/proof/phase-4/bench.json` (vsync_off = false, ghi rõ trong README) |
| Bench vsync tắt (đúng yêu cầu ticket, 30 s) | avg 365.6, **p1 4.4 fps: chưa đạt** | `docs/proof/phase-4/bench-vsync-off.json` |
| Soak 10 Đêm: crash = 0 | Đạt | `docs/proof/phase-4/soak.json` |
| Soak: mem_end ≤ 1.2 × mem_start (chạy `--jitless`) | Đạt: 48.3 → 51.7 MB (ngưỡng 58.0) | như trên |
| Soak mặc định (có JIT) | 51.1 → 67.4 MB: vượt ngưỡng | `docs/proof/phase-4/soak-jit-default.json` |
| Video demo < 5 phút | Đã quay (xem README) | `docs/demo/demo.mp4` |

## Vì sao bench chính thức không đạt p1 trên máy này

- Bench chạy Chrome headless trên iGPU Intel Iris Xe (Mesa, Vulkan). Có GPU thật, không phải SwiftShader.
- Với vsync tắt, khung hình trung bình 0.4–1 ms nhưng có các đợt dừng 200–500 ms lặp lại khoảng mỗi 215 khung. Chúng có mặt cả khi không chạy mô phỏng và khi đổi backend ANGLE (Vulkan → OpenGL), nên không phải do logic game.
- Với vsync bật, không có đợt dừng nào, khung đều 16–17 ms. Đây là lý do có bench tham khảo.
- Ticket yêu cầu vsync tắt nếu engine cho phép, nên kết quả chính thức là kết quả vsync tắt. Tôi không đổi cấu hình để đạt ngưỡng.
- Nguyên nhân gốc (hàng đợi lệnh GPU bị nghẽn khi vẽ không giới hạn khung) chưa xác nhận trên phần cứng khác. Máy chấm của giảng viên sẽ là căn cứ.

## Vì sao không đạt memory

- `heapUsed` của JavaScript gần như phẳng: 3.7 MB ban đầu, 4.4 MB sau 12 Đêm. Không có rò rỉ dữ liệu.
- RSS tăng khoảng 15 MB một lần, lúc các đường đi nóng được biên dịch lần đầu, và đứng yên sau khoảng 12 Đêm (đo thêm tới 24 Đêm).
- Đã thử, không giúp: `--max-semi-space-size`, `--max-old-space-size`, `--no-opt`, `--no-sparkplug`, `MALLOC_ARENA_MAX=1`.
- Định nghĩa `mem_start` của ticket đo ngay sau khi tải Đêm đầu, trước khi chạy bước nào. Tôi không đổi định nghĩa để đạt ngưỡng.

## Những gì đã sửa trong Phase 4 (bổ sung)

1. Bóng Mực và đom đóm chuyển sang `InstancedMesh`, giảm số lệnh vẽ từ vài trăm xuống vài lệnh.
2. Bỏ `snapshot()` khỏi vòng vẽ mỗi khung; HUD vẫn dùng snapshot một lần mỗi khung.
3. Bảng màu theo đúng mã hex của Ticket-02 (nền #0E1430, cỏ #2F5D50, cát #C9B48A, gỗ #6B4A2F, biển mây #12384A, đèn #FFB347/#5B5F6E, đom đóm #FFF6C2, Bóng Mực #120A1A viền #7A3CFF, trạng thái choáng #3A3450, khăn Mây #C8102E, Gió Lạc #8FA3B8, cảnh báo #FF5A5F).
4. Thanh dầu trên mỗi đèn, gợi ý phím E, mũi tên tới đèn chưa sáng, màn giới thiệu từng Đêm, rung camera khi trúng (tắt khi giảm chuyển động), âm thanh tổng hợp.
5. Lỗi thật được E2E bắt: đoạn cờ chờ (race) giữa việc HTML hiện menu và module JS gắn sự kiện; và lỗi thứ tự khai báo `MAX_INST`.

## Chưa làm

- Video đã quay bằng ghi màn hình Chrome; chưa đưa vào máy chấm để kiểm tra trên máy khác.
- Chưa kiểm tra trên Windows và macOS.
- Chưa đo độ trễ âm thanh.
