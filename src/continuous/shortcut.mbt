///|
fn abs_int(value : Int) -> Int {
  if value < 0 {
    -value
  } else {
    value
  }
}

///|
fn sign_int(value : Int) -> Int {
  if value > 0 {
    1
  } else if value < 0 {
    -1
  } else {
    0
  }
}

///|
fn copy_path(path : Array[@core.Point]) -> Array[@core.Point] {
  let copied = []
  for point in path {
    copied.push(point)
  }
  copied
}

///|
fn push_unique(path : Array[@core.Point], point : @core.Point) -> Unit {
  if path.is_empty() || !path[path.length() - 1].same(point) {
    path.push(point)
  }
}

///|
pub fn rasterized_segment_cells(
  start : @core.Point,
  goal : @core.Point,
) -> Array[@core.Point] {
  let cells = []
  let mut x = start.x
  let mut y = start.y
  let dx = abs_int(goal.x - start.x)
  let dy = abs_int(goal.y - start.y)
  let sx = sign_int(goal.x - start.x)
  let sy = sign_int(goal.y - start.y)
  let mut error = dx - dy
  cells.push(@core.point(x, y))
  while x != goal.x || y != goal.y {
    let twice_error = error * 2
    if twice_error > -dy {
      error = error - dy
      x = x + sx
    }
    if twice_error < dx {
      error = error + dx
      y = y + sy
    }
    cells.push(@core.point(x, y))
  }
  cells
}

///|
pub fn segment_is_walkable(
  map : @grid.GridMap,
  start : @core.Point,
  goal : @core.Point,
) -> Bool {
  for cell in rasterized_segment_cells(start, goal) {
    if !map.is_walkable(cell) {
      return false
    }
  }
  true
}

///|
pub fn shortcut_path(
  map : @grid.GridMap,
  path : Array[@core.Point],
) -> Array[@core.Point] {
  if path.length() < 3 {
    return copy_path(path)
  }
  let shortened = []
  let mut index = 0
  shortened.push(path[0])
  while index < path.length() - 1 {
    let mut candidate = path.length() - 1
    let mut found = false
    while candidate > index + 1 && !found {
      if segment_is_walkable(map, path[index], path[candidate]) {
        found = true
      } else {
        candidate = candidate - 1
      }
    }
    if !found {
      candidate = index + 1
    }
    push_unique(shortened, path[candidate])
    index = candidate
  }
  shortened
}
