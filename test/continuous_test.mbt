///|
test "continuous rasterized segment includes endpoints and diagonal cells" {
  let cells = @continuous.rasterized_segment_cells(
    @core.point(0, 0),
    @core.point(3, 3),
  )
  assert_eq(cells.length(), 4)
  assert_eq(cells[0].same(@core.point(0, 0)), true)
  assert_eq(cells[1].same(@core.point(1, 1)), true)
  assert_eq(cells[3].same(@core.point(3, 3)), true)
}

///|
test "continuous segment visibility rejects blocked raster cell" {
  let map = @grid.new_grid(4, 4, @core.point(0, 0), @core.point(3, 3)).with_obstacle(
    @core.point(1, 1),
  )
  assert_eq(
    @continuous.segment_is_walkable(map, @core.point(0, 0), @core.point(3, 3)),
    false,
  )
  assert_eq(
    @continuous.segment_is_walkable(map, @core.point(0, 2), @core.point(3, 2)),
    true,
  )
}

///|
test "continuous shortcut removes redundant waypoints when line is clear" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4))
  let path = [
    @core.point(0, 0),
    @core.point(1, 1),
    @core.point(2, 2),
    @core.point(3, 3),
    @core.point(4, 4),
  ]
  let shortened = @continuous.shortcut_path(map, path)
  assert_eq(shortened.length(), 2)
  assert_eq(shortened[0].same(@core.point(0, 0)), true)
  assert_eq(shortened[1].same(@core.point(4, 4)), true)
}

///|
test "continuous shortcut preserves required bend around obstacle" {
  let map = @grid.new_grid(5, 3, @core.point(0, 1), @core.point(4, 1)).with_obstacle(
    @core.point(2, 1),
  )
  let path = [
    @core.point(0, 1),
    @core.point(1, 1),
    @core.point(1, 0),
    @core.point(2, 0),
    @core.point(3, 0),
    @core.point(3, 1),
    @core.point(4, 1),
  ]
  let shortened = @continuous.shortcut_path(map, path)
  assert_eq(shortened[0].same(@core.point(0, 1)), true)
  assert_eq(shortened[shortened.length() - 1].same(@core.point(4, 1)), true)
  assert_eq(shortened.length() > 2, true)
  assert_eq(
    @continuous.segment_is_walkable(map, shortened[0], shortened[1]),
    true,
  )
}

///|
fn visible_path(map : @grid.GridMap, path : Array[@core.Point]) -> Bool {
  for index in 1..<path.length() {
    if !@continuous.segment_is_walkable(map, path[index - 1], path[index]) {
      return false
    }
  }
  true
}

///|
test "continuous rrt returns direct visible path" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4))
  let result = @continuous.rrt_plan(map, @continuous.default_rrt_options())
  assert_eq(result.result.status is @core.Found, true)
  assert_eq(result.iterations, 0)
  assert_eq(result.nodes, 2)
  assert_eq(result.result.path.length(), 2)
  assert_eq(result.result.path[0].same(map.start), true)
  assert_eq(result.result.path[1].same(map.goal), true)
}

///|
test "continuous rrt samples visible tree around obstacle gap" {
  let map = @grid.new_grid(7, 5, @core.point(0, 2), @core.point(6, 2)).with_obstacles([
      @core.point(3, 0),
      @core.point(3, 2),
      @core.point(3, 3),
      @core.point(3, 4),
    ],
  )
  let options = @continuous.rrt_options(200, 7, 0.15)
  let first = @continuous.rrt_plan(map, options)
  let second = @continuous.rrt_plan(map, options)
  assert_eq(first.result.status is @core.Found, true)
  assert_eq(first.result.path[0].same(map.start), true)
  assert_eq(
    first.result.path[first.result.path.length() - 1].same(map.goal),
    true,
  )
  assert_eq(first.result.path.length() > 2, true)
  assert_eq(visible_path(map, first.result.path), true)
  assert_eq(first.iterations, second.iterations)
  assert_eq(first.result.path.length(), second.result.path.length())
  for index in 0..<first.result.path.length() {
    assert_eq(first.result.path[index].same(second.result.path[index]), true)
  }
}

///|
test "continuous rrt reports no path when start is enclosed" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2)).with_obstacles([
      @core.point(0, 1),
      @core.point(1, 0),
      @core.point(1, 1),
    ],
  )
  let result = @continuous.rrt_plan(map, @continuous.rrt_options(40, 42, 0.4))
  assert_eq(result.result.status is @core.NoPath, true)
  assert_eq(result.nodes, 1)
}

