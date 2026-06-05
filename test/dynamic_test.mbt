///|
test "dynamic collision radius follows paper coefficients" {
  let options = @dynamic.collision_options(2.0, 1.2, 0.5)
  let obstacle = @dynamic.moving_obstacle(@core.point(1, 0), 1.2)
  let radius = @dynamic.collision_radius(options, obstacle)
  assert_eq(radius > 1.7, true)
  assert_eq(radius < 1.8, true)
}

///|
test "dynamic collision detects nearby moving obstacle" {
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let obstacle = @dynamic.moving_obstacle(@core.point(1, 0), 1.0)
  assert_eq(@dynamic.would_collide(@core.point(1, 0), obstacle, options), true)
  assert_eq(@dynamic.would_collide(@core.point(3, 0), obstacle, options), false)
}

///|
test "dynamic jump avoidance skips colliding next waypoint" {
  let map = @grid.new_grid(5, 1, @core.point(0, 0), @core.point(4, 0))
  let path = [
    @core.point(0, 0),
    @core.point(1, 0),
    @core.point(2, 0),
    @core.point(3, 0),
    @core.point(4, 0),
  ]
  let obstacle = @dynamic.moving_obstacle(@core.point(1, 0), 1.0)
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let adjusted = @dynamic.jump_avoidance(map, path, [obstacle], options)
  assert_eq(adjusted[0].same(@core.point(0, 0)), true)
  assert_eq(adjusted[1].same(@core.point(2, 0)), true)
  assert_eq(adjusted[adjusted.length() - 1].same(@core.point(4, 0)), true)
}

///|
test "dynamic jump avoidance leaves safe path unchanged" {
  let map = @grid.new_grid(3, 1, @core.point(0, 0), @core.point(2, 0))
  let path = [@core.point(0, 0), @core.point(1, 0), @core.point(2, 0)]
  let obstacle = @dynamic.moving_obstacle(@core.point(8, 0), 1.0)
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let adjusted = @dynamic.jump_avoidance(map, path, [obstacle], options)
  assert_eq(adjusted.length(), path.length())
  assert_eq(adjusted[1].same(path[1]), true)
}

///|
test "dynamic moving obstacle projects by velocity" {
  let obstacle = @dynamic.moving_obstacle_with_velocity(
    @core.point(0, 1),
    1.0,
    2,
    -1,
  )
  let moved = obstacle.at_step(2)
  assert_eq(moved.position.same(@core.point(4, -1)), true)
}

///|
test "dynamic continuous obstacle projects by time" {
  let obstacle = @dynamic.continuous_moving_obstacle(0.5, 1.0, 1.2, 0.5, -0.25)
  let moved = obstacle.at_time(2.0)
  assert_eq(moved.x > 1.49, true)
  assert_eq(moved.x < 1.51, true)
  assert_eq(moved.y > 0.49, true)
  assert_eq(moved.y < 0.51, true)
}

///|
test "dynamic continuous collision detects fractional position" {
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let obstacle = @dynamic.continuous_moving_obstacle(1.25, 0.0, 1.0, 0.0, 0.0)
  assert_eq(
    @dynamic.would_collide_continuous(@core.point(1, 0), obstacle, options),
    true,
  )
  assert_eq(
    @dynamic.would_collide_continuous(@core.point(2, 0), obstacle, options),
    false,
  )
}

///|
test "dynamic continuous segment interpolates by time" {
  let segment = @dynamic.continuous_segment(
    @dynamic.continuous_point(0.0, 0.0),
    @dynamic.continuous_point(4.0, 0.0),
    2.0,
    6.0,
  )
  let before = segment.point_at_time(1.0)
  let middle = segment.point_at_time(4.0)
  let after = segment.point_at_time(8.0)
  assert_eq(before.x, 0.0)
  assert_eq(middle.x, 2.0)
  assert_eq(after.x, 4.0)
}

///|
test "dynamic continuous trajectory detects obstacle along segment" {
  let path = [@core.point(0, 0), @core.point(4, 0)]
  let segments = @dynamic.continuous_segments_from_grid_path(path, 4.0)
  let obstacle = @dynamic.continuous_moving_obstacle(2.0, 0.0, 1.0, 0.0, 0.0)
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  assert_eq(
    @dynamic.continuous_path_is_safe(segments, [obstacle], options, 4),
    false,
  )
}

