///|
test "lpa star exposes path state nodes" {
  let map = @grid.new_grid(4, 4, @core.point(0, 0), @core.point(3, 3))
  let plan = @algorithms.lpa_star_plan(
    map,
    @grid.FourWay,
    @heuristics.Manhattan,
  )
  assert_eq(plan.result.status is @core.Found, true)
  assert_eq(plan.nodes.length(), plan.result.path.length())
  assert_eq(plan.nodes[0].point.same(map.start), true)
  assert_eq(plan.nodes[0].rhs, 0.0)
}

///|
test "lpa star replan records changed cells" {
  let map = @grid.new_grid(5, 3, @core.point(0, 1), @core.point(4, 1))
  let changed = @core.point(2, 1)
  let updated = map.with_obstacle(changed)
  let plan = @algorithms.lpa_star_replan(
    updated,
    @grid.FourWay,
    @heuristics.Manhattan,
    [changed],
  )
  assert_eq(plan.result.status is @core.Found, true)
  assert_eq(plan.changed_cells.length(), 1)
  for point in plan.result.path {
    assert_eq(point.same(changed), false)
  }
}

///|
test "d star lite stage entry returns no path consistently" {
  let map = @grid.new_grid(3, 3, @core.point(0, 0), @core.point(2, 2)).with_obstacles([
      @core.point(1, 0),
      @core.point(0, 1),
      @core.point(1, 1),
    ],
  )
  let plan = @algorithms.d_star_lite_plan(
    map,
    @grid.FourWay,
    @heuristics.Manhattan,
  )
  assert_eq(plan.result.status is @core.NoPath, true)
  assert_eq(plan.nodes.length(), 0)
}
