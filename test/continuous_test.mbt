///|
test "continuous rasterized segment includes endpoints and diagonal cells" {
  let cells = @continuous.rasterized_segment_cells(
    @core.point(0, 0),
    @core.point(3, 3),
  )
  assert_eq(cells.length(), 4)
  assert_eq(cells[0].same(@core.point(0, 0)), true)
  assert_eq(cells[1].same(@core.point(1, 1)), true)
  assert_eq(cells[3].same(@core.point(3, 3)), true)
}

///|
test "continuous segment visibility rejects blocked raster cell" {
  let map = @grid.new_grid(4, 4, @core.point(0, 0), @core.point(3, 3)).with_obstacle(
    @core.point(1, 1),
  )
  assert_eq(
    @continuous.segment_is_walkable(map, @core.point(0, 0), @core.point(3, 3)),
    false,
  )
  assert_eq(
    @continuous.segment_is_walkable(map, @core.point(0, 2), @core.point(3, 2)),
    true,
  )
}

///|
test "continuous shortcut removes redundant waypoints when line is clear" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4))
  let path = [
    @core.point(0, 0),
    @core.point(1, 1),
    @core.point(2, 2),
    @core.point(3, 3),
    @core.point(4, 4),
  ]
  let shortened = @continuous.shortcut_path(map, path)
  assert_eq(shortened.length(), 2)
  assert_eq(shortened[0].same(@core.point(0, 0)), true)
  assert_eq(shortened[1].same(@core.point(4, 4)), true)
}

///|
test "continuous shortcut preserves required bend around obstacle" {
  let map = @grid.new_grid(5, 3, @core.point(0, 1), @core.point(4, 1)).with_obstacle(
    @core.point(2, 1),
  )
  let path = [
    @core.point(0, 1),
    @core.point(1, 1),
    @core.point(1, 0),
    @core.point(2, 0),
    @core.point(3, 0),
    @core.point(3, 1),
    @core.point(4, 1),
  ]
  let shortened = @continuous.shortcut_path(map, path)
  assert_eq(shortened[0].same(@core.point(0, 1)), true)
  assert_eq(shortened[shortened.length() - 1].same(@core.point(4, 1)), true)
  assert_eq(shortened.length() > 2, true)
  assert_eq(
    @continuous.segment_is_walkable(map, shortened[0], shortened[1]),
    true,
  )
}
