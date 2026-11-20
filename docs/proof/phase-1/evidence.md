# Bằng chứng Phase 1 (sinh tự động bởi `npm run evidence`)

Mỗi dòng: một lần chạy CLI headless thật, chạy hai lần và so sha256. Cột `deterministic` = `yes` nghĩa là hai lần cho byte giống nhau.

| Run | Yêu cầu | Lệnh | Exit | State | Ticks | Điểm | Lý do kết thúc | Deterministic | sha256 (16 ký tự đầu) | Sự kiện |
|---|---|---|---|---|---|---|---|---|---|---|
| R1-shade-hit | AC-6, AC-8 | `node bin/headless.js --seed 1 --night 1 --ticks 1000 --snapshot-every 60 --scenario scenarios/shade-hit.json --out R1-shade-hit.jsonl` | 0 | lost | 183 | 0 | no_flames | yes | `a68b58b6d31d127d` | player_hit×3, game_over×1 |
| R2-win-by-deposit | AC-4, AC-8 | `node bin/headless.js --seed 1 --night 1 --ticks 600 --snapshot-every 60 --scenario scenarios/win-by-deposit.json --inputs inputs/deposit-win.json --out R2-win-by-deposit.jsonl` | 0 | won | 1 | 875 | all_lit | yes | `1df7ff7e68d374de` | deposit×1, lantern_lit×1, game_over×1 |
| R3-pulse-stun | AC-5 | `node bin/headless.js --seed 1 --night 1 --ticks 300 --snapshot-every 60 --scenario scenarios/pulse-stun.json --inputs inputs/pulse-once.json --out R3-pulse-stun.jsonl` | 0 | playing | 300 | 25 | - | yes | `2127ff3391a92d85` | pulse×1, player_hit×1 |
| R4-walk-and-jump | AC-1, AC-2, AC-3 | `node bin/headless.js --seed 7 --night 1 --ticks 600 --snapshot-every 60 --inputs inputs/walk-and-jump.json --out R4-walk-and-jump.jsonl` | 0 | lost | 448 | 0 | no_flames | yes | `48bf4f6b9d59f7dc` | player_hit×3, game_over×1 |
| R5-dawn | AC-8 | `node bin/headless.js --seed 42 --night 1 --ticks 20000 --snapshot-every 3600 --scenario scenarios/quiet-dawn.json --out R5-dawn.jsonl` | 0 | lost | 10800 | 0 | dawn | yes | `5388cc87ed95d55c` | mote_picked×1, game_over×1 |
| R6-random-seed-42 | AC-11 | `node bin/headless.js --seed 42 --night 1 --ticks 3600 --snapshot-every 600 --out R6-random-seed-42.jsonl` | 0 | lost | 447 | 0 | no_flames | yes | `cf3dc174a053511a` | mote_picked×1, player_hit×3, game_over×1 |

## Kiểm tra lỗi đầu vào (AC-10)

- Inputs thiếu/không hợp lệ (`--inputs` chứa scenario, thiếu `frames`): exit code **2**, stderr: `malformed input: inputs must be an object with a "frames" array`
- Inputs có tick không tăng: exit code **2**, stderr: `malformed input: frames[1].tick must strictly increase`

