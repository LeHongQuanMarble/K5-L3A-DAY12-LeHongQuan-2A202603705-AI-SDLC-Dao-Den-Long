// Nguồn duy nhất của các con số trong game.
// game.contract.json phải khớp với các giá trị này (tests/contract.test.js kiểm tra).
export const TUNING = Object.freeze({
  player_speed: 6.0,            // m/s
  carry_capacity: 5,            // đom đóm tối đa Mây mang theo
  lantern_cost: 3,              // đom đóm cần để thắp 1 đèn
  lantern_count_night1: 5,
  pickup_radius: 1.0,           // m (XZ), <= r là nhặt được
  interact_radius: 2.0,         // m (XZ)
  pulse_cost: 1,                // đom đóm bị đốt khi tỏa sáng
  pulse_radius: 4.0,            // m (XZ)
  night1_duration_s: 180,
  flames: 3,                    // HP ban đầu của Mây
  invuln_s: 1.5,                // bất tử sau khi bị trúng
  hit_drop_ratio: 0.5,          // tỉ lệ đom đóm rơi khi trúng (làm tròn xuống)
  pulse_stun_s: 3.0,
  pulse_push_m: 2.0,
  pulse_cooldown_s: 2.0,
  safe_radius: 3.0,             // Bóng Mực không vào vùng này quanh đèn đã sáng
  shade_speed: 2.5,             // m/s
  shade_hit_radius: 1.0,        // m (XZ)
  fall_enabled: false,          // đảo có giới hạn, Mây không rơi
  island_radius: 12.0,          // m
  lantern_ring_radius: 7.0,     // m, đèn đặt thành vòng quanh đảo
  jump_velocity: 6.0,           // m/s
  gravity: 18.0,                // m/s^2
  mote_count: 12,               // đom đóm ngẫu nhiên khi không có scenario
  shade_start_count: 2,         // Bóng Mực ngẫu nhiên lúc đầu
  shade_spawn_interval_s: 30.0, // Bóng Mực mới xuất hiện theo chu kỳ
  shade_max: 6,
});

// Điểm số theo Test Contract (khóa `score`).
export const SCORE = Object.freeze({
  per_mote: 10,
  per_lantern: 100,
  per_stun: 25,
  per_second_left: 5,
  per_flame_left: 50,
});
