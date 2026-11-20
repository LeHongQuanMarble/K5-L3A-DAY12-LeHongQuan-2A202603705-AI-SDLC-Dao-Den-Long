# Nguồn, asset và công cụ

## Thư viện
- **three.js r160** (MIT), tải từ CDN `cdn.jsdelivr.net/npm/three@0.160.0` khi chạy trình duyệt. Không có bản sao trong repo.

## Asset
- Không dùng asset ngoài. Mọi hình khối (mặt đất, đèn, Bóng Mực, Mây, đom đóm, bùa) tạo bằng hình học của three.js trong `web/main.js`.
- Âm thanh (nhạc nền đêm và các tiếng hiệu ứng) được **tổng hợp bằng mã** trong `web/audio.js` (Web Audio API: dao động sin, tam giác, vuông, răng cưa và nhiễu). Không dùng file âm thanh ngoài, nên không có giấy phép âm thanh cần ghi.
- Biểu tượng ⚠ và mũi tên được vẽ bằng ký tự Unicode và CSS.
- Phông chữ: phông hệ thống (`system-ui`), không tải.
- Ảnh chụp và video demo (`docs/demo/demo.mp4`, `docs/proof/phase-4/`) là ghi màn hình từ chính game và từ slide bằng chứng do repo sinh ra.

## Công cụ AI
- Mã nguồn, test, tài liệu và bằng chứng do Claude Code (Claude Haiku 5.5) viết theo yêu cầu và kiểm chứng bằng test; xem `docs/notes/ai-log.md`.
- Âm thanh trong game do mã tổng hợp của AI sinh (xem trên).

## Nhân vật và bối cảnh
- Mây, Bóng Mực, Gió Lạc, Đảo Bến/Cau/Chuông và các đèn là bản gốc của lab.
