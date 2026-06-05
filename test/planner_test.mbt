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
    @planner.Pso,
    @planner.RsApso,
    @planner.Rrt,
    @planner.RrtConnect,
    @planner.RrtStar,
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

///|
test "planner dispatches swarm algorithms through region search" {
  let map = @grid.new_grid(5, 3, @core.point(0, 1), @core.point(4, 1)).with_obstacle(
    @core.point(2, 1),
  )
  let pso = @planner.plan(map, @planner.Pso, @planner.default_options())
  let rs_apso = @planner.plan(map, @planner.RsApso, @planner.default_options())
  assert_eq(pso.status is @core.Found, true)
  assert_eq(rs_apso.status is @core.Found, true)
  assert_eq(pso.path[0].same(map.start), true)
  assert_eq(rs_apso.path[rs_apso.path.length() - 1].same(map.goal), true)
}
