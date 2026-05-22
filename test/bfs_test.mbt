///|
test "bfs finds shortest four way detour" {
  let map = @grid.new_grid(
    4,
    3,
    @core.point(0, 1),
    @core.point(3, 1),
  ).with_obstacles([@core.point(1, 1), @core.point(2, 1)])
  let result = @algorithms.bfs(map, @grid.FourWay)
  assert_eq(result.status is @core.Found, true)
  assert_eq(result.path.length(), 6)
  assert_eq(result.total_cost, 5.0)
}

///|
test "dfs returns a path when one exists" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2))
  let result = @algorithms.dfs(map, @grid.FourWay)
  assert_eq(result.status is @core.Found, true)
  assert_eq(result.path.length() > 0, true)
}

