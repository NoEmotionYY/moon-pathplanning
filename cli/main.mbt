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
#borrow(buffer, file)
extern "C" fn file_write(
  buffer : Bytes,
  size : Int,
  nitems : Int,
  file : FileHandle,
) -> Int = "moonbit_fwrite_ffi"

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
#cfg(target="native")
fn write_text_file(path : String, text : String) -> Bool {
  let file = file_open(c_string(path), c_string("wb"))
  if is_null_file(file) {
    return false
  }
  let buffer = @utf8.encode(text)
  let written = file_write(buffer, 1, buffer.length(), file)
  ignore(file_close(file))
  written == buffer.length()
}

///|
#cfg(not(target="native"))
fn read_text_file(path : String) -> String? {
  let _ = path
  None
}

///|
#cfg(not(target="native"))
fn write_text_file(path : String, text : String) -> Bool {
  let _ = path
  let _ = text
  false
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
fn movement_name(movement : @grid.MovementMode) -> String {
  match movement {
    @grid.FourWay => "four_way"
    @grid.EightWay => "eight_way"
  }
}

///|
fn heuristic_for(movement : @grid.MovementMode) -> @heuristics.HeuristicKind {
  match movement {
    @grid.FourWay => @heuristics.Manhattan
    @grid.EightWay => @heuristics.Octile
  }
}

///|
fn print_result(
  source : String,
  algorithm : @planner.AlgorithmType,
  movement : @grid.MovementMode,
  result : @core.PathResult,
) -> Unit {
  println("Moon PathPlanning demo")
  println("source: \{source}")
  println("algorithm: \{algorithm_name(algorithm)}")
  println("movement: \{movement_name(movement)}")
  println("status: \{status_name(result)}")
  println("path nodes: \{result.path.length()}")
  println("total cost: \{result.total_cost}")
  println("visited nodes: \{result.visited_nodes}")
  println("expanded nodes: \{result.expanded_nodes}")
}

///|
fn algorithm_name(algorithm : @planner.AlgorithmType) -> String {
  match algorithm {
    Bfs => "bfs"
    Dfs => "dfs"
    Dijkstra => "dijkstra"
    AStar => "astar"
    BidirectionalAStar => "bidirectional_astar"
    LpaStar => "lpa_star"
    DStarLite => "d_star_lite"
    Pso => "pso"
    RsApso => "rs_apso"
    Rrt => "rrt"
    RrtConnect => "rrt_connect"
    RrtStar => "rrt_star"
  }
}

///|
fn algorithm_title(algorithm : @planner.AlgorithmType) -> String {
  match algorithm {
    Bfs => "BFS 算法"
    Dfs => "DFS 算法"
    Dijkstra => "Dijkstra 算法"
    AStar => "A* 算法"
    BidirectionalAStar => "双向 A* 算法"
    LpaStar => "LPA* 算法"
    DStarLite => "D* Lite 算法"
    Pso => "PSO 算法"
    RsApso => "RS-APSO 算法"
    Rrt => "RRT 算法"
    RrtConnect => "RRT-Connect 算法"
    RrtStar => "RRT* 算法"
  }
}

///|
fn algorithm_from_name(name : String) -> @planner.AlgorithmType? {
  match name {
    "bfs" => Some(@planner.Bfs)
    "dfs" => Some(@planner.Dfs)
    "dijkstra" => Some(@planner.Dijkstra)
    "astar" | "a_star" => Some(@planner.AStar)
    "bidirectional_astar" | "bi_astar" => Some(@planner.BidirectionalAStar)
    "lpa_star" => Some(@planner.LpaStar)
    "d_star_lite" | "dstarlite" => Some(@planner.DStarLite)
    "pso" => Some(@planner.Pso)
    "rs_apso" => Some(@planner.RsApso)
    "rrt" => Some(@planner.Rrt)
    "rrt_connect" => Some(@planner.RrtConnect)
    "rrt_star" | "rrtstar" => Some(@planner.RrtStar)
    _ => None
  }
}

///|
fn display_source_title(source : String) -> String {
  match source {
    "builtin-demo" => "内置演示"
    "example:simple_grid" => "简单网格示例"
    "example:weighted_grid" => "加权网格示例"
    "example:rs_apso_20x20_simple" => "20x20 简单场景"
    "example:rs_apso_20x20_complex" => "20x20 复杂场景"
    "example:complex_maze" => "复杂迷宫场景"
    _ => source
  }
}

///|
fn export_html(
  source : String,
  algorithm : @planner.AlgorithmType,
  map : @grid.GridMap,
  result : @core.PathResult,
  html_path : String?,
) -> Bool {
  match html_path {
    None => true
    Some(path) => {
      let html = @svg.grid_to_html(
        "Moon 路径规划：\{algorithm_title(algorithm)} - \{display_source_title(source)}",
        map,
        result.path,
        24,
      )
      if write_text_file(path, html) {
        println("html output: \{path}")
        true
      } else {
        println("Could not write HTML file: \{path}")
        false
      }
    }
  }
}

///|
fn demo_map() -> @grid.GridMap {
  @grid.new_grid(6, 5, @core.point(0, 0), @core.point(5, 4)).with_obstacles([
    @core.point(1, 1),
    @core.point(1, 2),
    @core.point(2, 2),
    @core.point(4, 3),
  ])
}

///|
fn run_demo(algorithm : @planner.AlgorithmType, html_path : String?) -> Bool {
  let movement = @grid.FourWay
  let map = demo_map()
  let options = @planner.options(movement, heuristic_for(movement))
  let result = @planner.plan(map, algorithm, options)
  print_result("builtin-demo", algorithm, movement, result)
  export_html("builtin-demo", algorithm, map, result, html_path)
}

///|
fn run_json_text(
  source : String,
  text : String,
  algorithm : @planner.AlgorithmType,
  html_path : String?,
) -> Bool {
  match @json_map.grid_from_json(text) {
    Some(data) => {
      let options = @planner.options(
        data.movement,
        heuristic_for(data.movement),
      )
      let result = @planner.plan(data.map, algorithm, options)
      print_result(source, algorithm, data.movement, result)
      export_html(source, algorithm, data.map, result, html_path)
    }
    None => {
      println("Invalid grid JSON: \{source}")
      false
    }
  }
}

///|
fn run_json_file(
  path : String,
  algorithm : @planner.AlgorithmType,
  html_path : String?,
) -> Bool {
  match read_text_file(path) {
    Some(text) => run_json_text(path, text, algorithm, html_path)
    None => {
      println("Could not read JSON file: \{path}")
      false
    }
  }
}

///|
fn run_example(
  name : String,
  algorithm : @planner.AlgorithmType,
  html_path : String?,
) -> Bool {
  match @json_map.example_json(name) {
    Some(text) => run_json_text("example:\{name}", text, algorithm, html_path)
    None => {
      println("Unknown example map: \{name}")
      false
    }
  }
}

///|
fn usage() -> Unit {
  println("Usage:")
  println("  moon run cli")
  println("  moon run cli -- --json <grid-json>")
  println("  moon run cli -- --example <name>")
  println("  moon run cli --target native -- <map.json>")
  println("  moon run cli --target native -- --map <map.json>")
  println(
    "  moon run cli --target native -- --algorithm <name> --example <name> --html <output.html>",
  )
  println(
    "Algorithms: bfs, dfs, dijkstra, astar, bidirectional_astar, lpa_star, d_star_lite, pso, rs_apso, rrt, rrt_connect, rrt_star",
  )
}

///|
fn json_arg(args : Array[String]) -> String? {
  let mut index = 1
  while index < args.length() {
    match args[index] {
      "--help" | "-h" => return Some("")
      "--json" | "-j" =>
        if index + 1 < args.length() {
          return Some(args[index + 1])
        } else {
          return Some("")
        }
      _ => ()
    }
    index = index + 1
  }
  None
}

///|
fn example_arg(args : Array[String]) -> String? {
  let mut index = 1
  while index < args.length() {
    match args[index] {
      "--help" | "-h" => return Some("")
      "--example" | "-e" =>
        if index + 1 < args.length() {
          return Some(args[index + 1])
        } else {
          return Some("")
        }
      _ => ()
    }
    index = index + 1
  }
  None
}

///|
fn html_arg(args : Array[String]) -> String? {
  let mut index = 1
  while index < args.length() {
    match args[index] {
      "--help" | "-h" => return Some("")
      "--html" | "-o" =>
        if index + 1 < args.length() {
          return Some(args[index + 1])
        } else {
          return Some("")
        }
      _ => ()
    }
    index = index + 1
  }
  None
}

///|
fn algorithm_arg(args : Array[String]) -> String? {
  let mut index = 1
  while index < args.length() {
    match args[index] {
      "--help" | "-h" => return Some("")
      "--algorithm" | "-a" =>
        if index + 1 < args.length() {
          return Some(args[index + 1])
        } else {
          return Some("")
        }
      _ => ()
    }
    index = index + 1
  }
  None
}

///|
fn map_arg(args : Array[String]) -> String? {
  let mut index = 1
  let mut path : String? = None
  while index < args.length() {
    match args[index] {
      "--help" | "-h" => return Some("")
      "--map" | "-m" =>
        if index + 1 < args.length() {
          path = Some(args[index + 1])
          index = index + 1
        } else {
          return Some("")
        }
      "--json"
      | "-j"
      | "--example"
      | "-e"
      | "--html"
      | "-o"
      | "--algorithm"
      | "-a" =>
        if index + 1 < args.length() {
          index = index + 1
        } else {
          return Some("")
        }
      value => if path is None { path = Some(value) }
    }
    index = index + 1
  }
  path
}

///|
fn main {
  let args = @env.args()
  let html_path = html_arg(args)
  let algorithm = match algorithm_arg(args) {
    Some("") => {
      usage()
      return
    }
    Some(name) =>
      match algorithm_from_name(name) {
        Some(value) => value
        None => {
          println("Unknown algorithm: \{name}")
          usage()
          return
        }
      }
    None => @planner.AStar
  }
  match json_arg(args) {
    Some("") => usage()
    Some(text) =>
      if !run_json_text("inline-json", text, algorithm, html_path) {
        usage()
      }
    None =>
      match example_arg(args) {
        Some("") => usage()
        Some(name) => if !run_example(name, algorithm, html_path) { usage() }
        None =>
          match map_arg(args) {
            Some("") => usage()
            Some(path) =>
              if !run_json_file(path, algorithm, html_path) {
                usage()
              }
            None => if !run_demo(algorithm, html_path) { usage() }
          }
      }
  }
}
