// Nguồn duy nhất của các con số trong game (Test Contract v1.1, Ticket-02).
// game.contract.json phải khớp với các giá trị này (tests/contract.test.js kiểm tra).
// Đơn vị: mét, giây. Logic chạy 60 tick/giây.
export const TUNING = Object.freeze({
  // Di chuyển
  player_speed: 6.0,              // m/s
  player_accel_s: 0.1,            // s để đạt player_speed trên đất
  air_accel: 20.0,                // m/s^2, điều khiển trên không (giả định A-P2-03)
  // Nhảy và trọng lực
  jump_velocity: 7.0,             // m/s
  gravity: 20.0,                  // m/s^2
  step_up: 0.3,                   // m, bậc tối đa Mây đi lên được khi đi bộ
  // Lướt
  dash_speed: 14,                 // m/s
  dash_duration_s: 0.2,
  dash_cooldown_s: 1.5,
  // Đom đóm và đèn
  carry_capacity: 10,
  pickup_radius: 1.0,             // m (XZ), <= r là nhặt được
  pickup_height: 1.5,             // m, chênh cao tối đa khi nhặt
  mote_start_count: 20,           // đom đóm lúc bắt đầu (random)
  mote_max: 30,                   // trần đom đóm random trên đảo
  mote_spawn_interval_s: 4,       // tick 240k sinh thêm 1
  mote_drop_ttl_s: 8,             // đom đóm rơi khi bị đánh tồn tại 480 tick
  lantern_count_night1: 5,
  lantern_cost: 10,               // đom đóm để thắp 1 đèn
  interact_radius: 2.0,           // m (XZ)
  // Tỏa sáng
  pulse_cost: 3,
  pulse_radius: 5.0,              // m, khoảng cách 3D từ tâm Tỏa Sáng tới tâm Bóng Mực
  pulse_origin_m: 0.8,            // tâm Tỏa Sáng = chân Mây + 0.8 m
  pulse_cooldown_s: 3.0,
  pulse_stun_s: 2.0,              // 120 tick
  pulse_push_m: 4.0,              // tổng đẩy lùi
  pulse_push_s: 0.25,             // 15 tick đầu bị đẩy
  // Vùng an toàn của đèn đã sáng
  safe_radius: 6.0,               // m (XZ)
  eject_ticks: 30,                // tối đa tick bị đẩy ra mép khi đèn vừa thắp
  // Bóng Mực
  shade_speed: 4.0,               // m/s
  shade_speed_night3: 4.5,
  shade_detect_m: 12.0,
  shade_lose_m: 18.0,
  shade_hit_radius: 1.0,          // m (XZ)
  shade_hit_height: 1.5,          // m
  shade_recoil_m: 2.0,            // lùi sau khi trúng
  shade_recoil_s: 1.0,            // 60 tick
  shade_spawn_first_s: 5,         // tick 300
  shade_spawn_interval_night1_s: 8,
  shade_spawn_interval_night2_s: 7,
  shade_spawn_interval_night3_s: 6,
  shade_max_night1: 6,
  shade_max_night2: 8,
  shade_max_night3: 10,
  // Mây: máu, bất tử, rơi
  flames: 3,                      // Ngọn Lửa (máu)
  invuln_s: 1.5,                  // 90 tick
  hit_drop_ratio: 0.5,            // floor(đang mang / 2) rơi ra
  drop_min_r: 1.5,
  drop_max_r: 2.5,
  fall_floor_y: -10.0,            // m
  fall_wait_s: 1.0,               // 60 tick chờ trước khi hồi sinh
  // Thời gian
  night1_duration_s: 300,
  night2_duration_s: 330,
  night3_duration_s: 360,
  // Bục nhảy
  pad_radius: 1.0,
  pad_night2_up: 14.0,            // m/s
  pad_night2_speed: 24.0,         // m/s ngang
  pad_night3_up: 12.0,
  pad_night3_speed: 8.0,
  // Gió Lạc
  drifter_speed: 7.0,
  drifter_idle_speed: 2.0,
  drifter_notice_m: 15.0,
  drifter_min_carry: 5,
  drifter_touch_m: 1.2,
  drifter_steal_max: 3,
  drifter_flee_s: 4.0,            // 240 tick
  drifter_spawn_s: 20,            // tick 1200k
  drifter_max: 2,
  drifter_drop_ttl_s: 2.0,        // đom đóm thả lại tồn tại 120 tick
  // Bùa Gió
  charm_speed: 7.2,
  charm_duration_s: 10,           // 600 tick
  charm_respawn_s: 45,            // 2700 tick
  // Gió (Đêm 3)
  wind_period_s: 30,
  wind_warn_s: 2,
  wind_duration_s: 5,
  wind_push: 2.0,                 // m/s
  island_radius_night1: 40.0,
  island_radius_night2: 28.0,
});

// Điểm số theo Test Contract (khóa `score`).
export const SCORE = Object.freeze({
  per_mote: 10,
  per_lantern: 100,
  per_stun: 5,
  per_second_left: 2,
  per_flame_left: 50,
});
