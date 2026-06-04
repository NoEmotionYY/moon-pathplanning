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
fn positive_radius(radius : Int) -> Int {
  if radius > 0 {
    radius
  } else {
    0
  }
}

///|
pub fn GridMap::inflate_obstacles(self : GridMap, radius : Int) -> GridMap {
  let safe_radius = positive_radius(radius)
  if safe_radius == 0 || self.obstacles.is_empty() {
    return self
  }
  let inflated = []
  let terrain = []
  for cell in self.terrain {
    terrain.push(cell)
  }
  let start = 0 - safe_radius
  for obstacle in self.obstacles {
    for dy in start..<=safe_radius {
      for dx in start..<=safe_radius {
        let point = @core.point(obstacle.x + dx, obstacle.y + dy)
        if self.contains(point) {
          push_unique(inflated, point)
        }
      }
    }
  }
  {
    width: self.width,
    height: self.height,
    start: self.start,
    goal: self.goal,
    obstacles: inflated,
    terrain,
  }
}
