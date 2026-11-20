# Đánh giá Phase 2 (Ticket-02, Contract v1.1)

## Đã kiểm chứng (có bằng chứng)

- **Lõi mô phỏng:** 54 test trong `tests/phase2.test.js` (một test cho mỗi AC-P2-*, trừ AC-P2-01 và AC-P2-20 gom nhiều kiểm tra). Cộng với 39 test sim/headless/contract đã sửa theo `phase-2-test-changes.md`. Tổng 93/93 đạt (`docs/proof/phase-2/test-output.txt`).
- **Headless:** 11 lần chạy CLI thật trong `docs/proof/phase-2/evidence.md`, cả 11 đều exit 0 và tất định (hai lần chạy cho sha256 giống nhau). Đầy đủ một Đêm 2 hoặc Đêm 3 mất khoảng 0.1 s, xa giới hạn 30 s của Contract.
- **Bục nhảy Đêm 2:** lần chạy R4 chỉ cho thấy trạng thái đứng yên trên bục; việc bay tới đảo B được kiểm bằng test `AC-P2-14 Night 2 jump pad`, không có bằng chứng trạng thái từng tick trong JSONL.

## Chưa đạt hoặc chưa kiểm chứng

- **Menu chính, màn giới thiệu Đêm, cài đặt (âm lượng, độ nhạy chuột lưu giữa các lần mở), âm thanh (nhạc nền và hiệu ứng):** chưa làm. Đây là các mục của Ticket-02 phần 3 và DoD. Không có bằng chứng cho các mục này.
- **Bảng màu chuẩn:** màu trong `web/main.js` lấy gần đúng từ bảng, chưa đối chiếu sai lệch 10% mỗi kênh.
- **Trình duyệt:** không mở game trong Chrome trong phiên này, nên không kiểm được hiển thị ba Đêm, HUD mới, phím Shift/Esc, chuỗi Đêm 1→2→3.
- **FPS ≥ 30 ở 1280×720:** chưa đo.
- **Skill và hook:** DoD yêu cầu cập nhật skill; chưa tạo skill mới (chỉ cập nhật AGENTS.md).
- **Hiệu chỉnh cảm giác:** gia tốc trên không (A-P2-01) và các thời điểm xuất hiện Bóng Mực Đêm 2–3 (A-P2-11) là giả định, chưa thử chơi thật.

## Điều đã học (cho phase sau)

1. Hầu hết lỗi trong lần chạy đầu là lỗi đơn vị và thứ tự xử lý, không phải lỗi luật: timer tính bằng giây bị so sánh với tick; cạnh nhấn nút tính sai vì cập nhật `prevButtons` quá sớm; hai lần `scenario.deposited` bị bỏ qua. Bộ test đỏ-trước bắt được cả ba.
2. Một test sai đơn vị (kỳ vọng 84 tick, sim cho 79) được sửa theo sim, sau khi kiểm tra lại đặc tả: cooldown tính từ lúc bắt đầu lướt. Không phải lỗi luật.
3. Test nhiều bước với nhân vật đứng trên bùa dễ sai: bùa xuất hiện lại sẽ được nhặt ngay. Phải đưa nhân vật đi chỗ khác trong test.
4. Tích phân Euler nửa bước làm đỉnh nhảy sai 0.06 m; đổi sang hình thang đúng với gia tốc hằng.
5. Điểm hồi sinh phải là điểm xuất phát của Đêm, không phải vị trí scenario đã đặt cho việc kiểm thử. Lỗi này làm Mây rơi lần hai.

## Token và chi phí (ước tính thô)

- Phiên này dùng một model, không dùng subagent. Lượng lớn nằm ở đọc ticket và viết `src/sim.js` (~550 dòng), `src/world.js` (~150 dòng), `tests/phase2.test.js` (~540 dòng).
- Không đo được số token chính xác từ phiên làm việc.
