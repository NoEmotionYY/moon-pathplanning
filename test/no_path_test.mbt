///|
test "planner reports no path" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2)).with_obstacles([
      @core.point(1, 0),
      @core.point(0, 1),
      @core.point(1, 1),
    ],
  )
  let result = @planner.plan(map, @planner.AStar, @planner.default_options())
  assert_eq(result.status is @core.NoPath, true)
  assert_eq(result.path.length(), 0)
}

///|
test "planner returns invalid input for blocked goal" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1)).with_obstacle(
    @core.point(1, 1),
  )
  let result = @planner.plan(map, @planner.Bfs, @planner.default_options())
  assert_eq(result.status is @core.InvalidInput, true)
}
