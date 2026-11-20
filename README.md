# Đảo Đèn Lồng

> Game 3D góc nhìn thứ ba, làm cho lab **Day 12 · AI SDLC**. Cá nhân, 1 MSSV.
> **Video demo:** chưa có (sẽ đặt ở đầu README khi làm xong Phase 4).

**Trạng thái:** Phase 1 (PRD-0 · Đêm 1 "Đảo Bến") — tag `phase-1`.

## Mô tả

Mây, một đứa trẻ giữ đèn, đứng trên một hòn đảo nổi giữa đêm. Mây gom đom đóm để thắp 5 **Đèn Lồng Lớn**, và phải né **Bóng Mực** đang đuổi trong sương. Thắp đủ 5 đèn là thắng. Hết ngọn lửa (HP) hoặc hết đêm (bình minh) là thua.

## Cài đặt và chạy (tối đa 3 lệnh)

Cần Node.js 20 trở lên. Không cần `npm install` vì không có phụ thuộc cài đặt; three.js tải từ CDN, nên cần internet.

```bash
git clone https://github.com/LeHongQuanMarble/K5-L3A-DAY12-LeHongQuan-2A202603705-AI-SDLC-Dao-Den-Long.git
cd K5-L3A-DAY12-LeHongQuan-2A202603705-AI-SDLC-Dao-Den-Long
npm start        # rồi mở http://127.0.0.1:8080/?seed=7
```

Chạy test: `npm test`. Kiểm tra cú pháp: `npm run check`. Tái tạo bằng chứng: `npm run evidence`.

## Điều khiển

| Phím | Tác dụng |
|---|---|
| W A S D | Di chuyển (theo hướng camera) |
| ← / → | Xoay camera |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn gần nhất (cần trong 2 m) |
| F | Tỏa sáng: đốt 1 đom đóm, choáng Bóng Mực trong 4 m, đẩy lùi 2 m, hồi chiêu 2 s |
| R | Chơi lại (seed ngẫu nhiên) |

Tham số `?seed=<số nguyên>` trên URL để chơi lại đúng một ván.

## Tính điểm

- Mỗi đom đóm nạp vào đèn: **10** điểm.
- Mỗi đèn sáng: **100** điểm.
- Mỗi Bóng Mực bị choáng (lần đầu trong một lần tỏa sáng): **25** điểm.
- Thắng: cộng **5** điểm cho mỗi giây còn lại và **50** điểm cho mỗi ngọn lửa còn lại.

## Chế độ headless và Test Contract

Hợp đồng nằm ở [`game.contract.json`](game.contract.json) (Test Contract v1.0). Mọi con số dùng trong game nằm ở [`src/tuning.js`](src/tuning.js); test `tests/contract.test.js` bắt buộc hai nơi phải khớp.

```bash
node bin/headless.js --seed 1 --night 1 --ticks 600 --out run.jsonl \
  [--scenario scenarios/win-by-deposit.json] [--inputs inputs/deposit-win.json] \
  [--snapshot-every 10]
```

- 60 tick/s, không cần cửa sổ. Exit code `0` khi chạy xong, `1` khi gọi sai, `2` khi scenario hoặc inputs sai định dạng.
- Đầu ra JSONL gồm dòng `snapshot` (tick 0 rồi mỗi `--snapshot-every` tick), dòng `event` (`{"type":"event","tick","name","data"}`), và dòng `end` cuối cùng.
- Cùng seed + scenario + inputs cho ra đầu ra giống hệt từng byte.

Thư mục `scenarios/` và `inputs/` có các kịch bản mẫu; xem [`docs/proof/phase-1/evidence.md`](docs/proof/phase-1/evidence.md).

## Kiểm chứng

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| AC-1..8 luật chơi | 24 test đơn vị + tích hợp trong `tests/sim.test.js` | [test-output.txt](docs/proof/phase-1/test-output.txt) | Đạt (39/39 test) |
| AC-9..10 headless & exit code | `tests/headless.test.js` và chạy CLI thật | [evidence.md](docs/proof/phase-1/evidence.md) | Đạt |
| AC-11 tất định | Chạy hai lần, so sha256 | [evidence.md](docs/proof/phase-1/evidence.md), `runs/` | Đạt (6/6 run) |
| AC-12 trình duyệt | Chụp ảnh headless Chrome, xem scene 3D và HUD | [web-load-seed7.png](docs/proof/phase-1/web-load-seed7.png) | Hiển thị đạt; **thao tác phím trong trình duyệt chưa kiểm chứng tự động** |

Chạy lại toàn bộ: `npm test && npm run evidence`.

## Cấu trúc

```text
src/tuning.js        con số của game (nguồn duy nhất) + điểm
src/sim.js           lõi mô phỏng: createGame, step, snapshot (không phụ thuộc hiển thị)
src/scenario.js      kiểm tra scenario / inputs, ném MalformedError
src/headless.js      chạy mô phỏng và tạo JSONL
src/cli.js           phân tích tham số, exit code
bin/headless.js      điểm vào CLI
web/                 bản trình duyệt (three.js r160): index.html, main.js
scripts/serve.js     máy chủ tĩnh cho web/
scripts/evidence.js  tạo docs/proof/phase-1/
tests/               test (node:test)
specs/phase-1/       spec và tasks theo Spec Kit
docs/notes/          giả định, nhật ký dùng AI, đánh giá phase
docs/proof/phase-1/  bằng chứng đã tạo
AGENTS.md            hướng dẫn cho agent AI trong repo này
```

## Sáng tạo của tôi

Chưa có ở Phase 1. Phần lõi (đúng PRD-0 và Test Contract) được làm trước, theo hướng dẫn của lab.

## Giấy phép và nguồn

Mã nguồn theo [LICENSE](LICENSE) (MIT). Nguồn và giấy phép của thư viện, asset: [CREDITS.md](CREDITS.md).
