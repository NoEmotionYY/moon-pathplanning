///|
fn has_neighbor(neighbors : Array[@grid.Neighbor], point : @core.Point) -> Bool {
  for neighbor in neighbors {
    if neighbor.point.same(point) {
      return true
    }
  }
  false
}

///|
fn neighbor_cost(
  neighbors : Array[@grid.Neighbor],
  point : @core.Point,
) -> Double {
  for neighbor in neighbors {
    if neighbor.point.same(point) {
      return neighbor.cost
    }
  }
  -1.0
}

///|
test "grid bounds obstacles and movement" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2)).with_obstacle(
    @core.point(1, 0),
  )
  assert_eq(map.contains(@core.point(2, 2)), true)
  assert_eq(map.is_walkable(@core.point(1, 0)), false)
  assert_eq(map.neighbors(@core.point(0, 0), @grid.FourWay).length(), 1)
  assert_eq(map.neighbors(@core.point(1, 1), @grid.EightWay).length(), 5)
}

///|
test "grid start equals goal and invalid inputs" {
  let same = @grid.new_grid(2, 2, @core.point(1, 1), @core.point(1, 1))
  assert_eq(same.validate() is None, true)
  let invalid_size = @grid.new_grid(0, 2, @core.point(0, 0), @core.point(1, 1))
  assert_eq(invalid_size.validate() is Some(_), true)
  let invalid_weight = same.with_terrain(@core.point(0, 0), 0.0)
  assert_eq(invalid_weight.validate() is Some(_), true)
}

///|
test "grid validate rejects out of bounds obstacles" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1)).with_obstacle(
    @core.point(2, 1),
  )
  assert_eq(map.validate() is Some(@core.ObstacleOutOfBounds), true)
}

///|
test "grid validate rejects out of bounds terrain" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1)).with_terrain(
    @core.point(1, 2),
    2.0,
  )
  assert_eq(map.validate() is Some(@core.TerrainOutOfBounds), true)
}

///|
test "grid validate rejects start out of bounds" {
  let map = @grid.new_grid(2, 2, @core.point(-1, 0), @core.point(1, 1))
  assert_eq(map.validate() is Some(@core.StartOutOfBounds), true)
}

///|
test "grid validate rejects goal out of bounds" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(2, 1))
  assert_eq(map.validate() is Some(@core.GoalOutOfBounds), true)
}

///|
test "grid validate rejects obstacle covering start" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1)).with_obstacle(
    @core.point(0, 0),
  )
  assert_eq(map.validate() is Some(@core.StartBlocked), true)
}

///|
test "grid validate rejects obstacle covering goal" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1)).with_obstacle(
    @core.point(1, 1),
  )
  assert_eq(map.validate() is Some(@core.GoalBlocked), true)
}

///|
test "grid validate rejects zero terrain cost" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1)).with_terrain(
    @core.point(1, 0),
    0.0,
  )
  assert_eq(map.validate() is Some(@core.InvalidTerrainCost), true)
}

///|
test "grid validate rejects negative terrain cost" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1)).with_terrain(
    @core.point(1, 0),
    -1.0,
  )
  assert_eq(map.validate() is Some(@core.InvalidTerrainCost), true)
}

///|
test "grid validate accepts legal map" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2))
    .with_obstacle(@core.point(1, 1))
    .with_terrain(@core.point(2, 1), 2.0)
  assert_eq(map.validate() is None, true)
}

///|
test "grid obstacle inflation adds safety margin" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4)).with_obstacle(
    @core.point(2, 2),
  )
  let inflated = map.inflate_obstacles(1)
  assert_eq(inflated.is_obstacle(@core.point(2, 2)), true)
  assert_eq(inflated.is_obstacle(@core.point(1, 1)), true)
  assert_eq(inflated.is_obstacle(@core.point(3, 3)), true)
  assert_eq(inflated.is_obstacle(@core.point(0, 0)), false)
  assert_eq(inflated.obstacles.length(), 9)
}

///|
test "grid obstacle inflation clips to bounds and may block endpoints" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2)).with_obstacle(
    @core.point(0, 1),
  )
  let inflated = map.inflate_obstacles(1)
  assert_eq(inflated.is_obstacle(@core.point(0, 0)), true)
  assert_eq(inflated.is_obstacle(@core.point(1, 2)), true)
  assert_eq(inflated.obstacles.length(), 6)
  assert_eq(inflated.validate() is Some(_), true)
}

///|
test "eight way movement rejects blocked corner cutting" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1))
    .with_obstacle(@core.point(1, 0))
    .with_obstacle(@core.point(0, 1))
  let neighbors = map.neighbors(@core.point(0, 0), @grid.EightWay)
  assert_eq(has_neighbor(neighbors, @core.point(1, 1)), false)
}

///|
test "eight way movement rejects one-sided blocked corner cutting" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1)).with_obstacle(
    @core.point(1, 0),
  )
  let neighbors = map.neighbors(@core.point(0, 0), @grid.EightWay)
  assert_eq(has_neighbor(neighbors, @core.point(1, 1)), false)
}

///|
test "eight way movement allows clear diagonal movement" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1))
  let neighbors = map.neighbors(@core.point(0, 0), @grid.EightWay)
  assert_eq(has_neighbor(neighbors, @core.point(1, 1)), true)
}

///|
test "eight way movement keeps diagonal terrain cost" {
  let diagonal = 1.4142135623730951
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1)).with_terrain(
    @core.point(1, 1),
    3.0,
  )
  let neighbors = map.neighbors(@core.point(0, 0), @grid.EightWay)
  assert_eq(neighbor_cost(neighbors, @core.point(1, 1)), diagonal * 3.0)
}

///|
test "four way movement ignores diagonal availability" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1))
  let neighbors = map.neighbors(@core.point(0, 0), @grid.FourWay)
  assert_eq(has_neighbor(neighbors, @core.point(1, 1)), false)
  assert_eq(has_neighbor(neighbors, @core.point(1, 0)), true)
  assert_eq(has_neighbor(neighbors, @core.point(0, 1)), true)
}
