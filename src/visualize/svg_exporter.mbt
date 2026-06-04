///|
fn cell_center(point : @core.Point, cell_size : Int) -> (Int, Int) {
  (point.x * cell_size + cell_size / 2, point.y * cell_size + cell_size / 2)
}

///|
fn cell_rect(point : @core.Point, cell_size : Int, fill : String) -> String {
  let x = point.x * cell_size
  let y = point.y * cell_size
  "<rect x=\"\{x}\" y=\"\{y}\" width=\"\{cell_size}\" height=\"\{cell_size}\" fill=\"\{fill}\"/>"
}

///|
fn translucent_cell(
  point : @core.Point,
  cell_size : Int,
  fill : String,
  opacity : String,
) -> String {
  let x = point.x * cell_size
  let y = point.y * cell_size
  "<rect x=\"\{x}\" y=\"\{y}\" width=\"\{cell_size}\" height=\"\{cell_size}\" fill=\"\{fill}\" opacity=\"\{opacity}\"/>"
}

///|
fn path_points(path : Array[@core.Point], cell_size : Int) -> String {
  let mut text = ""
  for index, point in path {
    let (x, y) = cell_center(point, cell_size)
    if index > 0 {
      text = text + " "
    }
    text = text + "\{x},\{y}"
  }
  text
}

///|
fn grid_lines(map : @grid.GridMap, cell_size : Int) -> String {
  let width = map.width * cell_size
  let height = map.height * cell_size
  let mut lines = ""
  for x in 0..<=map.width {
    let offset = x * cell_size
    lines = lines +
      "<line x1=\"\{offset}\" y1=\"0\" x2=\"\{offset}\" y2=\"\{height}\"/>"
  }
  for y in 0..<=map.height {
    let offset = y * cell_size
    lines = lines +
      "<line x1=\"0\" y1=\"\{offset}\" x2=\"\{width}\" y2=\"\{offset}\"/>"
  }
  "<g stroke=\"#c8d0d9\" stroke-width=\"1\">\{lines}</g>"
}

///|
fn endpoint(point : @core.Point, cell_size : Int, fill : String) -> String {
  let (x, y) = cell_center(point, cell_size)
  let radius = cell_size / 4
  "<circle cx=\"\{x}\" cy=\"\{y}\" r=\"\{radius}\" fill=\"\{fill}\"/>"
}

///|
fn region_cells(region : @region.SearchRegion, cell_size : Int) -> String {
  let mut cells = ""
  for cell in region.cells {
    cells = cells + translucent_cell(cell, cell_size, "#69c79d", "0.35")
  }
  cells
}

///|
fn boundary_corners(region : @region.SearchRegion, cell_size : Int) -> String {
  let mut corners = ""
  for corner in region.corners {
    corners = corners + endpoint(corner.point, cell_size, "#f5a623")
  }
  corners
}

///|
pub fn grid_to_svg(
  map : @grid.GridMap,
  path : Array[@core.Point],
  cell_size : Int,
) -> String {
  let width = map.width * cell_size
  let height = map.height * cell_size
  let mut obstacles = ""
  for obstacle in map.obstacles {
    obstacles = obstacles + cell_rect(obstacle, cell_size, "#27313a")
  }
  let path_svg = if path.is_empty() {
    ""
  } else {
    "<polyline points=\"\{path_points(path, cell_size)}\" fill=\"none\" stroke=\"#e6584d\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"
  }
  let start_svg = endpoint(map.start, cell_size, "#2a9d5b")
  let goal_svg = endpoint(map.goal, cell_size, "#2868d8")
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"\{width}\" height=\"\{height}\" viewBox=\"0 0 \{width} \{height}\"><rect width=\"100%\" height=\"100%\" fill=\"#f6f8fb\"/>\{grid_lines(map, cell_size)}\{obstacles}\{path_svg}\{start_svg}\{goal_svg}</svg>"
}

///|
pub fn grid_region_to_svg(
  map : @grid.GridMap,
  region : @region.SearchRegion,
  path : Array[@core.Point],
  cell_size : Int,
) -> String {
  let width = map.width * cell_size
  let height = map.height * cell_size
  let mut obstacles = ""
  for obstacle in map.obstacles {
    obstacles = obstacles + cell_rect(obstacle, cell_size, "#27313a")
  }
  let path_svg = if path.is_empty() {
    ""
  } else {
    "<polyline points=\"\{path_points(path, cell_size)}\" fill=\"none\" stroke=\"#e6584d\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"
  }
  let start_svg = endpoint(map.start, cell_size, "#2a9d5b")
  let goal_svg = endpoint(map.goal, cell_size, "#2868d8")
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"\{width}\" height=\"\{height}\" viewBox=\"0 0 \{width} \{height}\"><rect width=\"100%\" height=\"100%\" fill=\"#f6f8fb\"/>\{region_cells(region, cell_size)}\{grid_lines(map, cell_size)}\{obstacles}\{path_svg}\{boundary_corners(region, cell_size)}\{start_svg}\{goal_svg}</svg>"
}
