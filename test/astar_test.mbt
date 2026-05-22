///|
test "astar matches unweighted shortest path cost" {
  let map = @grid.new_grid(
    5,
    4,
    @core.point(0, 0),
    @core.point(4, 0),
  ).with_obstacles([@core.point(1, 0), @core.point(2, 0), @core.point(3, 0)])
  let bfs = @algorithms.bfs(map, @grid.FourWay)
  let dijkstra = @algorithms.dijkstra(map, @grid.FourWay)
  let astar = @algorithms.astar(map, @grid.FourWay, @heuristics.Manhattan)
  assert_eq(astar.status is @core.Found, true)
  assert_eq(astar.total_cost, bfs.total_cost)
  assert_eq(astar.total_cost, dijkstra.total_cost)
}

///|
test "astar avoids expensive weighted cell" {
  let map = @grid.new_grid(
    3,
    3,
    @core.point(0, 1),
    @core.point(2, 1),
  ).with_terrain(@core.point(1, 1), 9.0)
  let result = @algorithms.astar(map, @grid.FourWay, @heuristics.Manhattan)
  assert_eq(result.total_cost, 4.0)
}

