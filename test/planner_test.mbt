///|
test "planner dispatches every algorithm" {
  let map = @grid.new_grid(4, 4, @core.point(0, 0), @core.point(3, 3))
  let options = @planner.default_options()
  let algorithms = [
    @planner.Bfs,
    @planner.Dfs,
    @planner.Dijkstra,
    @planner.AStar,
    @planner.BidirectionalAStar,
  ]
  for algorithm in algorithms {
    let result = @planner.plan(map, algorithm, options)
    assert_eq(result.status is @core.Found, true)
  }
}

///|
test "planner supports eight way options" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2))
  let result = @planner.plan(map, @planner.AStar, @planner.eight_way_options())
  assert_eq(result.status is @core.Found, true)
  assert_eq(result.path.length(), 3)
}

