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
pub(all) struct SvgPathLayer {
  name : String
  path : Array[@core.Point]
  color : String
} derive(Debug)

///|
pub fn path_layer(
  name : String,
  path : Array[@core.Point],
  color : String,
) -> SvgPathLayer {
  { name, path, color }
}

///|
fn path_polyline(layer : SvgPathLayer, cell_size : Int) -> String {
  if layer.path.is_empty() {
    ""
  } else {
    "<polyline points=\"\{path_points(layer.path, cell_size)}\" fill=\"none\" stroke=\"\{layer.color}\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><title>\{layer.name}</title></polyline>"
  }
}

///|
fn path_layers(layers : Array[SvgPathLayer], cell_size : Int) -> String {
  let mut paths = ""
  for layer in layers {
    paths = paths + path_polyline(layer, cell_size)
  }
  paths
}

///|
fn path_legend(layers : Array[SvgPathLayer], map_height : Int) -> String {
  if layers.is_empty() {
    ""
  } else {
    let mut rows = ""
    for index, layer in layers {
      let y = map_height + 16 + index * 18
      let line_y = y - 5
      rows = rows +
        "<line x1=\"8\" y1=\"\{line_y}\" x2=\"32\" y2=\"\{line_y}\" stroke=\"\{layer.color}\" stroke-width=\"3\" stroke-linecap=\"round\"/><text x=\"40\" y=\"\{y}\" font-size=\"12\" fill=\"#27313a\">\{layer.name}</text>"
    }
    "<g>\{rows}</g>"
  }
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

///|
pub fn grid_paths_to_svg(
  map : @grid.GridMap,
  layers : Array[SvgPathLayer],
  cell_size : Int,
) -> String {
  let width = map.width * cell_size
  let map_height = map.height * cell_size
  let legend_height = if layers.is_empty() {
    0
  } else {
    layers.length() * 18 + 12
  }
  let height = map_height + legend_height
  let mut obstacles = ""
  for obstacle in map.obstacles {
    obstacles = obstacles + cell_rect(obstacle, cell_size, "#27313a")
  }
  let start_svg = endpoint(map.start, cell_size, "#2a9d5b")
  let goal_svg = endpoint(map.goal, cell_size, "#2868d8")
  "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"\{width}\" height=\"\{height}\" viewBox=\"0 0 \{width} \{height}\"><rect width=\"100%\" height=\"100%\" fill=\"#f6f8fb\"/>\{grid_lines(map, cell_size)}\{obstacles}\{path_layers(layers, cell_size)}\{start_svg}\{goal_svg}\{path_legend(layers, map_height)}</svg>"
}

///|
pub fn rrt_comparison_to_svg(
  map : @grid.GridMap,
  rrt_options : @continuous.RrtOptions,
  rrt_star_options : @continuous.RrtStarOptions,
  cell_size : Int,
) -> String {
  let rrt = @continuous.rrt_plan(map, rrt_options)
  let rrt_connect = @continuous.rrt_connect_plan(map, rrt_options)
  let rrt_star = @continuous.rrt_star_plan(map, rrt_star_options)
  grid_paths_to_svg(
    map,
    [
      path_layer("RRT", rrt.result.path, "#e6584d"),
      path_layer("RRT-Connect", rrt_connect.result.path, "#2f7dd1"),
      path_layer("RRT*", rrt_star.result.path, "#2a9d5b"),
    ],
    cell_size,
  )
}

///|
pub fn default_rrt_comparison_to_svg(
  map : @grid.GridMap,
  cell_size : Int,
) -> String {
  rrt_comparison_to_svg(
    map,
    @continuous.default_rrt_options(),
    @continuous.default_rrt_star_options(),
    cell_size,
  )
}

///|
fn html_document(title : String, svg : String) -> String {
  "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>\{title}</title><style>body{margin:0;background:#f6f8fb;color:#27313a;font-family:system-ui,-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif}main{max-width:960px;margin:0 auto;padding:24px}h1{font-size:20px;font-weight:650;margin:0 0 16px}svg{display:block;max-width:100%;height:auto;border:1px solid #c8d0d9;background:#f6f8fb}</style></head><body><main><h1>\{title}</h1>\{svg}</main></body></html>"
}

///|
pub fn grid_to_html(
  title : String,
  map : @grid.GridMap,
  path : Array[@core.Point],
  cell_size : Int,
) -> String {
  html_document(title, grid_to_svg(map, path, cell_size))
}

///|
pub fn grid_region_to_html(
  title : String,
  map : @grid.GridMap,
  region : @region.SearchRegion,
  path : Array[@core.Point],
  cell_size : Int,
) -> String {
  html_document(title, grid_region_to_svg(map, region, path, cell_size))
}

///|
pub fn grid_paths_to_html(
  title : String,
  map : @grid.GridMap,
  layers : Array[SvgPathLayer],
  cell_size : Int,
) -> String {
  html_document(title, grid_paths_to_svg(map, layers, cell_size))
}

///|
pub fn rrt_comparison_to_html(
  title : String,
  map : @grid.GridMap,
  rrt_options : @continuous.RrtOptions,
  rrt_star_options : @continuous.RrtStarOptions,
  cell_size : Int,
) -> String {
  html_document(
    title,
    rrt_comparison_to_svg(map, rrt_options, rrt_star_options, cell_size),
  )
}

///|
pub fn default_rrt_comparison_to_html(
  title : String,
  map : @grid.GridMap,
  cell_size : Int,
) -> String {
  rrt_comparison_to_html(
    title,
    map,
    @continuous.default_rrt_options(),
    @continuous.default_rrt_star_options(),
    cell_size,
  )
}
