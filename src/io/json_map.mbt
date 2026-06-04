///|
pub fn grid_format_version() -> String {
  "moon-pathplanning.grid.v1"
}

///|
pub(all) struct GridJsonData {
  map : @grid.GridMap
  movement : @grid.MovementMode
} derive(Debug)

///|
fn movement_json(movement : @grid.MovementMode) -> String {
  match movement {
    @grid.FourWay => "\"four_way\""
    @grid.EightWay => "\"eight_way\""
  }
}

///|
fn point_json(point : @core.Point) -> String {
  "[\{point.x},\{point.y}]"
}

///|
fn points_json(points : Array[@core.Point]) -> String {
  let mut text = "["
  for index, point in points {
    if index > 0 {
      text = text + ","
    }
    text = text + point_json(point)
  }
  text + "]"
}

///|
fn terrain_json(cells : Array[@grid.TerrainCell]) -> String {
  let mut text = "["
  for index, cell in cells {
    if index > 0 {
      text = text + ","
    }
    text = text + "{\"point\":\{point_json(cell.point)},\"cost\":\{cell.cost}}"
  }
  text + "]"
}

///|
pub fn grid_to_json(
  map : @grid.GridMap,
  movement : @grid.MovementMode,
) -> String {
  "{\"format\":\"\{grid_format_version()}\",\"width\":\{map.width},\"height\":\{map.height},\"start\":\{point_json(map.start)},\"goal\":\{point_json(map.goal)},\"movement\":\{movement_json(movement)},\"obstacles\":\{points_json(map.obstacles)},\"terrain\":\{terrain_json(map.terrain)}}"
}

///|
pub fn parsing_limit() -> @core.SearchError {
  @core.UnsupportedJsonInput
}

///|
fn field(object : Map[String, Json], name : String) -> Json? {
  for key, value in object {
    if key == name {
      return Some(value)
    }
  }
  None
}

///|
fn int_field(object : Map[String, Json], name : String) -> Int? {
  match field(object, name) {
    Some(json) => {
      let value : Int = @json.from_json(json) catch { _ => return None }
      Some(value)
    }
    None => None
  }
}

///|
fn string_field(object : Map[String, Json], name : String) -> String? {
  match field(object, name) {
    Some(json) => {
      let value : String = @json.from_json(json) catch { _ => return None }
      Some(value)
    }
    None => None
  }
}

///|
fn point_from_json(json : Json) -> @core.Point? {
  let values : Array[Int] = @json.from_json(json) catch { _ => return None }
  if values.length() == 2 {
    Some(@core.point(values[0], values[1]))
  } else {
    None
  }
}

///|
fn points_from_json(json : Json) -> Array[@core.Point]? {
  let items : Array[Json] = @json.from_json(json) catch { _ => return None }
  let points = []
  for item in items {
    match point_from_json(item) {
      Some(point) => points.push(point)
      None => return None
    }
  }
  Some(points)
}

///|
fn terrain_from_json(json : Json) -> Array[@grid.TerrainCell]? {
  let items : Array[Json] = @json.from_json(json) catch { _ => return None }
  let terrain = []
  for item in items {
    let object : Map[String, Json] = @json.from_json(item) catch {
      _ => return None
    }
    let point = match field(object, "point") {
      Some(point_json) =>
        match point_from_json(point_json) {
          Some(point) => point
          None => return None
        }
      None => return None
    }
    let cost : Double = match field(object, "cost") {
      Some(cost_json) => @json.from_json(cost_json) catch { _ => return None }
      None => return None
    }
    terrain.push(@grid.terrain_cell(point, cost))
  }
  Some(terrain)
}

///|
fn movement_from_text(text : String) -> @grid.MovementMode? {
  match text {
    "four_way" => Some(@grid.FourWay)
    "eight_way" => Some(@grid.EightWay)
    _ => None
  }
}

///|
pub fn grid_from_json(text : String) -> GridJsonData? {
  let json = @json.parse(text) catch { _ => return None }
  let object : Map[String, Json] = @json.from_json(json) catch {
    _ => return None
  }
  guard string_field(object, "format") is Some(format) &&
    format == grid_format_version() else {
    return None
  }
  guard int_field(object, "width") is Some(width) &&
    int_field(object, "height") is Some(height) &&
    field(object, "start") is Some(start_json) &&
    field(object, "goal") is Some(goal_json) &&
    point_from_json(start_json) is Some(start) &&
    point_from_json(goal_json) is Some(goal) &&
    string_field(object, "movement") is Some(movement_text) &&
    movement_from_text(movement_text) is Some(movement) &&
    field(object, "obstacles") is Some(obstacles_json) &&
    points_from_json(obstacles_json) is Some(obstacles) else {
    return None
  }
  let terrain = match field(object, "terrain") {
    Some(terrain_json) =>
      match terrain_from_json(terrain_json) {
        Some(cells) => cells
        None => return None
      }
    None => []
  }
  let map : @grid.GridMap = { width, height, start, goal, obstacles, terrain }
  Some({ map, movement })
}
