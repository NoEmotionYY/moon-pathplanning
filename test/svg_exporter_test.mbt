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

///|
test "svg exporter can overlay multiple named paths" {
  let map = @grid.new_grid(4, 4, @core.point(0, 0), @core.point(3, 3)).with_obstacle(
    @core.point(1, 1),
  )
  let base = @svg.grid_to_svg(map, [], 16)
  let overlay = @svg.grid_paths_to_svg(
    map,
    [
      @svg.path_layer(
        "upper",
        [@core.point(0, 0), @core.point(1, 0), @core.point(3, 3)],
        "#e6584d",
      ),
      @svg.path_layer(
        "lower",
        [@core.point(0, 0), @core.point(0, 2), @core.point(3, 3)],
        "#2f7dd1",
      ),
    ],
    16,
  )
  assert_eq(overlay.length() > base.length(), true)
}

///|
test "svg exporter can render rrt comparison paths" {
  let map = @grid.new_grid(7, 5, @core.point(0, 2), @core.point(6, 2)).with_obstacles([
      @core.point(3, 0),
      @core.point(3, 1),
      @core.point(3, 3),
      @core.point(3, 4),
    ],
  )
  let rrt_options = @continuous.rrt_options(200, 7, 0.15)
  let star_options = @continuous.rrt_star_options(200, 7, 0.15, 3)
  let rrt = @continuous.rrt_plan(map, rrt_options)
  let rrt_connect = @continuous.rrt_connect_plan(map, rrt_options)
  let rrt_star = @continuous.rrt_star_plan(map, star_options)
  let base = @svg.grid_to_svg(map, [], 16)
  let comparison = @svg.rrt_comparison_to_svg(
    map, rrt_options, star_options, 16,
  )
  assert_eq(rrt.result.status is @core.Found, true)
  assert_eq(rrt_connect.result.status is @core.Found, true)
  assert_eq(rrt_star.result.status is @core.Found, true)
  assert_eq(comparison.length() > base.length(), true)
}
