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
fn dynamic_map() -> @grid.GridMap {
  @grid.new_grid(5, 1, p(0, 0), p(4, 0))
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
fn default_repeats() -> Int {
  5
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
  repeats : Int,
  elapsed_us_total : Double,
) -> Unit {
  let elapsed_us_avg = elapsed_us_total / repeats.to_double()
  println(
    "\{scenario},\{algorithm},\{status_name(result)},\{result.path.length()}," +
    "\{result.total_cost},\{@swarm.path_length(result.path)}," +
    "\{@swarm.path_smoothness(result.path)},\{result.visited_nodes}," +
    "\{result.expanded_nodes},\{iterations},\{candidates},\{best_fitness}," +
    "\{seed},\{population_size},\{max_iterations},\{repeats}," +
    "\{elapsed_us_total},\{elapsed_us_avg}",
  )
}

///|
fn adjusted_result(
  base : @core.PathResult,
  adjusted : Array[@core.Point],
) -> @core.PathResult {
  if base.status is @core.Found {
    @core.found_result(
      adjusted,
      @swarm.path_length(adjusted),
      base.visited_nodes,
      base.expanded_nodes,
    )
  } else {
    base
  }
}

///|
fn run_scenario(name : String, map : @grid.GridMap) -> Unit {
  let repeats = default_repeats()
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
  let astar_start = @clock.monotonic_clock_start()
  let mut astar = @algorithms.astar(map, movement, @heuristics.Octile)
  for _ in 1..<repeats {
    astar = @algorithms.astar(map, movement, @heuristics.Octile)
  }
  let astar_elapsed = @clock.monotonic_clock_end(astar_start)
  let dijkstra_start = @clock.monotonic_clock_start()
  let mut dijkstra = @algorithms.dijkstra(map, movement)
  for _ in 1..<repeats {
    dijkstra = @algorithms.dijkstra(map, movement)
  }
  let dijkstra_elapsed = @clock.monotonic_clock_end(dijkstra_start)
  let pso_start = @clock.monotonic_clock_start()
  let mut pso = @swarm.pso_plan(map, region, swarm_options)
  for _ in 1..<repeats {
    pso = @swarm.pso_plan(map, region, swarm_options)
  }
  let pso_elapsed = @clock.monotonic_clock_end(pso_start)
  let rs_apso_start = @clock.monotonic_clock_start()
  let mut rs_apso = @swarm.rs_apso_plan(map, region, swarm_options)
  for _ in 1..<repeats {
    rs_apso = @swarm.rs_apso_plan(map, region, swarm_options)
  }
  let rs_apso_elapsed = @clock.monotonic_clock_end(rs_apso_start)
  print_result(
    name,
    "astar",
    astar,
    0,
    region.cell_count(),
    0.0,
    0,
    0,
    0,
    repeats,
    astar_elapsed,
  )
  print_result(
    name,
    "dijkstra",
    dijkstra,
    0,
    region.cell_count(),
    0.0,
    0,
    0,
    0,
    repeats,
    dijkstra_elapsed,
  )
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
    repeats,
    pso_elapsed,
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
    repeats,
    rs_apso_elapsed,
  )
}

///|
fn run_dynamic_scenarios() -> Unit {
  let repeats = default_repeats()
  let map = dynamic_map()
  let movement = @grid.FourWay
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let base = @algorithms.astar(map, movement, @heuristics.Manhattan)
  let baseline_start = @clock.monotonic_clock_start()
  let mut baseline = base
  for _ in 1..<repeats {
    baseline = @algorithms.astar(map, movement, @heuristics.Manhattan)
  }
  let baseline_elapsed = @clock.monotonic_clock_end(baseline_start)
  print_result(
    "dynamic_5x1", "astar_static", baseline, 0, 0, 0.0, 0, 0, 0, repeats, baseline_elapsed,
  )
  let horizontal = @dynamic.moving_obstacle_with_velocity(p(0, 0), 1.0, 1, 0)
  let over_time_start = @clock.monotonic_clock_start()
  let mut over_time = @dynamic.jump_avoidance_over_time(
    map,
    base.path,
    [horizontal],
    options,
  )
  for _ in 1..<repeats {
    over_time = @dynamic.jump_avoidance_over_time(
      map,
      base.path,
      [horizontal],
      options,
    )
  }
  let over_time_elapsed = @clock.monotonic_clock_end(over_time_start)
  print_result(
    "dynamic_5x1",
    "dynamic_time",
    adjusted_result(base, over_time),
    0,
    0,
    0.0,
    0,
    0,
    0,
    repeats,
    over_time_elapsed,
  )
  let reflected = @dynamic.moving_obstacle_with_velocity(p(0, 0), 1.0, 1, 0)
  let reflected_start = @clock.monotonic_clock_start()
  let mut reflected_path = @dynamic.jump_avoidance_over_reflected_time(
    map,
    base.path,
    [reflected],
    options,
    0,
    2,
    0,
    0,
  )
  for _ in 1..<repeats {
    reflected_path = @dynamic.jump_avoidance_over_reflected_time(
      map,
      base.path,
      [reflected],
      options,
      0,
      2,
      0,
      0,
    )
  }
  let reflected_elapsed = @clock.monotonic_clock_end(reflected_start)
  print_result(
    "dynamic_5x1",
    "dynamic_reflected",
    adjusted_result(base, reflected_path),
    0,
    0,
    0.0,
    0,
    0,
    0,
    repeats,
    reflected_elapsed,
  )
  let continuous = @dynamic.continuous_moving_obstacle(0.0, 0.0, 1.0, 1.0, 0.0)
  let continuous_start = @clock.monotonic_clock_start()
  let mut continuous_path = @dynamic.jump_avoidance_over_continuous_time(
    map,
    base.path,
    [continuous],
    options,
    1.0,
  )
  for _ in 1..<repeats {
    continuous_path = @dynamic.jump_avoidance_over_continuous_time(
      map,
      base.path,
      [continuous],
      options,
      1.0,
    )
  }
  let continuous_elapsed = @clock.monotonic_clock_end(continuous_start)
  print_result(
    "dynamic_5x1",
    "dynamic_continuous",
    adjusted_result(base, continuous_path),
    0,
    0,
    0.0,
    0,
    0,
    0,
    repeats,
    continuous_elapsed,
  )
}

///|
fn main {
  println(
    "scenario,algorithm,status,path_nodes,total_cost,path_length,smoothness," +
    "visited_nodes,expanded_nodes,iterations,candidates,best_fitness,seed," +
    "population_size,max_iterations,repeats,elapsed_us_total,elapsed_us_avg",
  )
  run_scenario("rs_apso_20x20_simple", simple_map())
  run_scenario("rs_apso_20x20_complex", complex_map())
  run_dynamic_scenarios()
}