///|
test "dynamic continuous trajectory reports first collision details" {
  let path = [@core.point(0, 0), @core.point(4, 0)]
  let segments = @dynamic.continuous_segments_from_grid_path(path, 4.0)
  let far = @dynamic.continuous_moving_obstacle(0.0, 4.0, 1.0, 0.0, 0.0)
  let blocking = @dynamic.continuous_moving_obstacle(2.0, 0.0, 1.0, 0.0, 0.0)
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  match
    @dynamic.continuous_path_first_collision(
      segments,
      [far, blocking],
      options,
      4,
    ) {
    Some(collision) => {
      assert_eq(collision.segment_index, 0)
      assert_eq(collision.sample_index, 2)
      assert_eq(collision.obstacle_index, 1)
      assert_eq(collision.time, 2.0)
      assert_eq(collision.robot.x, 2.0)
      assert_eq(collision.obstacle.x, 2.0)
    }
    None => fail("expected continuous collision report")
  }
}

///|
test "dynamic continuous trajectory reports no collision when safe" {
  let path = [@core.point(0, 0), @core.point(4, 0)]
  let segments = @dynamic.continuous_segments_from_grid_path(path, 4.0)
  let obstacle = @dynamic.continuous_moving_obstacle(2.0, 3.0, 1.0, 0.0, 0.0)
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let collision = @dynamic.continuous_path_first_collision(
    segments,
    [obstacle],
    options,
    4,
  )
  assert_eq(collision is None, true)
}

///|
test "dynamic continuous trajectory leaves distant obstacle safe" {
  let path = [@core.point(0, 0), @core.point(4, 0)]
  let segments = @dynamic.continuous_segments_from_grid_path(path, 4.0)
  let obstacle = @dynamic.continuous_moving_obstacle(2.0, 3.0, 1.0, 0.0, 0.0)
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  assert_eq(
    @dynamic.continuous_path_is_safe(segments, [obstacle], options, 4),
    true,
  )
}

///|
test "dynamic reflected obstacle moves horizontally within boundaries" {
  let obstacle = @dynamic.moving_obstacle_with_velocity(
    @core.point(0, 0),
    1.0,
    1,
    0,
  )
  assert_eq(
    obstacle.at_reflected_step(0, 0, 2, 0, 0).position.same(@core.point(0, 0)),
    true,
  )
  assert_eq(
    obstacle.at_reflected_step(1, 0, 2, 0, 0).position.same(@core.point(1, 0)),
    true,
  )
  assert_eq(
    obstacle.at_reflected_step(2, 0, 2, 0, 0).position.same(@core.point(2, 0)),
    true,
  )
  assert_eq(
    obstacle.at_reflected_step(3, 0, 2, 0, 0).position.same(@core.point(1, 0)),
    true,
  )
  assert_eq(
    obstacle.at_reflected_step(4, 0, 2, 0, 0).position.same(@core.point(0, 0)),
    true,
  )
}

///|
test "dynamic reflected obstacle moves vertically within boundaries" {
  let obstacle = @dynamic.moving_obstacle_with_velocity(
    @core.point(0, 0),
    1.0,
    0,
    1,
  )
  assert_eq(
    obstacle.at_reflected_step(0, 0, 0, 0, 2).position.same(@core.point(0, 0)),
    true,
  )
  assert_eq(
    obstacle.at_reflected_step(1, 0, 0, 0, 2).position.same(@core.point(0, 1)),
    true,
  )
  assert_eq(
    obstacle.at_reflected_step(2, 0, 0, 0, 2).position.same(@core.point(0, 2)),
    true,
  )
  assert_eq(
    obstacle.at_reflected_step(3, 0, 0, 0, 2).position.same(@core.point(0, 1)),
    true,
  )
}

///|
test "dynamic over time avoids horizontal moving obstacle" {
  let map = @grid.new_grid(5, 1, @core.point(0, 0), @core.point(4, 0))
  let path = [
    @core.point(0, 0),
    @core.point(1, 0),
    @core.point(2, 0),
    @core.point(3, 0),
    @core.point(4, 0),
  ]
  let obstacle = @dynamic.moving_obstacle_with_velocity(
    @core.point(0, 0),
    1.0,
    1,
    0,
  )
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let adjusted = @dynamic.jump_avoidance_over_time(
    map,
    path,
    [obstacle],
    options,
  )
  assert_eq(adjusted[1].same(@core.point(2, 0)), true)
}

