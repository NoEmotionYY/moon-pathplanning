///|
test "grid bounds obstacles and movement" {
  let map = @grid.new_grid(
    3,
    3,
    @core.point(0, 0),
    @core.point(2, 2),
  ).with_obstacle(@core.point(1, 0))
  assert_eq(map.contains(@core.point(2, 2)), true)
  assert_eq(map.is_walkable(@core.point(1, 0)), false)
  assert_eq(map.neighbors(@core.point(0, 0), @grid.FourWay).length(), 1)
  assert_eq(map.neighbors(@core.point(1, 1), @grid.EightWay).length(), 7)
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

