///|
fn p(x : Int, y : Int) -> @core.Point {
  @core.point(x, y)
}

///|
fn simple_map() -> @grid.GridMap {
  @grid.new_grid(20, 20, p(0, 0), p(19, 19)).with_obstacles([
    p(4, 2),
    p(4, 3),
    p(4, 4),
    p(4, 5),
    p(4, 6),
    p(4, 7),
    p(8, 5),
    p(9, 5),
    p(10, 5),
    p(11, 5),
    p(12, 5),
    p(13, 5),
    p(15, 3),
    p(15, 4),
    p(15, 5),
    p(12, 9),
    p(12, 10),
    p(12, 11),
    p(12, 12),
    p(12, 13),
    p(12, 14),
    p(16, 10),
    p(17, 10),
    p(18, 10),
    p(3, 13),
    p(4, 13),
    p(5, 13),
    p(6, 13),
    p(7, 13),
    p(9, 16),
    p(10, 16),
    p(11, 16),
    p(12, 16),
    p(13, 16),
  ])
}

///|
fn complex_map() -> @grid.GridMap {
  @grid.new_grid(20, 20, p(0, 0), p(19, 19))
  .with_obstacles([
    p(3, 1),
    p(3, 2),
    p(3, 3),
    p(3, 5),
    p(3, 6),
    p(3, 7),
    p(3, 8),
    p(3, 9),
    p(3, 11),
    p(3, 12),
    p(3, 13),
    p(3, 14),
    p(3, 15),
    p(7, 4),
    p(7, 5),
    p(7, 6),
    p(7, 7),
    p(7, 9),
    p(7, 10),
    p(7, 11),
    p(7, 12),
    p(7, 13),
    p(7, 14),
    p(7, 16),
    p(7, 17),
    p(7, 18),
    p(7, 19),
    p(11, 0),
    p(11, 1),
    p(11, 2),
    p(11, 3),
    p(11, 4),
    p(11, 5),
    p(11, 7),
    p(11, 8),
    p(11, 9),
    p(11, 10),
    p(11, 11),
    p(11, 13),
    p(11, 14),
    p(15, 5),
    p(15, 6),
    p(15, 7),
    p(15, 8),
    p(15, 10),
    p(15, 11),
    p(15, 12),
    p(15, 13),
    p(15, 14),
    p(15, 15),
    p(15, 17),
    p(15, 18),
    p(15, 19),
    p(5, 3),
    p(6, 3),
    p(7, 3),
    p(8, 3),
    p(10, 3),
    p(12, 3),
    p(13, 3),
    p(15, 3),
    p(16, 3),
    p(17, 3),
    p(0, 8),
    p(1, 8),
    p(4, 8),
    p(5, 8),
    p(7, 8),
    p(8, 8),
    p(9, 8),
    p(12, 8),
    p(13, 8),
    p(6, 13),
    p(8, 13),
    p(9, 13),
    p(10, 13),
    p(12, 13),
    p(13, 13),
    p(14, 13),
    p(16, 13),
    p(18, 13),
    p(19, 13),
  ])
  .with_terrain(p(5, 5), 3.0)
  .with_terrain(p(6, 6), 3.0)
  .with_terrain(p(10, 10), 5.0)
  .with_terrain(p(14, 14), 4.0)
  .with_terrain(p(17, 16), 2.5)
}

///|
fn status_name(result : @core.PathResult) -> String {
  if result.status is @core.Found {
    "found"
  } else if result.status is @core.NoPath {
    "no_path"
  } else {
    "invalid_input"
  }
}

///|
fn print_result(
  scenario : String,
  algorithm : String,
  result : @core.PathResult,
  iterations : Int,
  candidates : Int,
  best_fitness : Double,
  seed : Int,
  population_size : Int,
  max_iterations : Int,
) -> Unit {
  println(
    "\{scenario},\{algorithm},\{status_name(result)},\{result.path.length()}," +
    "\{result.total_cost},\{@swarm.path_length(result.path)}," +
    "\{@swarm.path_smoothness(result.path)},\{result.visited_nodes}," +
    "\{result.expanded_nodes},\{iterations},\{candidates},\{best_fitness}," +
    "\{seed},\{population_size},\{max_iterations}",
  )
}

///|
fn run_scenario(name : String, map : @grid.GridMap) -> Unit {
  let movement = @grid.EightWay
  let swarm_options = @swarm.options(
    60,
    100,
    42,
    3,
    movement,
    @swarm.default_fitness_weights(),
  )
  let region = @region.build_search_region(map, @region.default_options())
  let astar = @algorithms.astar(map, movement, @heuristics.Octile)
  let dijkstra = @algorithms.dijkstra(map, movement)
  let pso = @swarm.pso_plan(map, region, swarm_options)
  let rs_apso = @swarm.rs_apso_plan(map, region, swarm_options)
  print_result(name, "astar", astar, 0, region.cell_count(), 0.0, 0, 0, 0)
  print_result(name, "dijkstra", dijkstra, 0, region.cell_count(), 0.0, 0, 0, 0)
  print_result(
    name,
    "pso",
    pso.result,
    pso.iterations,
    pso.candidates,
    pso.best_fitness,
    swarm_options.seed,
    swarm_options.population_size,
    swarm_options.max_iterations,
  )
  print_result(
    name,
    "rs_apso",
    rs_apso.result,
    rs_apso.iterations,
    rs_apso.candidates,
    rs_apso.best_fitness,
    swarm_options.seed,
    swarm_options.population_size,
    swarm_options.max_iterations,
  )
}

///|
fn main {
  println(
    "scenario,algorithm,status,path_nodes,total_cost,path_length,smoothness," +
    "visited_nodes,expanded_nodes,iterations,candidates,best_fitness,seed," +
    "population_size,max_iterations",
  )
  run_scenario("rs_apso_20x20_simple", simple_map())
  run_scenario("rs_apso_20x20_complex", complex_map())
}
