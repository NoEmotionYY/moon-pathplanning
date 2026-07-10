///|
pub(all) struct GridMap {
  width : Int
  height : Int
  start : @core.Point
  goal : @core.Point
  obstacles : Array[@core.Point]
  terrain : Array[TerrainCell]
} derive(Debug)

///|
pub fn new_grid(
  width : Int,
  height : Int,
  start : @core.Point,
  goal : @core.Point,
) -> GridMap {
  { width, height, start, goal, obstacles: [], terrain: [] }
}

///|
fn copy_points(points : Array[@core.Point]) -> Array[@core.Point] {
  let copied = []
  for point in points {
    copied.push(point)
  }
  copied
}

///|
fn copy_terrain(cells : Array[TerrainCell]) -> Array[TerrainCell] {
  let copied = []
  for cell in cells {
    copied.push(cell)
  }
  copied
}

///|
pub fn GridMap::contains(self : GridMap, point : @core.Point) -> Bool {
  point.x >= 0 && point.y >= 0 && point.x < self.width && point.y < self.height
}

///|
pub fn GridMap::is_obstacle(self : GridMap, point : @core.Point) -> Bool {
  for obstacle in self.obstacles {
    if obstacle.same(point) {
      return true
    }
  }
  false
}

///|
pub fn GridMap::is_walkable(self : GridMap, point : @core.Point) -> Bool {
  self.contains(point) && !self.is_obstacle(point)
}

///|
pub fn GridMap::with_obstacle(self : GridMap, point : @core.Point) -> GridMap {
  if self.is_obstacle(point) {
    self
  } else {
    let obstacles = copy_points(self.obstacles)
    obstacles.push(point)
    {
      width: self.width,
      height: self.height,
      start: self.start,
      goal: self.goal,
      obstacles,
      terrain: copy_terrain(self.terrain),
    }
  }
}

///|
pub fn GridMap::with_obstacles(
  self : GridMap,
  points : Array[@core.Point],
) -> GridMap {
  let mut map = self
  for point in points {
    map = map.with_obstacle(point)
  }
  map
}

///|
pub fn GridMap::with_terrain(
  self : GridMap,
  point : @core.Point,
  cost : Double,
) -> GridMap {
  let terrain = []
  for cell in self.terrain {
    if !cell.point.same(point) {
      terrain.push(cell)
    }
  }
  terrain.push(terrain_cell(point, cost))
  {
    width: self.width,
    height: self.height,
    start: self.start,
    goal: self.goal,
    obstacles: copy_points(self.obstacles),
    terrain,
  }
}

///|
pub fn GridMap::terrain_cost(self : GridMap, point : @core.Point) -> Double {
  for cell in self.terrain {
    if cell.point.same(point) {
      return cell.cost
    }
  }
  1.0
}

///|
pub fn GridMap::validate(self : GridMap) -> @core.SearchError? {
  if self.width <= 0 || self.height <= 0 {
    return Some(@core.InvalidDimensions)
  }
  if !self.contains(self.start) {
    return Some(@core.StartOutOfBounds)
  }
  if !self.contains(self.goal) {
    return Some(@core.GoalOutOfBounds)
  }
  for obstacle in self.obstacles {
    if !self.contains(obstacle) {
      return Some(@core.ObstacleOutOfBounds)
    }
  }
  if self.is_obstacle(self.start) {
    return Some(@core.StartBlocked)
  }
  if self.is_obstacle(self.goal) {
    return Some(@core.GoalBlocked)
  }
  for cell in self.terrain {
    if !self.contains(cell.point) {
      return Some(@core.TerrainOutOfBounds)
    }
    if cell.cost <= 0.0 {
      return Some(@core.InvalidTerrainCost)
    }
  }
  None
}
