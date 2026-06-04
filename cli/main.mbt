///|
fn main {
  let map = @grid.new_grid(6, 5, @core.point(0, 0), @core.point(5, 4)).with_obstacles([
      @core.point(1, 1),
      @core.point(1, 2),
      @core.point(2, 2),
      @core.point(4, 3),
    ],
  )
  let result = @planner.plan(map, @planner.AStar, @planner.default_options())
  println("Moon PathPlanning A* demo")
  println("status path nodes: \{result.path.length()}")
  println("total cost: \{result.total_cost}")
  println("visited nodes: \{result.visited_nodes}")
  println("expanded nodes: \{result.expanded_nodes}")
}
