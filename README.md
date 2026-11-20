# Đảo Đèn Lồng

> Game 3D góc nhìn thứ ba, làm cho lab **Day 12 · AI SDLC**. Cá nhân, 1 MSSV.
> **Video demo:** chưa có (sẽ đặt ở đầu README khi làm xong Phase 4).

**Trạng thái:** Phase 2 (Ticket-02 · "Ba hòn đảo", Test Contract v1.1). Tag `phase-1` là Đêm 1 cũ (Contract v1.0). Phase 3 và 4 chưa làm.

## Mô tả

Mây, một đứa trẻ giữ đèn, đứng trên các hòn đảo giữa đêm sương. Mây gom đom đóm để thắp Đèn Lồng Lớn và phải né, hoặc tỏa sáng xua, Bóng Mực. Phase 2 có ba Đêm:

| Đêm | Đảo | Thời gian | Đèn | Đặc điểm |
|---|---|---|---|---|
| 1 | Đảo Bến | 300 s | 5 | đảo tròn, đom đóm, Bóng Mực |
| 2 | Đảo Cau | 330 s | 6 | hai đảo, cầu tre, bục nhảy, Gió Lạc, Bùa Gió |
| 3 | Đảo Chuông | 360 s | 7 | ba tầng, dốc, vách, tháp, gió mạnh, Gió Lạc, Bùa Gió |

Thắp đèn không kết thúc đêm. Đêm thắng khi Mây còn sống lúc trời sáng và số đèn đang sáng đạt ngưỡng (Ticket-02: đủ thắp; Ticket-03 sẽ đổi luật này).

## Cài đặt và chạy (tối đa 3 lệnh)

Cần Node.js 20 trở lên. Không cần `npm install` vì không có phụ thuộc cài đặt; three.js tải từ CDN, nên cần internet.

```bash
git clone https://github.com/LeHongQuanMarble/K5-L3A-DAY12-LeHongQuan-2A202603705-AI-SDLC-Dao-Den-Long.git
cd K5-L3A-DAY12-LeHongQuan-2A202603705-AI-SDLC-Dao-Den-Long
npm start        # rồi mở http://127.0.0.1:8080/?seed=7
```

Chạy test: `npm test`. Kiểm tra cú pháp: `npm run check`. Tái tạo bằng chứng: `npm run evidence`. Sinh lại contract từ số liệu: `npm run contract`.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| W A S D | Di chuyển (theo hướng camera) |
| ← / → | Xoay camera |
| Space | Nhảy |
| Shift | Lướt (14 m/s, 0.2 s, hồi chiêu 1.5 s) |
| E | Nạp đom đóm vào đèn gần nhất (trong 2 m); đèn chưa sáng |
| F | Tỏa sáng: 3 đom đóm, choáng Bóng Mực trong 5 m trong 2 s, đẩy lùi 4 m |
| Esc / P | Tạm dừng |
| R | Chơi lại chiến dịch từ Đêm 1 |

Tham số `?seed=<số nguyên>` trên URL để chơi lại đúng một ván.

## Tính điểm (Contract v1.1)

- Mỗi đom đóm nạp vào đèn: **10** điểm.
- Mỗi đèn thắp lần đầu: **100** điểm.
- Mỗi Bóng Mực trúng Tỏa Sáng: **5** điểm (mỗi con, mỗi lần).
- Thắng: **floor(giây còn lại) × 2** và **50** điểm cho mỗi Ngọn Lửa còn lại.
- Tổng điểm chiến dịch là tổng điểm các Đêm đã thắng (hiển thị trên web).

## Chế độ headless và Test Contract

Hợp đồng nằm ở [`game.contract.json`](game.contract.json) (Test Contract v1.1). Số liệu nằm ở [`src/tuning.js`](src/tuning.js); test `tests/contract.test.js` bắt buộc hai nơi khớp. Đổi bản đồ ở [`src/world.js`](src/world.js).

```bash
node bin/headless.js --seed 1 --night 1 --ticks 600 --out run.jsonl \
  [--scenario scenarios/win-by-deposit.json] [--inputs inputs/deposit-win.json] \
  [--snapshot-every 10]
```

- `--night 1|2|3`. 60 tick/s, không cần cửa sổ. Exit code `0` khi chạy xong, `1` khi gọi sai, `2` khi scenario hoặc inputs sai định dạng.
- Đầu ra JSONL gồm dòng `snapshot`, dòng `event` (`{"type":"event","tick","name","data"}`), và dòng `end` cuối cùng.
- Cùng seed, scenario và inputs cho ra đầu ra giống hệt từng byte.

Scenario và inputs mẫu nằm trong `scenarios/` và `inputs/`. Bằng chứng: [`docs/proof/phase-2/evidence.md`](docs/proof/phase-2/evidence.md).

## Kiểm chứng

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Ticket-02 luật Phase 2 (AC-P2-01..20) | 54 test trong `tests/phase2.test.js` | [test-output.txt](docs/proof/phase-2/test-output.txt) | Đạt |
| Test Phase 1 đã sửa theo v1.1 | `tests/sim.test.js`, `tests/headless.test.js` | [phase-2-test-changes.md](docs/notes/phase-2-test-changes.md) | Đạt, có lý do từng thay đổi |
| Headless tất định, exit code | 11 lần chạy CLI thật, chạy hai lần so sha256 | [evidence.md](docs/proof/phase-2/evidence.md) | Đạt |
| Đêm 2 và 3 chạy đủ trong ≤ 30 s | Đo thời gian một đêm đầy đủ | [evidence.md](docs/proof/phase-2/evidence.md) | Đạt (khoảng 0.1 s) |
| Trình duyệt: ba Đêm, HUD, phím | Chưa kiểm trên trình duyệt | — | **Chưa kiểm chứng** |
| Menu, cài đặt, âm thanh, bảng màu chuẩn | Chưa làm | — | **Chưa làm** (xem [phase-2-eval.md](docs/notes/phase-2-eval.md)) |
| FPS ≥ 30 ở 1280×720 | Chưa đo | — | **Chưa đo** |

## Cấu trúc

```text
src/tuning.js        con số của game (nguồn duy nhất) + điểm
src/world.js         bản đồ ba Đêm: mặt đất, tầng, dốc, cầu, bục, điểm sinh
src/sim.js           lõi mô phỏng (không phụ thuộc hiển thị)
src/scenario.js      kiểm tra scenario / inputs, ném MalformedError
src/headless.js      chạy mô phỏng và tạo JSONL
src/cli.js           phân tích tham số, exit code
bin/headless.js      điểm vào CLI
web/                 bản trình duyệt (three.js r160): index.html, main.js
scripts/serve.js     máy chủ tĩnh cho web/
scripts/evidence.js  tạo docs/proof/phase-2/
scripts/write-contract.js  sinh game.contract.json từ tuning
tests/               test (node:test)
specs/phase-1/, specs/phase-2/   spec và tasks theo Spec Kit
docs/notes/          giả định, thay đổi test, nhật ký AI, đánh giá phase
docs/proof/phase-1/, docs/proof/phase-2/   bằng chứng đã tạo
CHANGELOG.md         thay đổi phá vỡ tương thích theo phase
AGENTS.md            hướng dẫn cho agent AI trong repo này
```

## Sáng tạo của tôi

Chưa có. Phần lõi (đúng ticket và Test Contract) được làm trước, theo hướng dẫn của lab.

## Giấy phép và nguồn

Mã nguồn theo [LICENSE](LICENSE) (MIT). Nguồn và giấy phép của thư viện, asset: [CREDITS.md](CREDITS.md).
