///|
pub(all) struct BoundaryCorner {
  point : @core.Point
  free_neighbors : Int
  horizontal_free : Int
  vertical_free : Int
} derive(Debug)

///|
pub(all) struct SearchRegion {
  corners : Array[BoundaryCorner]
  cells : Array[@core.Point]
} derive(Debug)

///|
pub(all) struct RegionSearchOptions {
  include_all_walkable_when_empty : Bool
} derive(Debug)

///|
pub fn default_options() -> RegionSearchOptions {
  { include_all_walkable_when_empty: true }
}

///|
pub fn options(include_all_walkable_when_empty : Bool) -> RegionSearchOptions {
  { include_all_walkable_when_empty, }
}

///|
fn free_at(map : @grid.GridMap, point : @core.Point, dx : Int, dy : Int) -> Int {
  if map.is_walkable(@core.point(point.x + dx, point.y + dy)) {
    1
  } else {
    0
  }
}

///|
fn free_neighbor_count(map : @grid.GridMap, point : @core.Point) -> Int {
  free_at(map, point, -1, -1) +
  free_at(map, point, 0, -1) +
  free_at(map, point, 1, -1) +
  free_at(map, point, -1, 0) +
  free_at(map, point, 1, 0) +
  free_at(map, point, -1, 1) +
  free_at(map, point, 0, 1) +
  free_at(map, point, 1, 1)
}

///|
fn horizontal_free_count(map : @grid.GridMap, point : @core.Point) -> Int {
  free_at(map, point, -1, 0) + free_at(map, point, 1, 0)
}

///|
fn vertical_free_count(map : @grid.GridMap, point : @core.Point) -> Int {
  free_at(map, point, 0, -1) + free_at(map, point, 0, 1)
}

///|
fn is_boundary_corner_counts(
  free_neighbors : Int,
  horizontal_free : Int,
  vertical_free : Int,
) -> Bool {
  (free_neighbors == 4 && horizontal_free == 1 && vertical_free == 1) ||
  (
    free_neighbors == 5 &&
    horizontal_free == 1 &&
    (vertical_free == 1 || vertical_free == 2)
  ) ||
  (free_neighbors == 5 && horizontal_free == 2 && vertical_free == 1) ||
  (
    free_neighbors == 6 &&
    horizontal_free == 1 &&
    (vertical_free == 1 || vertical_free == 2)
  ) ||
  (free_neighbors == 6 && horizontal_free == 2 && vertical_free == 1) ||
  (
    free_neighbors == 7 &&
    (
      (horizontal_free == 1 && vertical_free == 2) ||
      (horizontal_free == 2 && vertical_free == 1)
    )
  )
}

///|
fn boundary_corner(map : @grid.GridMap, point : @core.Point) -> BoundaryCorner? {
  let free_neighbors = free_neighbor_count(map, point)
  let horizontal_free = horizontal_free_count(map, point)
  let vertical_free = vertical_free_count(map, point)
  if is_boundary_corner_counts(free_neighbors, horizontal_free, vertical_free) {
    Some({ point, free_neighbors, horizontal_free, vertical_free })
  } else {
    None
  }
}

///|
pub fn detect_boundary_corners(map : @grid.GridMap) -> Array[BoundaryCorner] {
  let corners = []
  if map.width <= 0 || map.height <= 0 {
    return corners
  }
  for y in 0..<map.height {
    for x in 0..<map.width {
      let point = @core.point(x, y)
      if map.is_obstacle(point) {
        match boundary_corner(map, point) {
          Some(corner) => corners.push(corner)
          None => ()
        }
      }
    }
  }
  corners
}

///|
fn contains_point(points : Array[@core.Point], point : @core.Point) -> Bool {
  for item in points {
    if item.same(point) {
      return true
    }
  }
  false
}

///|
fn push_unique(points : Array[@core.Point], point : @core.Point) -> Unit {
  if !contains_point(points, point) {
    points.push(point)
  }
}

///|
fn trace_direction(
  map : @grid.GridMap,
  cells : Array[@core.Point],
  start : @core.Point,
  dx : Int,
  dy : Int,
) -> Unit {
  let mut cursor = @core.point(start.x + dx, start.y + dy)
  while map.is_walkable(cursor) {
    push_unique(cells, cursor)
    cursor = @core.point(cursor.x + dx, cursor.y + dy)
  }
}

///|
fn add_all_walkable(map : @grid.GridMap, cells : Array[@core.Point]) -> Unit {
  if map.width > 0 && map.height > 0 {
    for y in 0..<map.height {
      for x in 0..<map.width {
        let point = @core.point(x, y)
        if map.is_walkable(point) {
          push_unique(cells, point)
        }
      }
    }
  }
}

///|
pub fn build_search_region(
  map : @grid.GridMap,
  options : RegionSearchOptions,
) -> SearchRegion {
  let corners = detect_boundary_corners(map)
  let cells = []
  for corner in corners {
    trace_direction(map, cells, corner.point, 1, 0)
    trace_direction(map, cells, corner.point, -1, 0)
    trace_direction(map, cells, corner.point, 0, 1)
    trace_direction(map, cells, corner.point, 0, -1)
  }
  if cells.is_empty() && options.include_all_walkable_when_empty {
    add_all_walkable(map, cells)
  }
  { corners, cells }
}

///|
pub fn SearchRegion::contains(self : SearchRegion, point : @core.Point) -> Bool {
  contains_point(self.cells, point)
}

///|
pub fn SearchRegion::corner_count(self : SearchRegion) -> Int {
  self.corners.length()
}

///|
pub fn SearchRegion::cell_count(self : SearchRegion) -> Int {
  self.cells.length()
}
