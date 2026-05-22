///|
test "dijkstra avoids expensive terrain" {
  let map = @grid.new_grid(
    3,
    3,
    @core.point(0, 1),
    @core.point(2, 1),
  ).with_terrain(@core.point(1, 1), 10.0)
  let result = @algorithms.dijkstra(map, @grid.FourWay)
  assert_eq(result.status is @core.Found, true)
  assert_eq(result.total_cost, 4.0)
  assert_eq(result.path.length(), 5)
}

