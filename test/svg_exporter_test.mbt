///|
test "svg exporter emits a path drawing" {
  let map = @grid.new_grid(2, 2, @core.point(0, 0), @core.point(1, 1)).with_obstacle(
    @core.point(1, 0),
  )
  let svg = @svg.grid_to_svg(
    map,
    [@core.point(0, 0), @core.point(0, 1), @core.point(1, 1)],
    20,
  )
  assert_eq(svg.length() > 200, true)
}

///|
test "svg exporter can overlay region search results" {
  let map = @grid.new_grid(4, 4, @core.point(0, 0), @core.point(3, 3)).with_obstacle(
    @core.point(1, 1),
  )
  let region = @region.build_search_region(map, @region.default_options())
  let base = @svg.grid_to_svg(map, [], 16)
  let overlay = @svg.grid_region_to_svg(map, region, [], 16)
  assert_eq(region.cell_count() > 0, true)
  assert_eq(overlay.length() > base.length(), true)
}
