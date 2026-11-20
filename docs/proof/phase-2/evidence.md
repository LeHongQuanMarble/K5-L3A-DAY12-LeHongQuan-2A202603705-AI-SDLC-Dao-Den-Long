# Bằng chứng Phase 2 (sinh tự động bởi `npm run evidence`)

Mỗi dòng: một lần chạy CLI headless thật, chạy hai lần và so sha256. Cột `deterministic` = `yes` nghĩa là hai lần cho byte giống nhau. Bằng chứng Phase 1 cũ nằm ở `docs/proof/phase-1/` (tag `phase-1`).

| Run | Yêu cầu | Lệnh | Exit | State | Ticks | Điểm | Lý do kết thúc | Deterministic | sha256 (16 ký tự đầu) | Sự kiện |
|---|---|---|---|---|---|---|---|---|---|---|
| P2-R1-night1-full | AC-P2-13 (Đêm 1 đủ 300 s) | `node bin/headless.js --seed 1 --night 1 --ticks 18000 --snapshot-every 3600 --out P2-R1-night1-full.jsonl` | 0 | lost | 18000 | 0 | dawn | yes | `85af70b503fbd2f8` | night_start×1, shade_spawned×6, game_over×1 |
| P2-R2-night2-full | AC-P2-13, AC-P2-14, AC-P2-17, AC-P2-18 | `node bin/headless.js --seed 7 --night 2 --ticks 21600 --snapshot-every 3600 --out P2-R2-night2-full.jsonl` | 0 | lost | 19800 | 0 | dawn | yes | `447b70a5f8d198e3` | night_start×1, shade_spawned×8, game_over×1 |
| P2-R3-night3-full | AC-P2-13, AC-P2-15, AC-P2-16 | `node bin/headless.js --seed 7 --night 3 --ticks 21600 --snapshot-every 3600 --out P2-R3-night3-full.jsonl` | 0 | lost | 9575 | 0 | no_flames | yes | `b3dad94070300134` | night_start×1, shade_spawned×10, player_hit×3, game_over×1 |
| P2-R4-jump-pad-night2 | AC-P2-14 (bục nhảy) | `node bin/headless.js --seed 1 --night 2 --ticks 240 --snapshot-every 60 --scenario scenarios/p2-jump-pad-night2.json --inputs inputs/p2-jump-pad-idle.json --out P2-R4-jump-pad-night2.jsonl` | 0 | playing | 240 | 0 | - | yes | `dafa393321707bf0` | night_start×1 |
| P2-R5-drifter-steal-night2 | AC-P2-17 (Gió Lạc) | `node bin/headless.js --seed 1 --night 2 --ticks 300 --snapshot-every 60 --scenario scenarios/p2-drifter-steal.json --out P2-R5-drifter-steal-night2.jsonl` | 0 | playing | 300 | 0 | - | yes | `60c00741f4273ac4` | night_start×1, drifter_steal×1 |
| P2-R6-charm-night2 | AC-P2-18 (Bùa Gió) | `node bin/headless.js --seed 1 --night 2 --ticks 200 --snapshot-every 50 --scenario scenarios/p2-charm-pickup.json --out P2-R6-charm-night2.jsonl` | 0 | playing | 200 | 0 | - | yes | `143f661dc8682ef8` | night_start×1, charm_picked×1 |
| P2-R7-wind-night3 | AC-P2-16 (gió Đêm 3) | `node bin/headless.js --seed 2 --night 3 --ticks 2400 --snapshot-every 300 --scenario scenarios/p2-wind-night3.json --out P2-R7-wind-night3.jsonl` | 0 | playing | 2400 | 0 | - | yes | `7965e7c916625ca0` | night_start×1 |
| P2-R8-pause-night1 | AC-P2-19 (tạm dừng) | `node bin/headless.js --seed 1 --night 1 --ticks 260 --snapshot-every 60 --scenario scenarios/quiet-dawn.json --inputs inputs/p2-pause.json --out P2-R8-pause-night1.jsonl` | 0 | playing | 260 | 0 | - | yes | `6f06e357c47b454b` | night_start×1, paused×1, resumed×1, mote_picked×1 |
| P2-R9-fall-night1 | AC-P2-12 (rơi khỏi đảo) | `node bin/headless.js --seed 1 --night 1 --ticks 240 --snapshot-every 60 --scenario scenarios/p2-fall-night1.json --inputs inputs/p2-walk-off-night1.json --out P2-R9-fall-night1.jsonl` | 0 | playing | 240 | 0 | - | yes | `e8e48a98732884cd` | night_start×1, player_hit×1 |
| P2-R10-dash-night1 | AC-P2-04 (lướt) | `node bin/headless.js --seed 1 --night 1 --ticks 180 --snapshot-every 60 --scenario scenarios/quiet-dawn.json --inputs inputs/p2-dash-and-walk.json --out P2-R10-dash-night1.jsonl` | 0 | playing | 180 | 0 | - | yes | `7194bf451e766da9` | night_start×1, dash×1, mote_picked×1 |
| P1-R-random-night1-seed42 | AC-11 (tất định, ngẫu nhiên) | `node bin/headless.js --seed 42 --night 1 --ticks 3600 --snapshot-every 600 --out P1-R-random-night1-seed42.jsonl` | 0 | playing | 3600 | 0 | - | yes | `ec93f3d531f0e47f` | night_start×1, shade_spawned×6 |

## Kiểm tra lỗi đầu vào (AC-10)

- Inputs thiếu/không hợp lệ (`--inputs` chứa scenario, thiếu `frames`): exit code **2**, stderr: `malformed input: inputs must be an object with a "frames" array`
- Inputs có tick không tăng: exit code **2**, stderr: `malformed input: frames[1].tick must strictly increase`

