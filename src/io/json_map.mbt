///|
pub fn grid_format_version() -> String {
  "moon-pathplanning.grid.v1"
}

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
    text = text +
      "{\"point\":\{point_json(cell.point)},\"cost\":\{cell.cost}}"
  }
  text + "]"
}

///|
pub fn grid_to_json(map : @grid.GridMap, movement : @grid.MovementMode) -> String {
  "{\"format\":\"\{grid_format_version()}\",\"width\":\{map.width},\"height\":\{map.height},\"start\":\{point_json(map.start)},\"goal\":\{point_json(map.goal)},\"movement\":\{movement_json(movement)},\"obstacles\":\{points_json(map.obstacles)},\"terrain\":\{terrain_json(map.terrain)}}"
}

///|
pub fn parsing_limit() -> @core.SearchError {
  @core.UnsupportedJsonInput
}

