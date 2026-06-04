///|
test "region search falls back to all walkable cells without obstacles" {
  let map = @grid.new_grid(3, 2, @core.point(0, 0), @core.point(2, 1))
  let region = @region.build_search_region(map, @region.default_options())
  assert_eq(region.corner_count(), 0)
  assert_eq(region.cell_count(), 6)
  assert_eq(region.contains(@core.point(2, 1)), true)
}

///|
test "region search can keep empty candidate set when fallback is disabled" {
  let map = @grid.new_grid(3, 2, @core.point(0, 0), @core.point(2, 1))
  let region = @region.build_search_region(map, @region.options(false))
  assert_eq(region.corner_count(), 0)
  assert_eq(region.cell_count(), 0)
}

///|
test "region search detects obstacle boundary corners" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4)).with_obstacles([
      @core.point(1, 1),
      @core.point(2, 1),
      @core.point(1, 2),
      @core.point(2, 2),
    ],
  )
  let corners = @region.detect_boundary_corners(map)
  assert_eq(corners.length(), 4)
}

///|
test "region search traces four directions from boundary corners" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4)).with_obstacles([
      @core.point(1, 1),
      @core.point(2, 1),
      @core.point(1, 2),
      @core.point(2, 2),
    ],
  )
  let region = @region.build_search_region(map, @region.default_options())
  assert_eq(region.corner_count(), 4)
  assert_eq(region.contains(@core.point(0, 1)), true)
  assert_eq(region.contains(@core.point(4, 1)), true)
  assert_eq(region.contains(@core.point(2, 2)), false)
  assert_eq(region.cell_count() < 21, true)
}
