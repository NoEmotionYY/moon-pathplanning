///|
fn assert_same_events(
  left : Array[@algorithms.SearchEvent],
  right : Array[@algorithms.SearchEvent],
) -> Unit raise {
  assert_eq(left.length(), right.length())
  for index = 0; index < left.length(); index = index + 1 {
    assert_eq(left[index].step, right[index].step)
    let same_kind = match (left[index].kind, right[index].kind) {
      (Discovered, Discovered) | (Expanded, Expanded) | (Current, Current) =>
        true
      _ => false
    }
    assert_eq(same_kind, true)
    assert_eq(left[index].point.same(right[index].point), true)
    assert_eq(left[index].frontier_size, right[index].frontier_size)
    assert_eq(left[index].source is None && right[index].source is None, true)
  }
}

///|
test "BFS trace starts by discovering the start point" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4))
  let traced = @algorithms.bfs_with_trace(map, @grid.FourWay)
  assert_eq(traced.trace.supported, true)
  assert_true(traced.trace.events.length() > 0)
  assert_eq(traced.trace.events[0].kind is @algorithms.Discovered, true)
  assert_eq(traced.trace.events[0].point.same(map.start), true)
  assert_eq(traced.trace.total_steps, traced.trace.events.length())
}

///|
test "A star trace is stable and expanded events are real search work" {
  let map = @grid.new_grid(6, 5, @core.point(0, 0), @core.point(5, 4)).with_obstacles([
      @core.point(2, 1),
      @core.point(2, 2),
    ],
  )
  let first = @algorithms.astar_with_trace(
    map,
    @grid.FourWay,
    @heuristics.Manhattan,
  )
  let second = @algorithms.astar_with_trace(
    map,
    @grid.FourWay,
    @heuristics.Manhattan,
  )
  assert_same_events(first.trace.events, second.trace.events)
  let mut expanded = 0
  for event in first.trace.events {
    if event.kind is @algorithms.Expanded {
      expanded = expanded + 1
      assert_eq(map.is_walkable(event.point), true)
    }
  }
  assert_eq(expanded, first.result.expanded_nodes)
}

///|
test "no path keeps recorded search events" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4)).with_obstacles([
      @core.point(0, 1),
      @core.point(1, 0),
    ],
  )
  let traced = @algorithms.bfs_with_trace(map, @grid.FourWay)
  assert_eq(traced.result.status is @core.NoPath, true)
  assert_true(traced.trace.events.length() >= 2)
}

///|
test "invalid map does not fabricate trace events" {
  let map = @grid.new_grid(0, 5, @core.point(0, 0), @core.point(4, 4))
  let traced = @algorithms.dijkstra_with_trace(map, @grid.FourWay)
  assert_eq(traced.result.status is @core.InvalidInput, true)
  assert_eq(traced.trace.events.length(), 0)
}

///|
test "ordinary Planner result stays unchanged and unsupported trace is empty" {
  let map = @grid.new_grid(5, 5, @core.point(0, 0), @core.point(4, 4))
  let plain = @planner.plan(map, @planner.AStar, @planner.default_options())
  let traced = @planner.plan_with_trace(
    map,
    @planner.AStar,
    @planner.default_options(),
  )
  assert_eq(plain.path.length(), traced.result.path.length())
  assert_eq(plain.total_cost, traced.result.total_cost)
  let unsupported = @planner.plan_with_trace(
    map,
    @planner.Rrt,
    @planner.default_options(),
  )
  assert_eq(unsupported.trace.supported, false)
  assert_eq(unsupported.trace.events.length(), 0)
  assert_eq(unsupported.result.status is @core.Found, true)
}
