# Bằng chứng Phase 3 (sinh tự động bởi `npm run evidence`)

Mỗi dòng: một lần chạy CLI headless thật, chạy hai lần và so sha256. Cột `deterministic` = `yes` nghĩa là hai lần cho byte giống nhau. Bằng chứng Phase 1 và Phase 2 nằm ở `docs/proof/phase-1/` và `docs/proof/phase-2/` (theo tag).

| Run | Yêu cầu | Lệnh | Exit | State | Ticks | Điểm | Lý do kết thúc | Deterministic | sha256 (16 ký tự đầu) | Sự kiện |
|---|---|---|---|---|---|---|---|---|---|---|
| P3-R1-night1-full | AC-P3-11, AC-P3-08 (không thắng sớm) | `node bin/headless.js --seed 1 --night 1 --ticks 14400 --snapshot-every 3600 --out P3-R1-night1-full.jsonl` | 0 | lost | 14400 | 0 | dawn | yes | `ca42aaff0b505563` | night_start×1, shade_spawned×6, game_over×1 |
| P3-R2-night2-full | AC-P3-11 | `node bin/headless.js --seed 7 --night 2 --ticks 16200 --snapshot-every 3600 --out P3-R2-night2-full.jsonl` | 0 | lost | 16200 | 0 | dawn | yes | `45e3cd9eaf903f1e` | night_start×1, shade_spawned×8, game_over×1 |
| P3-R3-night3-full | AC-P3-11, AC-P3-16 | `node bin/headless.js --seed 7 --night 3 --ticks 18000 --snapshot-every 3600 --out P3-R3-night3-full.jsonl` | 0 | lost | 9575 | 0 | no_flames | yes | `b1d8b530a259ddb7` | night_start×1, shade_spawned×10, player_hit×3, game_over×1 |
| P3-R4-drain-night1 | AC-P3-13, AC-P3-14 (hút dầu) | `node bin/headless.js --seed 1 --night 1 --ticks 240 --snapshot-every 60 --scenario scenarios/p3-drain-night1.json --out P3-R4-drain-night1.jsonl` | 0 | playing | 240 | 0 | - | yes | `efaa668738be0a80` | night_start×1, fuel_drain×3, lantern_out×1 |
| P3-R5-refuel-night1 | AC-P3-03 (châm dầu) | `node bin/headless.js --seed 1 --night 1 --ticks 120 --snapshot-every 60 --scenario scenarios/p3-refuel-night1.json --inputs inputs/p3-interact-tick0.json --out P3-R5-refuel-night1.jsonl` | 0 | playing | 120 | 15 | - | yes | `3dd5789b24dcfade` | night_start×1, refuel×1 |
| P3-R6-relight-night1 | AC-P3-06 (thắp lại 5 đom đóm) | `node bin/headless.js --seed 1 --night 1 --ticks 120 --snapshot-every 60 --scenario scenarios/p3-relight-night1.json --inputs inputs/p3-interact-tick0.json --out P3-R6-relight-night1.jsonl` | 0 | playing | 120 | 65 | - | yes | `1dbdb24072d829d2` | night_start×1, deposit×1, lantern_lit×1 |
| P3-R7-pause-night1 | AC-P2-19 (tạm dừng, còn hiệu lực) | `node bin/headless.js --seed 1 --night 1 --ticks 260 --snapshot-every 60 --scenario scenarios/quiet-dawn.json --inputs inputs/p2-pause.json --out P3-R7-pause-night1.jsonl` | 0 | playing | 260 | 0 | - | yes | `3200decda5009b8b` | night_start×1, paused×1, resumed×1, mote_picked×1 |
| P3-R8-wind-night3 | AC-P2-16 (gió, còn hiệu lực) | `node bin/headless.js --seed 2 --night 3 --ticks 2400 --snapshot-every 300 --scenario scenarios/p2-wind-night3.json --out P3-R8-wind-night3.jsonl` | 0 | playing | 2400 | 0 | - | yes | `19ad6b0b58bb3ec4` | night_start×1 |
| P3-R9-determinism-seed42 | AC-11 (tất định) | `node bin/headless.js --seed 42 --night 1 --ticks 3600 --snapshot-every 600 --out P3-R9-determinism-seed42.jsonl` | 0 | playing | 3600 | 0 | - | yes | `e7e5ea954a7b670b` | night_start×1, shade_spawned×6 |

## Kiểm tra lỗi đầu vào (AC-10)

- Inputs thiếu/không hợp lệ (`--inputs` chứa scenario, thiếu `frames`): exit code **2**, stderr: `malformed input: inputs must be an object with a "frames" array`
- Inputs có tick không tăng: exit code **2**, stderr: `malformed input: frames[1].tick must strictly increase`

