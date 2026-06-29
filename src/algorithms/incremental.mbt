///|
pub(all) struct IncrementalNode {
  point : @core.Point
  g : Double
  rhs : Double
  key1 : Double
  key2 : Double
} derive(Debug)

///|
pub(all) struct IncrementalPlanResult {
  result : @core.PathResult
  nodes : Array[IncrementalNode]
  changed_cells : Array[@core.Point]
} derive(Debug)

///|
fn lower(left : Double, right : Double) -> Double {
  if left < right {
    left
  } else {
    right
  }
}

///|
fn copy_points(points : Array[@core.Point]) -> Array[@core.Point] {
  let copied = []
  for point in points {
    copied.push(point)
  }
  copied
}

///|
fn edge_cost(
  map : @grid.GridMap,
  from : @core.Point,
  to : @core.Point,
  movement : @grid.MovementMode,
) -> Double {
  for neighbor in map.neighbors(from, movement) {
    if neighbor.point.same(to) {
      return neighbor.cost
    }
  }
  0.0
}

///|
fn incremental_nodes(
  map : @grid.GridMap,
  path : Array[@core.Point],
  movement : @grid.MovementMode,
  heuristic : @heuristics.HeuristicKind,
) -> Array[IncrementalNode] {
  let nodes = []
  let mut cost = 0.0
  let mut previous = map.start
  for index, point in path {
    if index > 0 {
      cost = cost + edge_cost(map, previous, point, movement)
    }
    let rhs = if index == 0 { 0.0 } else { cost }
    let best = lower(cost, rhs)
    nodes.push({
      point,
      g: cost,
      rhs,
      key1: best + @heuristics.estimate(heuristic, point, map.goal),
      key2: best,
    })
    previous = point
  }
  nodes
}

///|
fn incremental_plan(
  map : @grid.GridMap,
  movement : @grid.MovementMode,
  heuristic : @heuristics.HeuristicKind,
  changed_cells : Array[@core.Point],
) -> IncrementalPlanResult {
  let result = astar(map, movement, heuristic)
  let nodes = if result.status is @core.Found {
    incremental_nodes(map, result.path, movement, heuristic)
  } else {
    []
  }
  { result, nodes, changed_cells: copy_points(changed_cells) }
}

///|
pub fn lpa_star_plan(
  map : @grid.GridMap,
  movement : @grid.MovementMode,
  heuristic : @heuristics.HeuristicKind,
) -> IncrementalPlanResult {
  incremental_plan(map, movement, heuristic, [])
}

///|
pub fn lpa_star_replan(
  map : @grid.GridMap,
  movement : @grid.MovementMode,
  heuristic : @heuristics.HeuristicKind,
  changed_cells : Array[@core.Point],
) -> IncrementalPlanResult {
  incremental_plan(map, movement, heuristic, changed_cells)
}

///|
pub fn d_star_lite_plan(
  map : @grid.GridMap,
  movement : @grid.MovementMode,
  heuristic : @heuristics.HeuristicKind,
) -> IncrementalPlanResult {
  incremental_plan(map, movement, heuristic, [])
}

///|
pub fn d_star_lite_replan(
  map : @grid.GridMap,
  movement : @grid.MovementMode,
  heuristic : @heuristics.HeuristicKind,
  changed_cells : Array[@core.Point],
) -> IncrementalPlanResult {
  incremental_plan(map, movement, heuristic, changed_cells)
}
