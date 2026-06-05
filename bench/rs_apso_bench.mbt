///|
fn p(x : Int, y : Int) -> @core.Point {
  @core.point(x, y)
}

///|
#cfg(target="native")
#external
type FileHandle

///|
#cfg(target="native")
#borrow(path, mode)
extern "C" fn file_open(path : Bytes, mode : Bytes) -> FileHandle = "moonbit_fopen_ffi"

///|
#cfg(target="native")
extern "C" fn is_null_file(file : FileHandle) -> Bool = "moonbit_is_null"

///|
#cfg(target="native")
extern "C" fn file_seek(file : FileHandle, offset : Int, whence : Int) -> Int = "moonbit_fseek_ffi"

///|
#cfg(target="native")
extern "C" fn file_tell(file : FileHandle) -> Int = "moonbit_ftell_ffi"

///|
#cfg(target="native")
#borrow(buffer, file)
extern "C" fn file_read(
  buffer : Bytes,
  size : Int,
  nitems : Int,
  file : FileHandle,
) -> Int = "moonbit_fread_ffi"

///|
#cfg(target="native")
extern "C" fn file_close(file : FileHandle) -> Int = "moonbit_fclose_ffi"

///|
#cfg(target="native")
fn c_string(text : String) -> Bytes {
  let bytes = @utf8.encode(text).to_array()
  bytes.push(b'\x00')
  Bytes::from_array(bytes)
}

///|
#cfg(target="native")
fn read_text_file(path : String) -> String? {
  let file = file_open(c_string(path), c_string("rb"))
  if is_null_file(file) {
    return None
  }
  if file_seek(file, 0, 2) != 0 {
    ignore(file_close(file))
    return None
  }
  let size = file_tell(file)
  if size < 0 || file_seek(file, 0, 0) != 0 {
    ignore(file_close(file))
    return None
  }
  let buffer = Bytes::new(size)
  let read = file_read(buffer, 1, size, file)
  ignore(file_close(file))
  if read == size {
    Some(@utf8.decode_lossy(buffer, ignore_bom=true))
  } else {
    None
  }
}

