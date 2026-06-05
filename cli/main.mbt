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
  movement : @grid.MovementMode,
  result : @core.PathResult,
) -> Unit {
  println("Moon PathPlanning A* demo")
  println("source: \{source}")
  println("movement: \{movement_name(movement)}")
  println("status: \{status_name(result)}")
  println("path nodes: \{result.path.length()}")
  println("total cost: \{result.total_cost}")
  println("visited nodes: \{result.visited_nodes}")
  println("expanded nodes: \{result.expanded_nodes}")
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
fn run_demo() -> Unit {
  let movement = @grid.FourWay
  let options = @planner.options(movement, heuristic_for(movement))
  let result = @planner.plan(demo_map(), @planner.AStar, options)
  print_result("builtin-demo", movement, result)
}

///|
fn run_json_text(source : String, text : String) -> Bool {
  match @json_map.grid_from_json(text) {
    Some(data) => {
      let options = @planner.options(
        data.movement,
        heuristic_for(data.movement),
      )
      let result = @planner.plan(data.map, @planner.AStar, options)
      print_result(source, data.movement, result)
      true
    }
    None => {
      println("Invalid grid JSON: \{source}")
      false
    }
  }
}

///|
fn run_json_file(path : String) -> Bool {
  match read_text_file(path) {
    Some(text) => run_json_text(path, text)
    None => {
      println("Could not read JSON file: \{path}")
      false
    }
  }
}

///|
fn usage() -> Unit {
  println("Usage:")
  println("  moon run cli")
  println("  moon run cli -- --json <grid-json>")
  println("  moon run cli --target native -- <map.json>")
  println("  moon run cli --target native -- --map <map.json>")
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
      value => if path is None { path = Some(value) }
    }
    index = index + 1
  }
  path
}

///|
fn main {
  let args = @env.args()
  match json_arg(args) {
    Some("") => usage()
    Some(text) => if !run_json_text("inline-json", text) { usage() }
    None =>
      match map_arg(args) {
        Some("") => usage()
        Some(path) => if !run_json_file(path) { usage() }
        None => run_demo()
      }
  }
}
