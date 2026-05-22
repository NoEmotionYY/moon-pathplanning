///|
test "svg exporter emits a path drawing" {
  let map = @grid.new_grid(
    2,
    2,
    @core.point(0, 0),
    @core.point(1, 1),
  ).with_obstacle(@core.point(1, 0))
  let svg = @svg.grid_to_svg(
    map,
    [@core.point(0, 0), @core.point(0, 1), @core.point(1, 1)],
    20,
  )
  assert_eq(svg.length() > 200, true)
}

