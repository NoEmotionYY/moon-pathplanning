///|
fn merged_grid_path(
  from_start : Array[ParentEntry],
  from_goal : Array[ParentEntry],
  start : @core.Point,
  goal : @core.Point,
  meeting : @core.Point,
) -> Array[@core.Point] {
  let path = point_path(from_start, start, meeting)
  let goal_side = point_path(from_goal, goal, meeting)
  let mut index = goal_side.length() - 1
  while index > 0 {
    index = index - 1
    path.push(goal_side[index])
  }
  path
}

///|
fn grid_path_cost(map : @grid.GridMap, path : Array[@core.Point]) -> Double {
  let mut total = 0.0
  for index, point in path {
    if index > 0 {
      let previous = path[index - 1]
      let diagonal = previous.x != point.x && previous.y != point.y
      let base = if diagonal { 1.4142135623730951 } else { 1.0 }
      total = total + base * map.terrain_cost(point)
    }
  }
  total
}

///|
fn push_astar_neighbor(
  frontier : Array[ScoreEntry],
  scores : Array[ScoreEntry],
  parents : Array[ParentEntry],
  current : ScoreEntry,
  neighbor : @grid.Neighbor,
  target : @core.Point,
  heuristic : @heuristics.HeuristicKind,
) -> Unit {
  let candidate = current.score + neighbor.cost
  let priority = candidate + @heuristics.estimate(heuristic, neighbor.point, target)
  match score_for(scores, neighbor.point) {
    Some(old_score) => {
      if candidate < old_score {
        set_score(scores, neighbor.point, candidate, priority)
        set_parent(parents, neighbor.point, current.point, neighbor.cost)
        frontier.push({ point: neighbor.point, score: candidate, priority })
      }
    }
    None => {
      set_score(scores, neighbor.point, candidate, priority)
      set_parent(parents, neighbor.point, current.point, neighbor.cost)
      frontier.push({ point: neighbor.point, score: candidate, priority })
    }
  }
}

///|
pub fn bidirectional_astar(
  map : @grid.GridMap,
  movement : @grid.MovementMode,
  heuristic : @heuristics.HeuristicKind,
) -> @core.PathResult {
  match map.validate() {
    Some(error) => return @core.invalid_result(error)
    None => ()
  }
  if map.start.same(map.goal) {
    return @core.found_result([map.start], 0.0, 1, 0)
  }
  let start_priority = @heuristics.estimate(heuristic, map.start, map.goal)
  let goal_priority = @heuristics.estimate(heuristic, map.goal, map.start)
  let start_frontier = [{
    point: map.start,
    score: 0.0,
    priority: start_priority,
  }]
  let goal_frontier = [{
    point: map.goal,
    score: 0.0,
    priority: goal_priority,
  }]
  let start_scores = []
  let goal_scores = []
  let start_closed = []
  let goal_closed = []
  let start_parents = []
  let goal_parents = []
  let mut expanded = 0
  set_score(start_scores, map.start, 0.0, start_priority)
  set_score(goal_scores, map.goal, 0.0, goal_priority)
  while !start_frontier.is_empty() && !goal_frontier.is_empty() {
    match pop_best(start_frontier) {
      Some(current) => {
        if !contains_point(start_closed, current.point) {
          start_closed.push(current.point)
          expanded = expanded + 1
          if score_for(goal_scores, current.point) is Some(_) {
            let path = merged_grid_path(
              start_parents,
              goal_parents,
              map.start,
              map.goal,
              current.point,
            )
            return @core.found_result(
              path,
              grid_path_cost(map, path),
              start_scores.length() + goal_scores.length(),
              expanded,
            )
          }
          for neighbor in map.neighbors(current.point, movement) {
            push_astar_neighbor(
              start_frontier,
              start_scores,
              start_parents,
              current,
              neighbor,
              map.goal,
              heuristic,
            )
          }
        }
      }
      None => ()
    }
    match pop_best(goal_frontier) {
      Some(current) => {
        if !contains_point(goal_closed, current.point) {
          goal_closed.push(current.point)
          expanded = expanded + 1
          if score_for(start_scores, current.point) is Some(_) {
            let path = merged_grid_path(
              start_parents,
              goal_parents,
              map.start,
              map.goal,
              current.point,
            )
            return @core.found_result(
              path,
              grid_path_cost(map, path),
              start_scores.length() + goal_scores.length(),
              expanded,
            )
          }
          for neighbor in map.neighbors(current.point, movement) {
            push_astar_neighbor(
              goal_frontier,
              goal_scores,
              goal_parents,
              current,
              neighbor,
              map.start,
              heuristic,
            )
          }
        }
      }
      None => ()
    }
  }
  @core.no_path_result(start_scores.length() + goal_scores.length(), expanded)
}