///|
#cfg(not(target="native"))
fn read_text_file(path : String) -> String? {
  let _ = path
  None
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
fn dynamic_crossing_map() -> @grid.GridMap {
  @grid.new_grid(10, 10, p(0, 0), p(9, 9))
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
fn heuristic_for(movement : @grid.MovementMode) -> @heuristics.HeuristicKind {
  match movement {
    @grid.FourWay => @heuristics.Manhattan
    @grid.EightWay => @heuristics.Octile
  }
}

///|
struct SafetyMetrics {
  evaluated : Int
  safe : Int
  min_clearance : Double
} derive(Debug)

///|
fn no_safety_metrics() -> SafetyMetrics {
  { evaluated: 0, safe: 0, min_clearance: 0.0 }
}

///|
fn bool_int(value : Bool) -> Int {
  if value {
    1
  } else {
    0
  }
}

///|
fn continuous_safety_metrics(
  path : Array[@core.Point],
  obstacles : Array[@dynamic.ContinuousMovingObstacle],
  options : @dynamic.CollisionOptions,
  step_time : Double,
  samples_per_segment : Int,
) -> SafetyMetrics {
  if path.length() < 2 || obstacles.is_empty() {
    return no_safety_metrics()
  }
  let segments = @dynamic.continuous_segments_from_grid_path(path, step_time)
  let safe = @dynamic.continuous_path_is_safe(
    segments, obstacles, options, samples_per_segment,
  )
  let min_clearance = match
    @dynamic.continuous_path_min_clearance(
      segments, obstacles, options, samples_per_segment,
    ) {
    Some(clearance) => clearance.clearance
    None => 0.0
  }
  { evaluated: 1, safe: bool_int(safe), min_clearance }
}

///|
fn print_result_with_safety(
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
  safety : SafetyMetrics,
) -> Unit {
  let elapsed_us_avg = elapsed_us_total / repeats.to_double()
  println(
    "\{scenario},\{algorithm},\{status_name(result)},\{result.path.length()}," +
    "\{result.total_cost},\{@swarm.path_length(result.path)}," +
    "\{@swarm.path_smoothness(result.path)},\{result.visited_nodes}," +
    "\{result.expanded_nodes},\{iterations},\{candidates},\{best_fitness}," +
    "\{seed},\{population_size},\{max_iterations},\{repeats}," +
    "\{elapsed_us_total},\{elapsed_us_avg},\{safety.evaluated}," +
    "\{safety.safe},\{safety.min_clearance}",
  )
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
  print_result_with_safety(
    scenario,
    algorithm,
    result,
    iterations,
    candidates,
    best_fitness,
    seed,
    population_size,
    max_iterations,
    repeats,
    elapsed_us_total,
    no_safety_metrics(),
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
fn run_scenario(
  name : String,
  map : @grid.GridMap,
  movement : @grid.MovementMode,
) -> Unit {
  let repeats = default_repeats()
  let swarm_options = @swarm.options(
    60,
    100,
    42,
    3,
    movement,
    @swarm.default_fitness_weights(),
  )
  let region = @region.build_search_region(map, @region.default_options())
  let heuristic = heuristic_for(movement)
  let astar_start = @clock.monotonic_clock_start()
  let mut astar = @algorithms.astar(map, movement, heuristic)
  for _ in 1..<repeats {
    astar = @algorithms.astar(map, movement, heuristic)
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
  let continuous = @dynamic.continuous_moving_obstacle(0.5, 0.0, 1.0, 0.5, 0.0)
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
  let continuous_safety = continuous_safety_metrics(
    continuous_path,
    [continuous],
    options,
    1.0,
    4,
  )
  print_result_with_safety(
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
    continuous_safety,
  )
  run_dynamic_crossing_scenario()
}

///|
fn run_dynamic_crossing_scenario() -> Unit {
  let repeats = default_repeats()
  let map = dynamic_crossing_map()
  let movement = @grid.EightWay
  let options = @dynamic.collision_options(2.0, 0.5, 0.1)
  let base = @algorithms.astar(map, movement, @heuristics.Octile)
  let baseline_start = @clock.monotonic_clock_start()
  let mut baseline = base
  for _ in 1..<repeats {
    baseline = @algorithms.astar(map, movement, @heuristics.Octile)
  }
  let baseline_elapsed = @clock.monotonic_clock_end(baseline_start)
  print_result(
    "dynamic_10x10_crossing", "astar_static", baseline, 0, 0, 0.0, 0, 0, 0, repeats,
    baseline_elapsed,
  )
  let horizontal = @dynamic.moving_obstacle_with_velocity(p(0, 1), 1.0, 1, 0)
  let vertical = @dynamic.moving_obstacle_with_velocity(p(2, 0), 1.0, 0, 1)
  let over_time_start = @clock.monotonic_clock_start()
  let mut over_time = @dynamic.jump_avoidance_over_time(
    map,
    base.path,
    [horizontal, vertical],
    options,
  )
  for _ in 1..<repeats {
    over_time = @dynamic.jump_avoidance_over_time(
      map,
      base.path,
      [horizontal, vertical],
      options,
    )
  }
  let over_time_elapsed = @clock.monotonic_clock_end(over_time_start)
  print_result(
    "dynamic_10x10_crossing",
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
  let reflected_horizontal = @dynamic.moving_obstacle_with_velocity(
    p(0, 1),
    1.0,
    1,
    0,
  )
  let reflected_vertical = @dynamic.moving_obstacle_with_velocity(
    p(2, 0),
    1.0,
    0,
    1,
  )
  let reflected_start = @clock.monotonic_clock_start()
  let mut reflected_path = @dynamic.jump_avoidance_over_reflected_time(
    map,
    base.path,
    [reflected_horizontal, reflected_vertical],
    options,
    0,
    9,
    0,
    9,
  )
  for _ in 1..<repeats {
    reflected_path = @dynamic.jump_avoidance_over_reflected_time(
      map,
      base.path,
      [reflected_horizontal, reflected_vertical],
      options,
      0,
      9,
      0,
      9,
    )
  }
  let reflected_elapsed = @clock.monotonic_clock_end(reflected_start)
  print_result(
    "dynamic_10x10_crossing",
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
  let continuous_horizontal = @dynamic.continuous_moving_obstacle(
    0.0, 1.0, 1.0, 1.0, 0.0,
  )
  let continuous_vertical = @dynamic.continuous_moving_obstacle(
    2.0, 0.0, 1.0, 0.0, 1.0,
  )
  let continuous_start = @clock.monotonic_clock_start()
  let mut continuous_path = @dynamic.jump_avoidance_over_continuous_time(
    map,
    base.path,
    [continuous_horizontal, continuous_vertical],
    options,
    1.0,
  )
  for _ in 1..<repeats {
    continuous_path = @dynamic.jump_avoidance_over_continuous_time(
      map,
      base.path,
      [continuous_horizontal, continuous_vertical],
      options,
      1.0,
    )
  }
  let continuous_elapsed = @clock.monotonic_clock_end(continuous_start)
  let continuous_safety = continuous_safety_metrics(
    continuous_path,
    [continuous_horizontal, continuous_vertical],
    options,
    1.0,
    4,
  )
  print_result_with_safety(
    "dynamic_10x10_crossing",
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
    continuous_safety,
  )
}

///|
fn run_default_scenarios() -> Unit {
  run_scenario("rs_apso_20x20_simple", simple_map(), @grid.EightWay)
  run_scenario("rs_apso_20x20_complex", complex_map(), @grid.EightWay)
  run_dynamic_scenarios()
}

///|
fn run_json_text(source : String, text : String) -> Bool {
  match @json_map.grid_from_json(text) {
    Some(data) => {
      run_scenario(source, data.map, data.movement)
      true
    }
    None => {
      println("Invalid benchmark grid JSON: \{source}")
      false
    }
  }
}

///|
fn run_json_file(path : String) -> Bool {
  match read_text_file(path) {
    Some(text) => run_json_text(path, text)
    None => {
      println("Could not read benchmark JSON file: \{path}")
      false
    }
  }
}

///|
fn usage() -> Unit {
  println("Usage:")
  println("  moon run ./bench")
  println("  moon run ./bench -- --json <grid-json>")
  println("  moon run ./bench --target native -- <map.json> [more.json]")
  println("  moon run ./bench --target native -- --map <map.json>")
}

///|
fn json_args(args : Array[String]) -> Array[String]? {
  let texts = []
  let mut index = 1
  while index < args.length() {
    match args[index] {
      "--help" | "-h" => return Some([])
      "--json" | "-j" =>
        if index + 1 < args.length() {
          texts.push(args[index + 1])
          index = index + 1
        } else {
          return Some([])
        }
      _ => ()
    }
    index = index + 1
  }
  if texts.length() == 0 {
    None
  } else {
    Some(texts)
  }
}

///|
fn map_args(args : Array[String]) -> Array[String]? {
  let paths = []
  let mut index = 1
  while index < args.length() {
    match args[index] {
      "--help" | "-h" => return Some([])
      "--map" | "-m" =>
        if index + 1 < args.length() {
          paths.push(args[index + 1])
          index = index + 1
        } else {
          return Some([])
        }
      value => paths.push(value)
    }
    index = index + 1
  }
  if paths.length() == 0 {
    None
  } else {
    Some(paths)
  }
}

///|
fn run_json_files(paths : Array[String]) -> Bool {
  let mut ok = true
  for path in paths {
    if !run_json_file(path) {
      ok = false
    }
  }
  ok
}

///|
fn run_json_texts(texts : Array[String]) -> Bool {
  let mut ok = true
  for index, text in texts {
    if !run_json_text("inline-json-\{index + 1}", text) {
      ok = false
    }
  }
  ok
}

///|
fn main {
  println(
    "scenario,algorithm,status,path_nodes,total_cost,path_length,smoothness," +
    "visited_nodes,expanded_nodes,iterations,candidates,best_fitness,seed," +
    "population_size,max_iterations,repeats,elapsed_us_total,elapsed_us_avg," +
    "safety_evaluated,continuous_safe,min_clearance",
  )
  let args = @env.args()
  match json_args(args) {
    Some(texts) =>
      if texts.length() == 0 {
        usage()
      } else {
        ignore(run_json_texts(texts))
      }
    None =>
      match map_args(args) {
        Some(paths) =>
          if paths.length() == 0 {
            usage()
          } else {
            ignore(run_json_files(paths))
          }
        None => run_default_scenarios()
      }
  }
}