///|
test "continuous rrt connect returns direct visible path" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4))
  let result = @continuous.rrt_connect_plan(
    map,
    @continuous.default_rrt_options(),
  )
  assert_eq(result.result.status is @core.Found, true)
  assert_eq(result.iterations, 0)
  assert_eq(result.result.path.length(), 2)
  assert_eq(result.result.path[0].same(map.start), true)
  assert_eq(result.result.path[1].same(map.goal), true)
}

///|
test "continuous rrt connect joins two trees around obstacle gap" {
  let map = @grid.new_grid(7, 5, @core.point(0, 2), @core.point(6, 2)).with_obstacles([
      @core.point(3, 0),
      @core.point(3, 2),
      @core.point(3, 3),
      @core.point(3, 4),
    ],
  )
  let options = @continuous.rrt_options(200, 11, 0.15)
  let first = @continuous.rrt_connect_plan(map, options)
  let second = @continuous.rrt_connect_plan(map, options)
  assert_eq(first.result.status is @core.Found, true)
  assert_eq(first.result.path[0].same(map.start), true)
  assert_eq(
    first.result.path[first.result.path.length() - 1].same(map.goal),
    true,
  )
  assert_eq(first.result.path.length() > 2, true)
  assert_eq(visible_path(map, first.result.path), true)
  assert_eq(first.iterations, second.iterations)
  assert_eq(first.nodes, second.nodes)
  assert_eq(first.result.path.length(), second.result.path.length())
  for index in 0..<first.result.path.length() {
    assert_eq(first.result.path[index].same(second.result.path[index]), true)
  }
}

///|
test "continuous rrt connect reports no path when start is enclosed" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2)).with_obstacles([
      @core.point(0, 1),
      @core.point(1, 0),
      @core.point(1, 1),
    ],
  )
  let result = @continuous.rrt_connect_plan(
    map,
    @continuous.rrt_options(40, 42, 0.4),
  )
  assert_eq(result.result.status is @core.NoPath, true)
  assert_eq(result.result.path.length(), 0)
}

///|
test "continuous rrt star returns direct visible path" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4))
  let result = @continuous.rrt_star_plan(
    map,
    @continuous.default_rrt_star_options(),
  )
  assert_eq(result.result.status is @core.Found, true)
  assert_eq(result.iterations, 0)
  assert_eq(result.result.path.length(), 2)
  assert_eq(result.result.path[0].same(map.start), true)
  assert_eq(result.result.path[1].same(map.goal), true)
}

///|
test "continuous rrt star rewires visible neighbors around obstacle gap" {
  let map = @grid.new_grid(7, 5, @core.point(0, 2), @core.point(6, 2)).with_obstacles([
      @core.point(3, 0),
      @core.point(3, 2),
      @core.point(3, 3),
      @core.point(3, 4),
    ],
  )
  let rrt_options = @continuous.rrt_options(200, 7, 0.15)
  let star_options = @continuous.rrt_star_options(200, 7, 0.15, 3)
  let rrt = @continuous.rrt_plan(map, rrt_options)
  let first = @continuous.rrt_star_plan(map, star_options)
  let second = @continuous.rrt_star_plan(map, star_options)
  assert_eq(first.result.status is @core.Found, true)
  assert_eq(first.result.path[0].same(map.start), true)
  assert_eq(
    first.result.path[first.result.path.length() - 1].same(map.goal),
    true,
  )
  assert_eq(visible_path(map, first.result.path), true)
  assert_eq(first.result.total_cost <= rrt.result.total_cost, true)
  assert_eq(first.iterations, second.iterations)
  assert_eq(first.nodes, second.nodes)
  assert_eq(first.result.path.length(), second.result.path.length())
  for index in 0..<first.result.path.length() {
    assert_eq(first.result.path[index].same(second.result.path[index]), true)
  }
}

///|
test "continuous rrt star reports no path when start is enclosed" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2)).with_obstacles([
      @core.point(0, 1),
      @core.point(1, 0),
      @core.point(1, 1),
    ],
  )
  let result = @continuous.rrt_star_plan(
    map,
    @continuous.rrt_star_options(40, 42, 0.4, 2),
  )
  assert_eq(result.result.status is @core.NoPath, true)
  assert_eq(result.result.path.length(), 0)
}