///|
test "dynamic continuous avoidance leaves safe path unchanged" {
  let map = @grid.new_grid(5, 1, @core.point(0, 0), @core.point(4, 0))
  let path = [
    @core.point(0, 0),
    @core.point(1, 0),
    @core.point(2, 0),
    @core.point(3, 0),
    @core.point(4, 0),
  ]
  let obstacle = @dynamic.continuous_moving_obstacle(0.0, 4.0, 1.0, 0.5, 0.0)
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let adjusted = @dynamic.jump_avoidance_over_continuous_time(
    map,
    path,
    [obstacle],
    options,
    1.0,
  )
  assert_eq(adjusted.length(), path.length())
  assert_eq(adjusted[1].same(path[1]), true)
  assert_eq(adjusted[4].same(path[4]), true)
}

///|
test "dynamic continuous avoidance jumps after obstacle enters radius" {
  let map = @grid.new_grid(5, 1, @core.point(0, 0), @core.point(4, 0))
  let path = [
    @core.point(0, 0),
    @core.point(1, 0),
    @core.point(2, 0),
    @core.point(3, 0),
    @core.point(4, 0),
  ]
  let obstacle = @dynamic.continuous_moving_obstacle(0.0, 0.0, 1.0, 1.0, 0.0)
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let adjusted = @dynamic.jump_avoidance_over_continuous_time(
    map,
    path,
    [obstacle],
    options,
    1.0,
  )
  assert_eq(adjusted[1].same(@core.point(2, 0)), true)
}

///|
test "dynamic over time avoids vertical moving obstacle" {
  let map = @grid.new_grid(1, 5, @core.point(0, 0), @core.point(0, 4))
  let path = [
    @core.point(0, 0),
    @core.point(0, 1),
    @core.point(0, 2),
    @core.point(0, 3),
    @core.point(0, 4),
  ]
  let obstacle = @dynamic.moving_obstacle_with_velocity(
    @core.point(0, 0),
    1.0,
    0,
    1,
  )
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let adjusted = @dynamic.jump_avoidance_over_time(
    map,
    path,
    [obstacle],
    options,
  )
  assert_eq(adjusted[1].same(@core.point(0, 2)), true)
}

///|
test "dynamic over time handles two moving obstacle directions" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4))
  let path = [
    @core.point(0, 0),
    @core.point(1, 1),
    @core.point(2, 2),
    @core.point(3, 3),
    @core.point(4, 4),
  ]
  let horizontal = @dynamic.moving_obstacle_with_velocity(
    @core.point(0, 1),
    1.0,
    1,
    0,
  )
  let vertical = @dynamic.moving_obstacle_with_velocity(
    @core.point(2, 0),
    1.0,
    0,
    1,
  )
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let adjusted = @dynamic.jump_avoidance_over_time(
    map,
    path,
    [horizontal, vertical],
    options,
  )
  assert_eq(adjusted[0].same(map.start), true)
  let horizontal_jump = adjusted[1].same(@core.point(2, 0))
  let vertical_jump = adjusted[1].same(@core.point(0, 2))
  assert_eq(horizontal_jump || vertical_jump, true)
}

///|
test "dynamic reflected avoidance leaves safe path unchanged" {
  let map = @grid.new_grid(5, 1, @core.point(0, 0), @core.point(4, 0))
  let path = [
    @core.point(0, 0),
    @core.point(1, 0),
    @core.point(2, 0),
    @core.point(3, 0),
    @core.point(4, 0),
  ]
  let obstacle = @dynamic.moving_obstacle_with_velocity(
    @core.point(0, 4),
    1.0,
    1,
    0,
  )
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let adjusted = @dynamic.jump_avoidance_over_reflected_time(
    map,
    path,
    [obstacle],
    options,
    0,
    2,
    4,
    4,
  )
  assert_eq(adjusted.length(), path.length())
  assert_eq(adjusted[1].same(path[1]), true)
  assert_eq(adjusted[4].same(path[4]), true)
}

///|
test "dynamic reflected avoidance jumps after obstacle enters radius" {
  let map = @grid.new_grid(5, 1, @core.point(0, 0), @core.point(4, 0))
  let path = [
    @core.point(0, 0),
    @core.point(1, 0),
    @core.point(2, 0),
    @core.point(3, 0),
    @core.point(4, 0),
  ]
  let obstacle = @dynamic.moving_obstacle_with_velocity(
    @core.point(0, 0),
    1.0,
    1,
    0,
  )
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let adjusted = @dynamic.jump_avoidance_over_reflected_time(
    map,
    path,
    [obstacle],
    options,
    0,
    2,
    0,
    0,
  )
  assert_eq(adjusted[1].same(@core.point(2, 0)), true)
}
